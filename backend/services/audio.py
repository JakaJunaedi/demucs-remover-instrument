import subprocess
import json
import logging
from fastapi import HTTPException
from pathlib import Path
from core.config import MAX_DURATION_SECONDS, MAX_SIZE_MP3, MAX_SIZE_WAV

logger = logging.getLogger(__name__)

def validate_audio_file(file_content: bytes, filename: str) -> str:
    """Validates magic bytes to determine real format and checks file size."""
    # Basic magic byte check for common audio formats
    magic = file_content[:12]
    
    is_mp3 = magic.startswith(b"ID3") or magic.startswith(b"\xff\xfb") or magic.startswith(b"\xff\xf3")
    is_wav = magic.startswith(b"RIFF") and b"WAVE" in magic
    is_flac = magic.startswith(b"fLaC")
    is_m4a = magic[4:8] == b"ftyp" and b"M4A" in magic
    
    format_type = None
    if is_mp3 or is_m4a:
        format_type = "compressed"
        max_size = MAX_SIZE_MP3
    elif is_wav or is_flac:
        format_type = "lossless"
        max_size = MAX_SIZE_WAV
    else:
        raise HTTPException(status_code=400, detail="Format file tidak didukung. Gunakan MP3, WAV, FLAC, atau M4A.")
        
    if len(file_content) > max_size:
        raise HTTPException(
            status_code=413, 
            detail=f"Ukuran file melebihi batas. MP3/M4A: {MAX_SIZE_MP3//1024//1024} MB, WAV/FLAC: {MAX_SIZE_WAV//1024//1024} MB."
        )
        
    return format_type

def get_audio_duration(file_path: Path) -> float:
    """Uses ffprobe to get audio duration."""
    try:
        result = subprocess.run(
            ["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "default=noprint_wrappers=1:nokey=1", str(file_path)],
            capture_output=True,
            text=True,
            check=True
        )
        duration = float(result.stdout.strip())
        if duration > MAX_DURATION_SECONDS:
            raise HTTPException(status_code=422, detail="Durasi file melebihi 10 menit.")
        return duration
    except subprocess.CalledProcessError as e:
        logger.error(f"ffprobe error: {e}")
        raise HTTPException(status_code=400, detail="Gagal membaca metadata file audio.")
    except ValueError:
        raise HTTPException(status_code=400, detail="Format audio tidak valid atau corrupt.")
