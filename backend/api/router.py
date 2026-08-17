import uuid
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Any
import json
import shutil
import io
import zipfile

from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, Request
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
async def upload_audio(request: Request, background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    if not file.content_type.startswith("audio/") and not file.content_type.startswith("video/"):
        raise HTTPException(status_code=400, detail="File must be an audio or video file")
        
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
    estimated_time = duration * 3
    
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
                "progress_percent": 0
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
        duration=duration
    )
    
    return {
        "task_id": task_id,
        "status": "queued",
        "filename": file.filename,
        "duration_seconds": duration,
        "estimated_processing_seconds": estimated_time
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

@router.get("/download/{task_id}/{stem}")
def download_stem(task_id: str, stem: str):
    if stem not in ["vocals", "no_vocals"]:
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
