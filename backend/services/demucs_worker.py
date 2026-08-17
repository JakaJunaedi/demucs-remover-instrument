import subprocess
import json
import time
import shutil
import re
import psutil
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Dict
from core.config import OUTPUTS_DIR, UPLOADS_DIR
from core.db import update_task_db
from core.storage import upload_file_to_minio

# Track active subprocesses by task_id
ACTIVE_PROCESSES: Dict[str, subprocess.Popen] = {}

# Keep update_metadata as an alias to avoid changing all calls
def update_metadata(task_id: str, updates: dict):
    update_task_db(task_id, updates)

def pause_task(task_id: str) -> bool:
    if task_id in ACTIVE_PROCESSES:
        try:
            proc = ACTIVE_PROCESSES[task_id]
            parent = psutil.Process(proc.pid)
            for child in parent.children(recursive=True):
                child.suspend()
            parent.suspend()
            update_metadata(task_id, {"status": "paused"})
            return True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return False
    return False

def resume_task(task_id: str) -> bool:
    if task_id in ACTIVE_PROCESSES:
        try:
            proc = ACTIVE_PROCESSES[task_id]
            parent = psutil.Process(proc.pid)
            for child in parent.children(recursive=True):
                child.resume()
            parent.resume()
            update_metadata(task_id, {"status": "processing"})
            return True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return False
    return False

def cancel_task(task_id: str) -> bool:
    if task_id in ACTIVE_PROCESSES:
        try:
            update_metadata(task_id, {"status": "failed", "error": "Proses dibatalkan oleh pengguna."})
            proc = ACTIVE_PROCESSES[task_id]
            parent = psutil.Process(proc.pid)
            for child in parent.children(recursive=True):
                child.terminate()
            parent.terminate()
            return True
        except (psutil.NoSuchProcess, psutil.AccessDenied):
            return False
    return False

def process_audio_task(task_id: str, filename: str, duration: float, stem_mode: str = "2"):
    """Background task to run Demucs and update metadata."""
    update_metadata(task_id, {
        "status": "processing",
        "progress_percent": 0,
        "processing_start_time": datetime.now(timezone.utc).isoformat()
    })
    
    input_file = UPLOADS_DIR / task_id / filename
    output_dir = OUTPUTS_DIR / task_id
    
    try:
        start_time = time.time()
        
        cmd = [
            "demucs",
            "-n", "htdemucs_ft",
            "--out", str(OUTPUTS_DIR),
            str(input_file)
        ]
        
        if stem_mode == "2":
            cmd.insert(1, "--two-stems=vocals")
            
        # Use Popen to read real-time output
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        ACTIVE_PROCESSES[task_id] = process
        
        last_percent = 0
        current_pass = 1
        total_passes = 4 if stem_mode == "2" else 8 # 4 stems has more passes
        
        for line in process.stdout:
            # Tampilkan langsung ke terminal backend agar pengguna bisa melihatnya
            print(line, end="", flush=True)
            
            # tqdm progress usually looks like:  34%|███▍      |
            match = re.search(r'(\d+)%', line)
            if match:
                percent = int(match.group(1))
                
                # Deteksi jika bar progress mereset kembali ke 0 (tanda masuk ke 'pass' selanjutnya)
                if percent < last_percent and (last_percent - percent) > 50:
                    current_pass += 1
                    
                last_percent = percent
                
                # Hitung persentase gabungan
                pass_idx = min(current_pass - 1, total_passes - 1)
                overall_percent = int((pass_idx * (100 / total_passes)) + (percent / total_passes))
                
                update_metadata(task_id, {
                    "progress_percent": overall_percent,
                    "current_pass": min(current_pass, total_passes),
                    "total_passes": total_passes
                })
                    
        process.wait()
        
        if process.returncode != 0:
            raise subprocess.CalledProcessError(process.returncode, cmd)
        
        processing_time = time.time() - start_time
        
        # Move output
        demucs_out_dir = OUTPUTS_DIR / "htdemucs_ft" / input_file.stem
        
        stems_meta = {}
        
        if demucs_out_dir.exists():
            output_dir.mkdir(parents=True, exist_ok=True)
            
            if stem_mode == "2":
                expected_files = ["vocals.wav", "no_vocals.wav"]
            else:
                expected_files = ["vocals.wav", "drums.wav", "bass.wav", "other.wav"]
                
            for fname in expected_files:
                if (demucs_out_dir / fname).exists():
                    shutil.copy(demucs_out_dir / fname, output_dir / fname)
                    
                    # Upload to MinIO
                    key = f"{task_id}/{fname}"
                    upload_file_to_minio(str(output_dir / fname), key)
                    
                    fsize = (output_dir / fname).stat().st_size
                    stem_name = fname.replace(".wav", "")
                    stems_meta[stem_name] = {"file": fname, "size_bytes": fsize, "minio_key": key}
            
            shutil.rmtree(demucs_out_dir)
            
        completed_at = datetime.now(timezone.utc)
        expires_at = completed_at + timedelta(days=1)
        
        update_metadata(task_id, {
            "status": "completed",
            "progress_percent": 100,
            "processing_time_seconds": round(processing_time, 2),
            "completed_at": completed_at.isoformat(),
            "expires_at": expires_at.isoformat(),
            "stems": stems_meta,
            "stem_mode": stem_mode
        })
        
        # Cleanup
        shutil.rmtree(output_dir, ignore_errors=True)
        if input_file.parent.exists():
            shutil.rmtree(input_file.parent, ignore_errors=True)
        
    except subprocess.CalledProcessError as e:
        from core.db import SessionLocal
        from core.models import Task
        
        db = SessionLocal()
        is_canceled = False
        try:
            task = db.query(Task).filter(Task.id == task_id).first()
            if task and task.meta_data and task.meta_data.get("error") == "Proses dibatalkan oleh pengguna.":
                is_canceled = True
        finally:
            db.close()
            
        if is_canceled:
            demucs_out_dir = OUTPUTS_DIR / "htdemucs_ft" / input_file.stem
            if demucs_out_dir.exists():
                shutil.rmtree(demucs_out_dir, ignore_errors=True)
            print(f"Task {task_id} canceled successfully and cleaned up.")
            return
                
        update_metadata(task_id, {
            "status": "failed",
            "error": "Demucs processing failed. Check logs."
        })
        print(f"Demucs error for {task_id}: Exit code {e.returncode}")
    except Exception as e:
        update_metadata(task_id, {
            "status": "failed",
            "error": str(e)
        })
    finally:
        if task_id in ACTIVE_PROCESSES:
            del ACTIVE_PROCESSES[task_id]
