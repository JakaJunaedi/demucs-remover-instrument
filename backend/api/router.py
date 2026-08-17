import uuid
import time
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException, Request
from core.config import UPLOADS_DIR, OUTPUTS_DIR
from services.audio import validate_audio_file, get_audio_duration
from services.demucs_worker import process_audio_task, update_metadata, get_metadata_path
from slowapi import Limiter
from slowapi.util import get_remote_address
import json

limiter = Limiter(key_func=get_remote_address)
router = APIRouter(prefix="/api/v1")

@router.get("/health")
def health_check():
    return {
        "status": "ok",
        "version": "1.1.0",
        "gpu_available": False,
        "model_loaded": "htdemucs_ft",
        "uptime_seconds": 0 # to be handled in main
    }

@router.post("/upload")
@limiter.limit("5/minute")
async def upload_audio(request: Request, background_tasks: BackgroundTasks, file: UploadFile = File(...)):
    # 1. Read file into memory for validation
    content = await file.read()
    
    # 2. Validate
    validate_audio_file(content, file.filename)
    
    # 3. Create task
    task_id = str(uuid.uuid4())
    task_upload_dir = UPLOADS_DIR / task_id
    task_upload_dir.mkdir(parents=True, exist_ok=True)
    
    file_path = task_upload_dir / file.filename
    with open(file_path, "wb") as f:
        f.write(content)
        
    duration = get_audio_duration(file_path)
    estimated_time = duration * 3
    
    # 4. Init metadata
    meta = {
        "task_id": task_id,
        "status": "queued",
        "filename": file.filename,
        "duration_seconds": duration,
        "estimated_processing_seconds": estimated_time,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    update_metadata(task_id, meta)
    
    # 5. Add to background thread
    background_tasks.add_task(process_audio_task, task_id, file.filename, duration)
    
    return {
        "task_id": task_id,
        "status": "queued",
        "filename": file.filename,
        "duration_seconds": duration,
        "estimated_processing_seconds": estimated_time,
        "message": "File berhasil diupload. Processing dimulai."
    }

@router.get("/tasks/{task_id}")
def get_task_status(task_id: str):
    meta_path = get_metadata_path(task_id)
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Task tidak ditemukan atau sudah kedaluwarsa.")
        
    with open(meta_path, "r") as f:
        data = json.load(f)
        
    if data.get("status") == "processing":
        start_time = datetime.fromisoformat(data["processing_start_time"])
        elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
        est_rem = max(0, data["estimated_processing_seconds"] - elapsed)
        data["elapsed_seconds"] = round(elapsed, 2)
        data["estimated_remaining_seconds"] = round(est_rem, 2)
        
    return data

@router.post("/tasks/{task_id}/pause")
def pause_task_endpoint(task_id: str):
    from services.demucs_worker import pause_task
    if pause_task(task_id):
        return {"message": "Tugas di-pause."}
    raise HTTPException(status_code=400, detail="Tidak dapat mem-pause tugas ini. Mungkin sudah selesai atau error.")

@router.post("/tasks/{task_id}/resume")
def resume_task_endpoint(task_id: str):
    from services.demucs_worker import resume_task
    if resume_task(task_id):
        return {"message": "Tugas dilanjutkan."}
    raise HTTPException(status_code=400, detail="Tidak dapat melanjutkan tugas ini.")

@router.post("/tasks/{task_id}/cancel")
def cancel_task_endpoint(task_id: str):
    from services.demucs_worker import cancel_task
    if cancel_task(task_id):
        return {"message": "Tugas dibatalkan."}
    raise HTTPException(status_code=400, detail="Tidak dapat membatalkan tugas ini.")

from fastapi.responses import FileResponse, StreamingResponse
import io
import zipfile

@router.get("/download/{task_id}/{stem}")
def download_stem(task_id: str, stem: str):
    if stem not in ["vocals", "no_vocals"]:
        raise HTTPException(status_code=400, detail="Stem tidak valid.")
        
    meta_path = get_metadata_path(task_id)
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Task tidak ditemukan.")
        
    file_path = OUTPUTS_DIR / task_id / f"{stem}.wav"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File belum siap atau sudah kadaluwarsa.")
        
    return FileResponse(
        path=file_path,
        media_type="audio/wav",
        filename=f"{task_id}_{stem}.wav"
    )

@router.get("/download/{task_id}/zip")
def download_zip(task_id: str):
    meta_path = get_metadata_path(task_id)
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Task tidak ditemukan.")
        
    dir_path = OUTPUTS_DIR / task_id
    vocal_path = dir_path / "vocals.wav"
    inst_path = dir_path / "no_vocals.wav"
    
    if not vocal_path.exists() or not inst_path.exists():
        raise HTTPException(status_code=404, detail="File belum siap atau sudah kadaluwarsa.")
        
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
        zip_file.write(vocal_path, arcname=f"{task_id}_vocals.wav")
        zip_file.write(inst_path, arcname=f"{task_id}_instrumental.wav")
        
    zip_buffer.seek(0)
    
    return StreamingResponse(
        zip_buffer,
        media_type="application/zip",
        headers={"Content-Disposition": f"attachment; filename={task_id}_stems.zip"}
    )

from pydantic import BaseModel

class YoutubeDownloadRequest(BaseModel):
    url: str
    bitrate: str = "320"

@router.post("/youtube/download")
@limiter.limit("5/minute")
async def youtube_download(request: Request, background_tasks: BackgroundTasks, payload: YoutubeDownloadRequest):
    from services.youtube_worker import process_youtube_task, update_yt_metadata
    
    task_id = str(uuid.uuid4())
    
    meta = {
        "task_id": task_id,
        "status": "queued",
        "url": payload.url,
        "bitrate": payload.bitrate,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    update_yt_metadata(task_id, meta)
    
    background_tasks.add_task(process_youtube_task, task_id, payload.url, payload.bitrate)
    
    return {
        "task_id": task_id,
        "status": "queued",
        "message": "Youtube download started."
    }

@router.get("/youtube/tasks/{task_id}")
def get_yt_task_status(task_id: str):
    from services.youtube_worker import get_yt_metadata_path
    meta_path = get_yt_metadata_path(task_id)
    if not meta_path.exists():
        raise HTTPException(status_code=404, detail="Task tidak ditemukan.")
        
    with open(meta_path, "r") as f:
        data = json.load(f)
        
    if data.get("status") == "processing" and "processing_start_time" in data:
        start_time = datetime.fromisoformat(data["processing_start_time"])
        elapsed = (datetime.now(timezone.utc) - start_time).total_seconds()
        data["elapsed_seconds"] = round(elapsed, 2)
        
    return data

@router.get("/youtube/download/{task_id}")
def download_yt_file(task_id: str):
    file_path = OUTPUTS_DIR / task_id / "audio.mp3"
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File belum siap atau sudah kadaluwarsa.")
        
    return FileResponse(
        path=file_path,
        media_type="audio/mpeg",
        filename=f"youtube_{task_id}.mp3"
    )
