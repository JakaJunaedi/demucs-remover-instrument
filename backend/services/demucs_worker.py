import subprocess
import json
import time
import shutil
import re
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
        "progress_percent": 0,
        "processing_start_time": datetime.now(timezone.utc).isoformat()
    })
    
    input_file = UPLOADS_DIR / task_id / filename
    output_dir = OUTPUTS_DIR / task_id
    
    try:
        start_time = time.time()
        
        cmd = [
            "demucs",
            "--two-stems=vocals",
            "-n", "htdemucs_ft",
            "--out", str(OUTPUTS_DIR),
            str(input_file)
        ]
        
        # Use Popen to read real-time output
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        last_percent = 0
        current_pass = 1
        total_passes = 2
        
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
                overall_percent = int((pass_idx * 50) + (percent / total_passes))
                
                update_metadata(task_id, {"progress_percent": overall_percent})
                    
        process.wait()
        
        if process.returncode != 0:
            raise subprocess.CalledProcessError(process.returncode, cmd)
        
        processing_time = time.time() - start_time
        
        # Move output
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
            "progress_percent": 100,
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
            "error": "Demucs processing failed. Check logs."
        })
        print(f"Demucs error for {task_id}: Exit code {e.returncode}")
    except Exception as e:
        update_metadata(task_id, {
            "status": "failed",
            "error": str(e)
        })
