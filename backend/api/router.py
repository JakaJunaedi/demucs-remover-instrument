import uuid
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any
import json
import shutil
import io
import zipfile

from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, Request, Form
from fastapi.responses import FileResponse, StreamingResponse, RedirectResponse
from core.config import UPLOADS_DIR, OUTPUTS_DIR
from core.db import SessionLocal
from core.models import Task
from core.storage import generate_presigned_url
from services.audio import validate_audio_file, get_audio_duration
from services.demucs_worker import process_audio_task, pause_task, resume_task, cancel_task
from services.youtube_worker import process_youtube_task
from pydantic import BaseModel
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/v1")

def get_task_from_db(task_id: str):
    db = SessionLocal()
    try:
        task = db.query(Task).filter(Task.id == task_id).first()
        if not task:
            raise HTTPException(status_code=404, detail="Task tidak ditemukan.")
        return task
    finally:
        db.close()

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "version": "1.1.0",
        "gpu_available": False,
        "model_loaded": "htdemucs_ft",
        "uptime_seconds": 0
    }

@router.post("/upload")
@limiter.limit("5/minute")
async def upload_audio(
    request: Request, 
    background_tasks: BackgroundTasks, 
    file: UploadFile = File(...),
    stem_mode: str = Form("2")
):
    if not file.content_type.startswith("audio/") and not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be an audio or video file")
        
    if stem_mode not in ["2", "4"]:
        raise HTTPException(status_code=400, detail="Invalid stem_mode. Must be '2' or '4'")
        
    task_id = str(uuid.uuid4())
    
    task_upload_dir = UPLOADS_DIR / task_id
    task_upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = task_upload_dir / file.filename
    content = await file.read()
    with open(file_path, "wb") as buffer:
        buffer.write(content)
        
    # Validate
    validate_audio_file(content, file.filename)
    duration = get_audio_duration(file_path)
    estimated_time = duration * 3 if stem_mode == "2" else duration * 5
    
    # Save to DB
    db = SessionLocal()
    try:
        new_task = Task(
            id=task_id,
            task_type="demucs",
            status="queued",
            meta_data={
                "original_filename": file.filename,
                "duration_seconds": duration,
                "estimated_processing_seconds": estimated_time,
                "progress_percent": 0,
                "stem_mode": stem_mode
            }
        )
        db.add(new_task)
        db.commit()
    finally:
        db.close()
        
    background_tasks.add_task(
        process_audio_task, 
        task_id=task_id, 
        filename=file.filename,
        duration=duration,
        stem_mode=stem_mode
    )
    
    return {
        "task_id": task_id,
        "status": "queued",
        "filename": file.filename,
        "duration_seconds": duration,
        "estimated_processing_seconds": estimated_time,
        "stem_mode": stem_mode
    }

@router.get("/tasks/{task_id}")
def get_task_status(task_id: str):
    task = get_task_from_db(task_id)
    data = dict(task.meta_data) if task.meta_data else {}
    data["status"] = task.status
    
    if task.status == "processing" and "processing_start_time" in data:
        start_time = datetime.fromisoformat(data["processing_start_time"])
        elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
        est_rem = max(0, data.get("estimated_processing_seconds", 0) - elapsed)
        data["elapsed_seconds"] = round(elapsed, 2)
        data["estimated_remaining_seconds"] = round(est_rem, 2)
        
    return data

@router.post("/tasks/{task_id}/pause")
def pause_task_endpoint(task_id: str):
    if pause_task(task_id):
        return {"message": "Tugas di-pause."}
    raise HTTPException(status_code=400, detail="Tidak dapat mem-pause tugas ini.")

@router.post("/tasks/{task_id}/resume")
def resume_task_endpoint(task_id: str):
    if resume_task(task_id):
        return {"message": "Tugas dilanjutkan."}
    raise HTTPException(status_code=400, detail="Tidak dapat melanjutkan tugas ini.")

@router.post("/tasks/{task_id}/cancel")
def cancel_task_endpoint(task_id: str):
    if cancel_task(task_id):
        return {"message": "Tugas dibatalkan."}
    raise HTTPException(status_code=400, detail="Tidak dapat membatalkan tugas ini.")

