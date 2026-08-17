import subprocess
import time
import re
import os
import shutil
from pathlib import Path
from datetime import datetime, timezone, timedelta
from core.config import OUTPUTS_DIR
from core.db import update_task_db
from core.storage import upload_file_to_minio

def process_youtube_task(task_id: str, url: str, bitrate: str):
    """Background task to run yt-dlp and update database."""
    update_task_db(task_id, {
        "status": "processing",
        "progress_percent": 0,
        "processing_start_time": datetime.now(timezone.utc).isoformat()
    })
    
    output_dir = OUTPUTS_DIR / task_id
    output_dir.mkdir(parents=True, exist_ok=True)
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
            match = re.search(r'\[download\]\s+(\d+\.?\d*)%', line)
            if match:
                percent = float(match.group(1))
                update_task_db(task_id, {"progress_percent": int(percent)})
                    
        process.wait()
        
        if process.returncode != 0:
            raise subprocess.CalledProcessError(process.returncode, cmd)
        
        processing_time = time.time() - start_time
        final_file = output_dir / "audio.mp3"
        
        if final_file.exists():
            file_size = final_file.stat().st_size
            
            # Upload to MinIO
            object_name = f"{task_id}/audio.mp3"
            upload_success = upload_file_to_minio(str(final_file), object_name)
            
            if not upload_success:
                raise Exception("Failed to upload to MinIO")
        else:
            raise Exception("Output file not found")
            
        completed_at = datetime.now(timezone.utc)
        expires_at = completed_at + timedelta(days=1)
        
        update_task_db(task_id, {
            "status": "completed",
            "progress_percent": 100,
            "processing_time_seconds": round(processing_time, 2),
            "completed_at": completed_at.isoformat(),
            "expires_at": expires_at.isoformat(),
            "file": {
                "name": "audio.mp3",
                "size_bytes": file_size,
                "minio_key": object_name
            }
        })
        
    except subprocess.CalledProcessError as e:
        update_task_db(task_id, {
            "status": "failed",
            "error": "YouTube download failed. Check logs."
        })
    except Exception as e:
        update_task_db(task_id, {
            "status": "failed",
            "error": str(e)
        })
    finally:
        # Cleanup local files
        if output_dir.exists():
            shutil.rmtree(output_dir, ignore_errors=True)
