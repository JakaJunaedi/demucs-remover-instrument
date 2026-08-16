# AI Vocal Remover & Instrumental Extractor 🎵

A production-ready web application that uses **Demucs** (Meta's state-of-the-art AI model) to separate vocals and instrumental tracks from any audio file.

## Features ✨
- **High-Quality Separation**: Powered by `htdemucs_ft` for studio-quality isolation.
- **Real-time Progress UI**: See accurate percentage of AI processing with an animated audio equalizer.
- **Interactive Stem Mixer**: Play both separated stems synchronously. Solo, mute, or adjust volume via a clean UI.
- **Client-side Custom Mix Export**: Re-render the audio based on your mixer settings directly in the browser using the Web Audio API.
- **One-Click Download**: Download Vocals, Instrumental, or a bundled ZIP.
- **Mobile Responsive**: Carefully designed UI for phones and desktops.
- **Production DevOps**: Multi-stage Nginx Docker container, SlowAPI rate-limiting, and APScheduler for auto-deleting 24h old files.

## Architecture 🏗️
- **Frontend**: React 19, Vite, TailwindCSS, Zustand (Polling state management), Wavesurfer.js
- **Backend**: FastAPI, Uvicorn, APScheduler, Python `subprocess` (to isolate Demucs CPU load), SlowAPI.

## Run Locally (Docker) 🐳

The easiest way to run this project is via Docker. The backend image will automatically download the Demucs AI model during the build process.

```bash
docker compose up --build
```
- Frontend will be available at `http://localhost:5173`
- Backend API Docs at `http://localhost:8000/docs`

## Run Locally (Manual) 💻

**1. Backend**
```bash
cd backend
python -m venv .venv
# Activate venv: source .venv/bin/activate (Linux/Mac) or .\.venv\Scripts\Activate.ps1 (Windows)
pip install -r requirements.txt
uvicorn main:app --reload
```

**2. Frontend**
```bash
cd frontend
npm install
npm run dev
```

---
*Created as an MVP for audio separation tasks.*