@router.get("/download/{task_id}/zip")
def download_zip(task_id: str, background_tasks: BackgroundTasks):
    task = get_task_from_db(task_id)
    if task.status != "completed":
        raise HTTPException(status_code=400, detail="File belum siap.")
        
    stems = task.meta_data.get("stems", {})
    if not stems:
        raise HTTPException(status_code=404, detail="Data stems tidak ditemukan.")
        
    zip_path = OUTPUTS_DIR / f"{task_id}_all.zip"
    
    # If the zip doesn't exist yet, create it by streaming from MinIO
    if not zip_path.exists():
        from core.storage import s3_client, MINIO_BUCKET
        
        try:
            zip_path.parent.mkdir(parents=True, exist_ok=True)
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_STORED) as zipf:
                for stem_info in stems.values():
                    if "minio_key" in stem_info and "file" in stem_info:
                        response = s3_client.get_object(Bucket=MINIO_BUCKET, Key=stem_info["minio_key"])
                        with zipf.open(stem_info["file"], 'w') as zfile:
                            shutil.copyfileobj(response['Body'], zfile)
        except Exception as e:
            if zip_path.exists():
                zip_path.unlink()
            print(f"Error creating ZIP: {e}")
            raise HTTPException(status_code=500, detail="Gagal membuat file ZIP.")
            
    # Optionally delete the zip after sending to save disk space
    def cleanup_zip():
        if zip_path.exists():
            try:
                zip_path.unlink()
            except:
                pass
                
    background_tasks.add_task(cleanup_zip)
    
    return FileResponse(
        path=zip_path,
        media_type="application/zip",
        filename=f"{task.meta_data.get('original_filename', 'audio')}_stems.zip"
    )

@router.get("/download/{task_id}/cleaned")
def download_cleaned(task_id: str):
    task = get_task_from_db(task_id)
    if task.status != "completed":
        raise HTTPException(status_code=400, detail="File belum siap.")
        
    minio_key = task.meta_data.get("cleaned_minio_key")
    if not minio_key:
        raise HTTPException(status_code=404, detail="File bersih tidak ditemukan.")
        
    url = generate_presigned_url(minio_key)
    if not url:
        raise HTTPException(status_code=500, detail="Gagal membuat URL download.")
        
    return RedirectResponse(url=url)

@router.get("/download/{task_id}/{stem}")
def download_stem(task_id: str, stem: str):
    if stem not in ["vocals", "no_vocals", "drums", "bass", "other"]:
        raise HTTPException(status_code=400, detail="Stem tidak valid.")
        
    task = get_task_from_db(task_id)
    if task.status != "completed":
        raise HTTPException(status_code=400, detail="File belum siap.")
        
    stems = task.meta_data.get("stems", {})
    stem_info = stems.get(stem)
    
    if not stem_info or "minio_key" not in stem_info:
        raise HTTPException(status_code=404, detail="File tidak ditemukan di MinIO.")
        
    url = generate_presigned_url(stem_info["minio_key"])
    if not url:
        raise HTTPException(status_code=500, detail="Gagal membuat URL download.")
        
    return RedirectResponse(url=url)

@router.post("/cleanup")
@limiter.limit("5/minute")
async def upload_cleanup(
    request: Request,
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...)
):
    if not file.content_type.startswith("audio/"):
        raise HTTPException(status_code=400, detail="Must be an audio file")
        
    task_id = str(uuid.uuid4())
    ext = file.filename.split(".")[-1] if "." in file.filename else "wav"
    temp_path = UPLOADS_DIR / f"{task_id}.{ext}"
    
    with open(temp_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    db = SessionLocal()
    try:
        new_task = Task(
            id=task_id,
            status="pending",
            task_type="cleanup",
            meta_data={"original_filename": file.filename}
        )
        db.add(new_task)
        db.commit()
    finally:
        db.close()
        
    from services.cleanup_worker import process_cleanup_task
    background_tasks.add_task(process_cleanup_task, task_id, str(temp_path))
    
    return {"task_id": task_id, "status": "pending"}

class YoutubeDownloadRequest(BaseModel):
    url: str
    bitrate: str = "320"

@router.post("/youtube/download")
@limiter.limit("5/minute")
async def youtube_download(request: Request, background_tasks: BackgroundTasks, payload: YoutubeDownloadRequest):
    task_id = str(uuid.uuid4())
    
    db = SessionLocal()
    try:
        new_task = Task(
            id=task_id,
            task_type="youtube",
            status="queued",
            meta_data={
                "url": payload.url,
                "bitrate": payload.bitrate,
                "progress_percent": 0
            }
        )
        db.add(new_task)
        db.commit()
    finally:
        db.close()
    
    background_tasks.add_task(process_youtube_task, task_id, payload.url, payload.bitrate)
    
    return {
        "task_id": task_id,
        "status": "queued",
        "message": "Youtube download started."
    }

@router.get("/youtube/tasks/{task_id}")
def get_yt_task_status(task_id: str):
    # Resuse standard task status handler
    return get_task_status(task_id)

@router.get("/youtube/download/{task_id}")
def download_yt_file(task_id: str):
    task = get_task_from_db(task_id)
    if task.status != "completed":
        raise HTTPException(status_code=400, detail="File belum siap.")
        
    file_info = task.meta_data.get("file", {})
    if not file_info or "minio_key" not in file_info:
        raise HTTPException(status_code=404, detail="File tidak ditemukan di MinIO.")
        
    url = generate_presigned_url(file_info["minio_key"])
    if not url:
        raise HTTPException(status_code=500, detail="Gagal membuat URL download.")
        
    return RedirectResponse(url=url)
