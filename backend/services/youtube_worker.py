import subprocess
import json
import time
import re
import os
from pathlib import Path
from datetime import datetime, timezone, timedelta
from core.config import OUTPUTS_DIR

def get_yt_metadata_path(task_id: str) -> Path:
    return OUTPUTS_DIR / task_id / "yt_metadata.json"

def update_yt_metadata(task_id: str, updates: dict):
    meta_path = get_yt_metadata_path(task_id)
    if meta_path.exists():
        with open(meta_path, "r") as f:
            data = json.load(f)
    else:
        data = {}
        
    data.update(updates)
    
    meta_path.parent.mkdir(parents=True, exist_ok=True)
    with open(meta_path, "w") as f:
        json.dump(data, f, indent=2)

def process_youtube_task(task_id: str, url: str, bitrate: str):
    """Background task to run yt-dlp and update metadata."""
    update_yt_metadata(task_id, {
        "status": "processing",
        "progress_percent": 0,
        "processing_start_time": datetime.now(timezone.utc).isoformat()
    })
    
    output_dir = OUTPUTS_DIR / task_id
    output_dir.mkdir(parents=True, exist_ok=True)
    # Output template for yt-dlp
    output_template = str(output_dir / "audio.%(ext)s")
    
    try:
        start_time = time.time()
        
        cmd = [
            "yt-dlp",
            "--extract-audio",
            "--audio-format", "mp3",
            "--audio-quality", bitrate,
            "--newline",
            "--rm-cache-dir",
            "--extractor-args", "youtube:player_client=android",
            "-o", output_template,
            url
        ]
        
        process = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )
        
        for line in process.stdout:
            print(line, end="", flush=True)
            
            # Match yt-dlp progress: [download]  15.2% of  12.50MiB
            match = re.search(r'\[download\]\s+(\d+\.?\d*)%', line)
            if match:
                percent = float(match.group(1))
                update_yt_metadata(task_id, {"progress_percent": int(percent)})
                    
        process.wait()
        
        if process.returncode != 0:
            raise subprocess.CalledProcessError(process.returncode, cmd)
        
        processing_time = time.time() - start_time
        
        final_file = output_dir / "audio.mp3"
        
        if final_file.exists():
            file_size = final_file.stat().st_size
        else:
            file_size = 0
            
        completed_at = datetime.now(timezone.utc)
        expires_at = completed_at + timedelta(days=1)
        
        update_yt_metadata(task_id, {
            "status": "completed",
            "progress_percent": 100,
            "processing_time_seconds": round(processing_time, 2),
            "completed_at": completed_at.isoformat(),
            "expires_at": expires_at.isoformat(),
            "file": {
                "name": "audio.mp3",
                "size_bytes": file_size
            }
        })
        
    except subprocess.CalledProcessError as e:
        update_yt_metadata(task_id, {
            "status": "failed",
            "error": "YouTube download failed. Check logs."
        })
        print(f"yt-dlp error for {task_id}: Exit code {e.returncode}")
    except Exception as e:
        update_yt_metadata(task_id, {
            "status": "failed",
            "error": str(e)
        })
