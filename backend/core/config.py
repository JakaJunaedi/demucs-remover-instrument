import os
from pathlib import Path

# Paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOADS_DIR = BASE_DIR / "uploads"
OUTPUTS_DIR = BASE_DIR / "outputs"

# File constraints
MAX_SIZE_MP3 = 50 * 1024 * 1024  # 50 MB
MAX_SIZE_WAV = 200 * 1024 * 1024 # 200 MB
MAX_DURATION_SECONDS = 600       # 10 minutes

# Ensure directories exist
os.makedirs(UPLOADS_DIR, exist_ok=True)
os.makedirs(OUTPUTS_DIR, exist_ok=True)
