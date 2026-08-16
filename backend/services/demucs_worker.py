import subprocess
import json
import time
import shutil
from pathlib import Path
from datetime import datetime, timezone, timedelta
from core.config import OUTPUTS_DIR, UPLOADS_DIR

def get_metadata_path(task_id: str) -> Path:
    return OUTPUTS_DIR / task_id / "metadata.json"

def update_metadata(task_id: str, updates: dict):
    meta_path = get_metadata_path(task_id)
    if meta_path.exists():
        with open(meta_path, "r") as f:
            data = json.load(f)
    else:
        data = {}
        
    data.update(updates)
    
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    with open(meta_path, "w") as f:
        json.dump(data, f, indent=2)

def process_audio_task(task_id: str, filename: str, duration: float):
    """Background task to run Demucs and update metadata."""
    update_metadata(task_id, {
        "status": "processing",
        "processing_start_time": datetime.now(timezone.utc).isoformat()
    })
    
    input_file = UPLOADS_DIR / task_id / filename
    output_dir = OUTPUTS_DIR / task_id
    
    try:
        start_time = time.time()
        
        # Run Demucs
        # Using htdemucs_ft, 2 stems (vocals, no_vocals)
        # Using subprocess for isolation
        cmd = [
            "demucs",
            "--two-stems=vocals",
            "-n", "htdemucs_ft",
            "--out", str(OUTPUTS_DIR),
            str(input_file)
        ]
        
        subprocess.run(cmd, check=True, capture_output=True, text=True)
        
        processing_time = time.time() - start_time
        
        # Demucs creates output at OUTPUTS_DIR / "htdemucs_ft" / filename_without_ext /
        # We need to move it to OUTPUTS_DIR / task_id /
        demucs_out_dir = OUTPUTS_DIR / "htdemucs_ft" / input_file.stem
        
        if demucs_out_dir.exists():
            shutil.copy(demucs_out_dir / "vocals.wav", output_dir / "vocals.wav")
            shutil.copy(demucs_out_dir / "no_vocals.wav", output_dir / "no_vocals.wav")
            shutil.rmtree(demucs_out_dir)
            
        vocals_size = (output_dir / "vocals.wav").stat().st_size
        no_vocals_size = (output_dir / "no_vocals.wav").stat().st_size
        
        completed_at = datetime.now(timezone.utc)
        expires_at = completed_at + timedelta(days=1)
        
        update_metadata(task_id, {
            "status": "completed",
            "processing_time_seconds": round(processing_time, 2),
            "completed_at": completed_at.isoformat(),
            "expires_at": expires_at.isoformat(),
            "stems": {
                "vocals": {"file": "vocals.wav", "size_bytes": vocals_size},
                "no_vocals": {"file": "no_vocals.wav", "size_bytes": no_vocals_size}
            }
        })
        
    except subprocess.CalledProcessError as e:
        update_metadata(task_id, {
            "status": "failed",
            "error": "Demucs processing failed."
        })
        print(f"Demucs error for {task_id}: {e.stderr}")
    except Exception as e:
        update_metadata(task_id, {
            "status": "failed",
            "error": str(e)
        })
