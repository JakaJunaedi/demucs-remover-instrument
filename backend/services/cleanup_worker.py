import os
import io
import time
from pathlib import Path
from core.db import SessionLocal
from core.models import Task
from core.storage import upload_file_to_minio, s3_client, MINIO_BUCKET
import scipy.io.wavfile as wavfile
import noisereduce as nr
import traceback

def process_cleanup_task(task_id: str, file_path: str):
    db = SessionLocal()
    try:
        # Update status to processing
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "processing"
            db.commit()

        # Load audio using scipy
        rate, data = wavfile.read(file_path)
        
        # Scipy reads stereo as (time, channels). noisereduce expects (channels, time).
        # We need to transpose the data if it has multiple channels.
        is_stereo = len(data.shape) > 1
        if is_stereo:
            data = data.T
        
        # Perform noise reduction
        # Using stationary noise reduction which is good for artifact removal
        reduced_noise = nr.reduce_noise(y=data, sr=rate, prop_decrease=0.8, stationary=True)
        
        # Transpose back for saving if it was stereo
        if is_stereo:
            reduced_noise = reduced_noise.T
            
        # Save processed audio to temporary file
        output_path = f"{file_path}_cleaned.wav"
        wavfile.write(output_path, rate, reduced_noise)
        
        # Upload to MinIO
        minio_key = f"{task_id}/cleaned.wav"
        if upload_file_to_minio(output_path, minio_key):
            # Update DB with completion
            task = db.query(Task).filter(Task.id == task_id).first()
            if task:
                meta = dict(task.meta_data)
                meta["cleaned_minio_key"] = minio_key
                task.meta_data = meta
                task.status = "completed"
                db.commit()
                
        # Cleanup temp files
        try:
            if os.path.exists(file_path):
                os.remove(file_path)
            if os.path.exists(output_path):
                os.remove(output_path)
        except:
            pass

    except Exception as e:
        print(f"Error in cleanup worker: {e}")
        traceback.print_exc()
        db.rollback()
        task = db.query(Task).filter(Task.id == task_id).first()
        if task:
            task.status = "error"
            meta = dict(task.meta_data)
            meta["error"] = str(e)
            task.meta_data = meta
            db.commit()
    finally:
        db.close()
