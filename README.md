# AI Vocal Remover & Instrumental Extractor 🎵

A production-ready web application that uses **Demucs** (Meta's state-of-the-art AI model) to separate vocals and instrumental tracks from any audio file, alongside a fully integrated **YouTube to MP3** converter.

## Features ✨
- **High-Quality Separation**: Powered by `htdemucs_ft` for studio-quality isolation (2-Stems & 4-Stems support).
- **Vocal Cleanup (Artifact Remover)**: Powered by AI Spectral Noise Gating (`noisereduce`) to automatically clean robotic artifacts from extracted vocals.
- **YouTube to MP3 Converter**: Direct downloads from YouTube with anti-bot bypass and quality selection (128-320kbps).
- **Cloud-Native Storage**: Uses **MinIO** (S3-compatible) for highly scalable object storage and **PostgreSQL** for persistent task metadata.
- **Real-time Progress UI**: See accurate percentage of AI processing with an animated audio equalizer and resilient polling.
- **Interactive Stem Mixer (Pro Mixer)**: DJ-style vertical faders for 4-stems and standard waveform mixer for 2-stems. Solo, mute, or adjust volume via a clean UI.
- **Client-side Custom Mix Export**: Re-render the audio based on your mixer settings directly in the browser using the Web Audio API.
- **Server-side ZIP Download**: Download Vocals, Instrumental, or a bundled ZIP. Uses S3 Presigned URLs for optimal server performance.
- **Production DevOps**: Docker Compose orchestration for API, Database, and Object Storage.

## Architecture 🏗️
- **Frontend**: React 19, Vite, TailwindCSS, Zustand (Persisted Polling State), Wavesurfer.js
- **Backend**: FastAPI, SQLAlchemy, Boto3, `yt-dlp`, `scipy` & `noisereduce`, Python `subprocess` (to isolate CPU load).
- **Infrastructure**: PostgreSQL 17 (Metadata), MinIO (Object Storage).

## Run Locally (Docker) 🐳

The project is fully orchestrated via Docker Compose.

```bash
# Set up your environment variables
cp backend/.env.example backend/.env

# Start all services (PostgreSQL, MinIO, Backend, Frontend)
docker compose up -d --build
```
- Frontend: `http://localhost:5173`
- Backend API Docs: `http://localhost:8000/docs`
- MinIO Console: `http://localhost:9001` (Default: minioadmin / minioadmin)

## Run Locally (Manual Development) 💻

**1. Infrastructure**
Ensure PostgreSQL and MinIO containers are running via Docker.

**2. Backend**
```bash
cd backend
python -m venv .venv
# Activate venv: source .venv/bin/activate (Linux/Mac) or .\.venv\Scripts\Activate.ps1 (Windows)
pip install -r requirements.txt
uvicorn main:app --reload
```

**3. Frontend**
```bash
cd frontend
npm install
npm run dev
```

---
*Created as an MVP for cloud-native audio separation tasks.*
