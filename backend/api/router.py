import uuid
import time
from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, UploadFile, File, BackgroundTasks, HTTPException
from core.config import UPLOADS_DIR, OUTPUTS_DIR
from services.audio import validate_audio_file, get_audio_duration
from services.demucs_worker import process_audio_task, update_metadata, get_metadata_path
import json

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
async def upload_audio(background_tasks: BackgroundTasks, file: UploadFile = File(...)):
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
