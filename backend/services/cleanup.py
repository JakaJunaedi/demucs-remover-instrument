import os
import shutil
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from core.config import UPLOADS_DIR, OUTPUTS_DIR

logger = logging.getLogger(__name__)

def delete_old_tasks():
    """
    Menghapus folder di uploads/ dan outputs/ jika umurnya lebih dari 24 jam,
    berdasarkan metadata 'created_at'.
    """
    logger.info("Memulai proses pembersihan task lama...")
    now = datetime.now(timezone.utc)
    deleted_count = 0
    
    if not OUTPUTS_DIR.exists():
        return
        
    for task_folder in OUTPUTS_DIR.iterdir():
        if not task_folder.is_dir():
            continue
            
        metadata_file = task_folder / "metadata.json"
        
        should_delete = False
        
        if metadata_file.exists():
            try:
                with open(metadata_file, "r") as f:
                    meta = json.load(f)
                
                created_at_str = meta.get("created_at")
                if created_at_str:
                    created_at = datetime.fromisoformat(created_at_str)
                    age_hours = (now - created_at).total_seconds() / 3600
                    if age_hours > 24:
                        should_delete = True
            except Exception as e:
                logger.error(f"Gagal membaca metadata untuk task {task_folder.name}: {e}")
                # Jika metadata corrupt dan folder sudah lama, bisa dihapus, tapi untuk aman abaikan saja.
        else:
            # Jika tidak ada metadata, periksa mtime folder
            mtime = datetime.fromtimestamp(task_folder.stat().st_mtime, tz=timezone.utc)
            if (now - mtime).total_seconds() / 3600 > 24:
                should_delete = True
                
        if should_delete:
            try:
                # Hapus dari outputs/
                shutil.rmtree(task_folder)
                
                # Hapus dari uploads/
                upload_folder = UPLOADS_DIR / task_folder.name
                if upload_folder.exists():
                    shutil.rmtree(upload_folder)
                    
                deleted_count += 1
                logger.info(f"Task {task_folder.name} berhasil dihapus.")
            except Exception as e:
                logger.error(f"Gagal menghapus folder task {task_folder.name}: {e}")
                
    logger.info(f"Proses pembersihan selesai. {deleted_count} task dihapus.")
