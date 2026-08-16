FROM python:3.11-slim

WORKDIR /app

# Install system dependencies (ffmpeg is required for audio processing)
RUN apt-get update && apt-get install -y ffmpeg && rm -rf /var/lib/apt/lists/*

# Install python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt && rm -rf /root/.cache/pip

# Pre-download the Demucs model during build
RUN python -c "import demucs.api; demucs.api.Separator(model='htdemucs_ft')"

COPY . .

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
