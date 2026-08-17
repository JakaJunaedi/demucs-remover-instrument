# Product Requirements Document (PRD)

## Vocal Remover Web App

**Versi:** 1.3  
**Tanggal:** 17 Agustus 2026  
**Status:** Updated (Phase 11 & Phase 12 Complete)  
**Author:** Product Team

---

## 1. Executive Summary

### 1.1 Visi Produk
Vocal Remover Web App adalah aplikasi berbasis web yang memungkinkan pengguna untuk memisahkan vokal dari trek instrumental dalam file audio secara otomatis menggunakan kecerdasan buatan (AI). Aplikasi ini dirancang untuk berjalan sepenuhnya di lingkungan lokal pengguna, menjamin privasi data audio 100% tanpa perlu mengunggah file ke server pihak ketiga.

### 1.2 Tujuan Bisnis
- Menyediakan tool vocal removal gratis/open-source yang dapat dijalankan secara lokal
- Menjamin privasi pengguna dengan processing on-premise
- Memberikan kualitas separasi vokal setara dengan tool komersial (Lalal.ai, Moises)
- Membangun fondasi untuk potensi monetisasi SaaS di masa depan

### 1.3 Target Pengguna
| Segmen | Karakteristik | Use Case |
|--------|--------------|----------|
| **Musisi & Producer** | Butuh backing track untuk latihan/performance | Membuat karaoke version dari lagu |
| **Content Creator** | Membutuhkan instrumental untuk video/podcast | Menghilangkan vokal untuk konten |
| **DJ & Remixer** | Ingin stem terpisah untuk remix | Isolasi vokal/instrumental |
| **Penyanyi (Karaoke)** | Ingin bernyanyi dengan instrumental asli | Membuat file karaoke pribadi |
| **Developer/Audio Enthusiast** | Tertarik teknologi AI audio | Eksplorasi & kontribusi open-source |

### 1.4 Success Criteria
- [ ] Pengguna dapat upload file audio dan mendapatkan hasil separasi dalam < 3x durasi audio (estimasi; lagu 3 menit ≈ 6-9 menit di CPU modern) — *direvisi dari "< 2 menit" yang tidak realistis untuk htdemucs_ft di CPU*
- [ ] Kualitas separasi mencapai SDR > 8.0 dB (menggunakan model HT-Demucs FT)
- [ ] Aplikasi dapat di-deploy dengan satu perintah (`docker compose up`)
- [ ] UI/UX intuitif — pengguna baru dapat menggunakan tanpa dokumentasi
- [ ] Frontend menampilkan progress status real-time via polling tanpa reload halaman

---

## 2. Scope & Constraints

### 2.1 In-Scope (MVP & v1.3 Updates)
- Upload file audio (MP3, WAV, FLAC, M4A)
- Separasi 2-stem (Vocals + Instrumental) & 4-stem (Vocals, Drums, Bass, Other)
- Vocal Cleanup (Artifact Remover) dengan AI Spectral Noise Gating
- Visualisasi waveform untuk audio asli dan hasil
- Playback kontrol (play/pause, volume, mute) untuk masing-masing stem via Pro Mixer
- Server-side ZIP Download dan Client-side Custom Mix Export (WAV)
- Progress indicator saat processing
- Docker Compose untuk local deployment

### 2.2 Out-of-Scope (Future Release)
- Real-time processing / live audio input
- Batch processing multiple files
- Cloud GPU deployment
- User authentication & history
- Mobile app (PWA mungkin dipertimbangkan)
- Audio format conversion (output selalu WAV/MP3)
- Video audio extraction

### 2.3 Constraints
- **No GPU:** Semua processing berjalan di CPU laptop
- **Local-only:** Tidak ada dependency ke cloud service
- **Open-source stack:** Semua komponen harus open-source
- **Cross-platform:** Harus berjalan di Windows, macOS, dan Linux

---

## 3. Functional Requirements

### 3.1 FR-001: Audio Upload
**Prioritas:** P0 (Critical)  
**Deskripsi:** Pengguna dapat mengunggah file audio dari perangkat mereka.

| Atribut | Spesifikasi |
|---------|-------------|
| Format yang didukung | MP3, WAV, FLAC, M4A |
| Batas ukuran (MP3 / M4A) | Maksimal **50 MB** |
| Batas ukuran (WAV / FLAC) | Maksimal **200 MB** (uncompressed lebih besar) |
| Durasi maksimum | 10 menit per file (semua format) |
| Metode upload | Drag & Drop atau File Picker |
| Validasi | Cek format via **magic bytes** (bukan hanya ekstensi), ukuran per format, durasi, dan integritas file |

> **Catatan [R8]:** Validasi ukuran dipisah per format karena WAV/FLAC uncompressed dapat mencapai >100 MB untuk durasi yang sama dengan MP3 berukuran ~10 MB. Batas durasi 10 menit berlaku konsisten untuk semua format.

**Acceptance Criteria:**
- [ ] Pengguna dapat drag & drop file ke area upload
- [ ] Sistem menolak file dengan format tidak didukung (pesan error jelas, deteksi via magic bytes)
- [ ] Sistem menolak file MP3/M4A > 50 MB dengan pesan spesifik
- [ ] Sistem menolak file WAV/FLAC > 200 MB dengan pesan spesifik
- [ ] Sistem menolak file dengan durasi > 10 menit
- [ ] Preview nama file dan durasi muncul setelah upload berhasil

### 3.2 FR-002: AI Vocal Separation (Async)
**Prioritas:** P0 (Critical)  
**Deskripsi:** Sistem memproses file audio menggunakan model AI Demucs untuk memisahkan vokal dan instrumental. Processing berjalan **asynchronous** — POST upload langsung mengembalikan `task_id`, sedangkan proses AI berjalan di background thread.

| Atribut | Spesifikasi |
|---------|-------------|
| Model AI | HT-Demucs FT (fine-tuned) |
| Mode separasi | 2-stem: `vocals` + `no_vocals` |
| Output format | WAV (lossless) atau MP3 320kbps |
| Processing | **Asynchronous** — POST upload return `task_id` segera; proses AI berjalan di `ThreadPoolExecutor` background thread |
| Fallback model | `htdemucs` (standard) jika `htdemucs_ft` gagal |
| Label UI | `vocals` → **"Vocals"** ; `no_vocals` → **"Instrumental"** |

> **Konvensi Nama Stem [R3]:**  
> - **API & file system:** selalu gunakan `vocals` dan `no_vocals` (konsisten dengan output Demucs)  
> - **UI / label tampilan:** gunakan **"Vocals"** dan **"Instrumental"** (lebih mudah dipahami pengguna)  
> Tidak ada pengecualian — semua endpoint, filename, dan kode internal menggunakan `no_vocals`.

**Acceptance Criteria:**
- [ ] POST `/api/v1/upload` mengembalikan `task_id` dan `status: "queued"` dalam < 2 detik
- [ ] Processing berjalan di background thread tanpa memblokir HTTP server
- [ ] Processing berhasil untuk file MP3, WAV, FLAC, M4A
- [ ] Hasil terdiri dari 2 file: `vocals.wav` dan `no_vocals.wav`
- [ ] Kualitas audio output setidaknya 44.1kHz, 16-bit stereo
- [ ] Error handling jika processing gagal (timeout, corrupt file, dll)

### 3.3 FR-003: Progress Tracking (Polling)
**Prioritas:** P1 (High)  
**Deskripsi:** Frontend melakukan polling ke endpoint status task (`GET /api/v1/tasks/{task_id}`) setiap 3 detik untuk menampilkan status dan estimasi progress pemrosesan audio secara real-time.

| Status | Deskripsi |
|--------|-----------|
| `uploading` | File sedang diunggah ke server |
| `queued` | File berhasil diupload, menunggu processing dimulai |
| `processing` | AI sedang memproses file di background thread |
| `completed` | Processing selesai, hasil tersedia untuk diunduh |
| `failed` | Processing gagal dengan pesan error |

> **Mekanisme [R2]:** Frontend polling `GET /api/v1/tasks/{task_id}` setiap 3 detik. Polling berhenti saat status `completed` atau `failed`. State task disimpan di `metadata.json` sehingga tahan terhadap server restart.

**Acceptance Criteria:**
- [ ] Progress bar muncul saat upload dan saat processing
- [ ] Frontend melakukan polling status tanpa reload halaman
- [ ] Status `processing` menampilkan estimasi sisa waktu (berdasarkan durasi file dan RTF tipikal)
- [ ] Transisi antar status berjalan smooth
- [ ] Pesan error jelas jika status `failed`

### 3.4 FR-004: Audio Playback & Visualization
**Prioritas:** P1 (High)  
**Deskripsi:** Pengguna dapat memutar dan memvisualisasikan audio asli maupun hasil separasi.

| Fitur | Spesifikasi |
|-------|-------------|
| Waveform display | Render waveform untuk audio asli dan masing-masing stem |
| Playback kontrol | Play, Pause, Stop, Seek |
| Volume kontrol | Slider volume 0-100% per stem |
| Pan/Balance | Kontrol stereo balance per stem (opsional MVP) |
| Sync playback | Kemampuan memutar vocals + instrumental bersamaan |

**Acceptance Criteria:**
- [ ] Waveform ter-render dalam < 3 detik setelah audio tersedia
- [ ] Play/Pause berfungsi untuk masing-masing stem
- [ ] Volume slider berfungsi real-time
- [ ] Seek bar mengikuti posisi playback

### 3.5 FR-005: Stem Mixer
**Prioritas:** P1 (High)  
**Deskripsi:** Pengguna dapat mengatur volume masing-masing stem dan membuat mix kustom sebelum download. Mix kustom dilakukan **client-side** menggunakan Web Audio API (`OfflineAudioContext`) — tidak memerlukan re-processing di server.

| Kontrol | Range | Default |
|---------|-------|---------|
| Vocals Volume | 0% - 150% | 100% |
| Instrumental Volume | 0% - 150% | 100% |
| Master Volume | 0% - 100% | 100% |

> **Implementasi Custom Mix [R5]:** Mix kustom di-render oleh Web Audio API di browser menggunakan gain node per stem. Hasil export ke file WAV dilakukan via `OfflineAudioContext` di sisi klien, tanpa roundtrip ke server.

**Acceptance Criteria:**
- [ ] Perubahan volume terdengar real-time saat playback
- [ ] Mix kustom dapat di-preview sebelum export
- [ ] Export custom mix berfungsi menghasilkan file WAV yang dapat diunduh (client-side)
- [ ] Reset button untuk kembali ke default (100%)

### 3.6 FR-006: Download Hasil
**Prioritas:** P0 (Critical)  
**Deskripsi:** Pengguna dapat mengunduh hasil separasi secara individual atau sebagai mix kustom.

| Opsi Download | Format | Sumber | Keterangan |
|---------------|--------|--------|------------|
| Vocals only | WAV / MP3 | Server | File vokal terisolasi (`vocals.wav`) |
| Instrumental only | WAV / MP3 | Server | File instrumental tanpa vokal (`no_vocals.wav`) |
| Custom Mix | WAV | Client-side (Web Audio API) | Mix berdasarkan pengaturan mixer, di-export oleh browser |
| ZIP Bundle | ZIP | Server | Semua stem (vocals + no_vocals) dalam satu file ZIP |

**Acceptance Criteria:**
- [ ] Download vocals dan instrumental berfungsi via endpoint server
- [ ] Download ZIP bundle berfungsi dan berisi kedua file stem
- [ ] Custom mix dapat di-export dari browser tanpa request ke server
- [ ] Nama file download mengandung timestamp atau task ID
- [ ] File hasil di server dihapus otomatis setelah 24 jam (cleanup)

### 3.7 FR-007: Error Handling & Validation
**Prioritas:** P1 (High)  
**Deskripsi:** Sistem menangani error dengan graceful dan memberikan feedback yang jelas ke pengguna.

| Skenario Error | Pesan ke Pengguna | Tindakan |
|----------------|-------------------|----------|
| Format tidak didukung | "Format file tidak didukung. Gunakan MP3, WAV, FLAC, atau M4A." | Tolak upload |
| File MP3/M4A terlalu besar | "Ukuran file melebihi 50 MB." | Tolak upload |
| File WAV/FLAC terlalu besar | "Ukuran file melebihi 200 MB." | Tolak upload |
| Durasi terlalu panjang | "Durasi file melebihi 10 menit. Coba potong file terlebih dahulu." | Tolak upload |
| File corrupt | "File audio tidak dapat dibaca. Pastikan file tidak corrupt." | Tolak processing |
| Processing timeout | "Processing terlalu lama. Coba dengan file yang lebih pendek." | Batalkan & cleanup |
| Out of memory | "Memori tidak cukup. Tutup aplikasi lain dan coba lagi." | Batalkan & cleanup |
| Model load gagal | "Gagal memuat model AI. Periksa koneksi internet (first run)." | Retry atau fallback |
| Task tidak ditemukan | "Task tidak ditemukan atau sudah kedaluwarsa (> 24 jam)." | Arahkan ke upload baru |

---

## 4. Non-Functional Requirements

### 4.1 Performance
| Metrik | Target | Catatan |
|--------|--------|---------|
| Upload & queue response | < 2 detik | POST upload langsung return task_id |
| Processing time (CPU) | **< 3x real-time** (estimasi) | Lagu 3 menit ≈ 6-9 menit di CPU laptop; sebelumnya "< 2x" tidak realistis untuk htdemucs_ft |
| Waveform render | < 3 detik | Setelah file tersedia |
| First paint (UI) | < 2 detik | Setelah halaman dimuat |
| API response (non-AI) | < 200 ms | Health check, status polling, dll |
| Polling interval | 3 detik | FE polling GET /tasks/{id} setiap 3 detik |

### 4.2 Scalability
- **Current (MVP):** Single user, single file processing, background thread
- **Future:** Queue system (Celery + Redis) untuk handle multiple concurrent requests

### 4.3 Reliability
- Processing harus idempoten — retry dengan file yang sama menghasilkan output identik
- **Task state disimpan di `metadata.json`** per task — tahan terhadap server restart (menggantikan in-memory dictionary yang volatile)
- Auto-cleanup file temporary setelah 24 jam
- Graceful shutdown — proses yang sedang berjalan harus selesai atau di-cancel dengan bersih

### 4.4 Security
- **No data leaves the machine** — semua processing lokal
- File upload hanya diterima dari origin yang sama (CORS strict)
- Validasi file type menggunakan **magic bytes** (bukan hanya extension)
- Rate limiting pada endpoint upload: **opsional untuk MVP** (local single-user app); direkomendasikan jika di-deploy ke jaringan bersama

### 4.5 Usability
- **Zero-config deployment:** `docker compose up` dan langsung jalan
- **Responsive design:** Berfungsi di desktop (primary) dan tablet
- **Dark mode default:** UI dengan tema gelap untuk kenyamanan editing audio
- **Keyboard shortcuts:** Space (play/pause), Arrow keys (seek)
- **Estimasi waktu processing:** Ditampilkan berdasarkan durasi file dan RTF tipikal CPU

### 4.6 Maintainability
- Code coverage testing > 70% untuk backend
- TypeScript strict mode untuk frontend
- Dokumentasi API dengan OpenAPI/Swagger
- Logging terstruktur dengan level (INFO, WARNING, ERROR)

---

## 5. Technical Architecture

### 5.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        USER LAPTOP                           │
│                                                              │
│  ┌──────────────────────┐      ┌──────────────────────────┐   │
│  │   FRONTEND           │      │   BACKEND                │   │
│  │   Vite + React 19    │◄────►│   FastAPI + Uvicorn      │   │
│  │   Port: 5173         │ HTTP │   Port: 8000             │   │
│  │                      │      │                          │   │
│  │  - AudioUploader     │      │  - POST /upload          │   │
│  │  - WaveformPlayer    │      │  - GET  /tasks/{id}      │   │
│  │  - StemMixer         │      │  - GET  /download/{id}/  │   │
│  │  - DownloadManager   │      │  - GET  /health          │   │
│  │  - PollingService    │      │  - DELETE /tasks/{id}    │   │
│  └──────────────────────┘      └──────────────────────────┘   │
│                                         │                    │
│                                         ▼                    │
│                              ┌──────────────────────┐        │
│                              │   AI ENGINE          │        │
│                              │   Demucs v4 (CPU)    │        │
│                              │   ThreadPoolExecutor │        │
│                              │   Model: htdemucs_ft │        │
│                              └──────────────────────┘        │
│                                         │                    │
│                              ┌──────────┴──────────┐       │
│                              ▼                     ▼       │
│                        ┌──────────┐          ┌──────────────┐ │
│                        │ uploads/ │          │  outputs/    │ │
│                        │ (input)  │          │  (result +   │ │
│                        └──────────┘          │  metadata)   │ │
│                                              └──────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Technology Stack

#### Frontend
| Komponen | Teknologi | Versi | Alasan |
|----------|-----------|-------|--------|
| Build Tool | Vite | 6.x | Hot reload cepat, native ESM |
| Framework | React | 19.x | Komponen-based, ecosystem besar |
| Language | TypeScript | 5.4+ | Type safety, DX baik |
| Styling | Tailwind CSS | 4.x | Utility-first, rapid development |
| State Management | Zustand | 4.x | Lightweight, minimal boilerplate |
| HTTP Client | Axios | 1.7+ | Interceptor, upload progress |
| Audio Viz | Wavesurfer.js | 7.x+ | Waveform rendering, Web Audio API |
| Audio Export | OfflineAudioContext (native) | - | Client-side custom mix rendering tanpa server |
| Animation | Framer Motion | 11.x | Smooth UI transitions |
| Icons | Lucide React | latest | Consistent icon set |

#### Backend
| Komponen | Teknologi | Versi | Alasan |
|----------|-----------|-------|--------|
| Framework | FastAPI | 0.111+ | Async, auto-docs, performant |
| Server | Uvicorn | 0.30+ | ASGI server, hot reload |
| AI Model | Demucs | 4.1.0a2 | State-of-the-art source separation |
| ML Framework | PyTorch (CPU) | 2.3+ | Backend untuk Demucs |
| Audio I/O | TorchAudio | 2.3+ | Audio processing |
| Media Tool | FFmpeg | 6.x+ | Audio decoding/encoding & magic byte validation |
| Background Thread | `ThreadPoolExecutor` (stdlib) | - | Async processing untuk MVP tanpa Celery |
| Scheduler | APScheduler | 3.x | Auto-cleanup file setelah 24 jam |
| Task Queue | Celery (future) | 5.4+ | Async processing multi-user |
| Message Broker | Redis (future) | 7.x+ | Celery broker |

#### Infrastructure
| Komponen | Teknologi | Alasan |
|----------|-----------|--------|
| Containerization | Docker + Docker Compose | Consistent environment, one-command deploy |
| Base Image (FE) | Node 20 Alpine | Lightweight, LTS |
| Base Image (BE) | Python 3.11 Slim | Stable, compatible dengan Demucs |
| Reverse Proxy | Nginx (future) | Static file serving, SSL |

### 5.3 Data Flow

```
1. USER → Upload audio file (drag & drop)
   ↓
2. FRONTEND → Validasi format (magic bytes), ukuran per format, durasi
   ↓
3. FRONTEND → POST /api/v1/upload (multipart/form-data)
   ↓
4. BACKEND → Simpan file ke ./uploads/{task_id}/
            → Tulis metadata.json awal (status: "queued")
            → Submit task ke ThreadPoolExecutor
            → Return { task_id, status: "queued" } SEGERA (< 2 detik)
   ↓
5. FRONTEND → Mulai polling GET /api/v1/tasks/{task_id} setiap 3 detik
   ↓
6. [BACKGROUND] BACKEND → Update metadata.json (status: "processing")
                         → Panggil Demucs CLI (subprocess)
   ↓
7. [BACKGROUND] AI ENGINE → Process audio (CPU inference, ~3x real-time)
   ↓
8. [BACKGROUND] BACKEND → Simpan hasil ke ./outputs/{task_id}/
                         → Update metadata.json (status: "completed")
   ↓
9. FRONTEND → Polling mendeteksi status "completed" → hentikan polling
            → Tampilkan waveform & kontrol playback
   ↓
10. USER → Play/preview stems, adjust mixer (Web Audio API)
          → Download: vocals/instrumental via server, custom mix via browser
```

### 5.4 API Specification

#### Endpoint: Upload & Queue Task
```
POST /api/v1/upload
Content-Type: multipart/form-data

Request:
  file: File
        MP3/M4A: max 50MB | WAV/FLAC: max 200MB | Durasi: max 10 menit

Response 200 (task di-queue, tidak menunggu selesai):
  {
    "task_id": "uuid-string",
    "status": "queued",
    "filename": "song.mp3",
    "duration_seconds": 180,
    "estimated_processing_seconds": 540,
    "message": "File berhasil diupload. Processing dimulai."
  }

Response 400:
  {
    "detail": "Format file tidak didukung. Gunakan MP3, WAV, FLAC, atau M4A."
  }

Response 413:
  {
    "detail": "Ukuran file melebihi batas. MP3/M4A: 50 MB, WAV/FLAC: 200 MB."
  }

Response 422:
  {
    "detail": "Durasi file melebihi 10 menit."
  }

Response 500:
  {
    "detail": "Gagal memulai processing: [error message]"
  }
```

#### Endpoint: Status Task (Polling)
```
GET /api/v1/tasks/{task_id}

Path Parameters:
  task_id: string (UUID)

Response 200 — saat processing:
  {
    "task_id": "uuid-string",
    "status": "processing",
    "filename": "song.mp3",
    "duration_seconds": 180,
    "elapsed_seconds": 45,
    "estimated_remaining_seconds": 495,
    "progress_pct": null
  }

Response 200 — saat selesai:
  {
    "task_id": "uuid-string",
    "status": "completed",
    "filename": "song.mp3",
    "duration_seconds": 180,
    "processing_time_seconds": 540.0,
    "stems": {
      "vocals": {
        "url": "/api/v1/download/{task_id}/vocals",
        "format": "wav",
        "size_bytes": 31752000
      },
      "no_vocals": {
        "url": "/api/v1/download/{task_id}/no_vocals",
        "format": "wav",
        "size_bytes": 31752000
      }
    },
    "expires_at": "2026-08-18T01:27:00Z"
  }

Response 200 — saat gagal:
  {
    "task_id": "uuid-string",
    "status": "failed",
    "error": "Processing gagal: file corrupt atau format tidak didukung."
  }

Response 404:
  {
    "detail": "Task tidak ditemukan atau sudah kedaluwarsa."
  }
```

#### Endpoint: Download Stem
```
GET /api/v1/download/{task_id}/{stem}

Path Parameters:
  task_id: string (UUID)
  stem: enum ["vocals", "no_vocals"]

Response 200:
  Content-Type: audio/wav
  Content-Disposition: attachment; filename="{task_id}_{stem}.wav"
  [binary audio data]

Response 404:
  {
    "detail": "File tidak ditemukan atau task belum selesai."
  }
```

#### Endpoint: Download ZIP Bundle
```
GET /api/v1/download/{task_id}/zip

Response 200:
  Content-Type: application/zip
  Content-Disposition: attachment; filename="{task_id}_stems.zip"
  [binary zip — berisi vocals.wav dan no_vocals.wav]

Response 404:
  {
    "detail": "File tidak ditemukan atau task belum selesai."
  }
```

#### Endpoint: Health Check
```
GET /api/v1/health

Response 200:
  {
    "status": "ok",
    "version": "1.1.0",
    "gpu_available": false,
    "model_loaded": "htdemucs_ft",
    "uptime_seconds": 3600
  }
```

#### Endpoint: Cleanup (Admin/Dev)
```
DELETE /api/v1/tasks/{task_id}

Response 200:
  {
    "message": "Task dan file terkait berhasil dihapus."
  }
```

### 5.5 Database / Storage

**Tidak ada database relasional untuk MVP.** Semua state disimpan dalam:
- **File system** untuk audio files (`uploads/` dan `outputs/`)
- **`metadata.json`** per task — menggantikan in-memory dictionary, tahan terhadap server restart
- **Redis** (future) untuk persistent queue dan caching

> **Catatan Persistensi [R6]:** State task disimpan dalam `metadata.json` di folder `outputs/{task_id}/`. Backend membaca file ini saat menerima request status polling. In-memory dictionary pada versi sebelumnya akan kehilangan state saat server restart — hal ini telah diperbaiki.

**File Structure:**
```
backend/
├── uploads/
│   └── {task_id}/
│       └── input.mp3           # File asli
├── outputs/
│   └── {task_id}/
│       ├── vocals.wav          # Stem vokal (label UI: "Vocals")
│       ├── no_vocals.wav       # Stem instrumental (label UI: "Instrumental")
│       └── metadata.json       # State task (status, timestamps, ukuran, dll)
```

**Contoh `metadata.json`:**
```json
{
  "task_id": "uuid-string",
  "filename": "song.mp3",
  "status": "completed",
  "duration_seconds": 180,
  "processing_time_seconds": 540.0,
  "created_at": "2026-08-17T01:27:00Z",
  "completed_at": "2026-08-17T01:36:00Z",
  "expires_at": "2026-08-18T01:27:00Z",
  "stems": {
    "vocals": { "file": "vocals.wav", "size_bytes": 31752000 },
    "no_vocals": { "file": "no_vocals.wav", "size_bytes": 31752000 }
  }
}
```

---

## 6. User Interface Requirements

### 6.1 Wireframe Description

#### Halaman Utama — Upload State
```
┌────────────────────────────────────────────────────────────┐
│  🎙️ Vocal Remover                                    [?]   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│                                                            │
│              ┌─────────────────────────────┐               │
│              │                             │               │
│              │    📤 Drop audio file       │               │
│              │       atau klik untuk        │               │
│              │       memilih file           │               │
│              │                             │               │
│              │  MP3 • WAV • FLAC • M4A    │               │
│              │  Maksimal 50 MB            │               │
│              └─────────────────────────────┘               │
│                                                            │
│              [ MP3  •  WAV  •  FLAC  •  M4A ]             │
│                                                            │
│  ────────────────────────────────────────────────────────  │
│  💡 Tips: Proses 1 menit audio membutuhkan ~30-90 detik   │
│           di CPU laptop modern.                           │
└────────────────────────────────────────────────────────────┘
```

#### Halaman Utama — Processing State
```
┌────────────────────────────────────────────────────────────┐
│  🎙️ Vocal Remover                                    [?]   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🎵 my_song.mp3  —  3:45                                   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │████████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░│   │
│  └────────────────────────────────────────────────────┘   │
│  Memproses audio... 45%  (~2 menit tersisa)               │
│                                                            │
│  [ Batalkan ]                                              │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

#### Halaman Utama — Result State
```
┌────────────────────────────────────────────────────────────┐
│  🎙️ Vocal Remover                                    [?]   │
├────────────────────────────────────────────────────────────┤
│                                                            │
│  🎵 my_song.mp3  —  3:45                                   │
│                                                            │
│  ─── Waveform Original ─────────────────────────────────   │
│  ═══════════════════════════════════════════════════════   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │  🎤 VOCALS                              [▶] [━━━] │   │
│  │  ══════════════════════════════════════════════════ │   │
│  │  Volume: [━━━━━━●━━━━━━] 100%                      │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  ┌────────────────────────────────────────────────────┐   │
│  │  🎸 INSTRUMENTAL                        [▶] [━━━] │   │
│  │  ══════════════════════════════════════════════════ │   │
│  │  Volume: [━━━━━━●━━━━━━] 100%                      │   │
│  └────────────────────────────────────────────────────┘   │
│                                                            │
│  [🔊 Play All]  [⏹ Stop]                                   │
│                                                            │
│  ┌──────────────┐ ┌──────────────┐ ┌──────────────────┐   │
│  │ ⬇ Vocals     │ │ ⬇ Instrum.   │ │ ⬇ Custom Mix     │   │
│  │   (WAV)      │ │   (WAV)      │ │   (WAV)          │   │
│  └──────────────┘ └──────────────┘ └──────────────────┘   │
│                                                            │
│  [🔄 Proses File Baru]                                     │
└────────────────────────────────────────────────────────────┘
```

### 6.2 Design System

#### Color Palette (Dark Theme)
| Token | Hex | Usage |
|-------|-----|-------|
| `--bg-primary` | `#0f172a` | Background utama |
| `--bg-card` | `#1e293b` | Card/panel background |
| `--bg-hover` | `#334155` | Hover state |
| `--accent-primary` | `#06b6d4` | Primary action (cyan) |
| `--accent-secondary` | `#8b5cf6` | Secondary (purple) |
| `--accent-success` | `#10b981` | Success state (green) |
| `--accent-warning` | `#f59e0b` | Warning (amber) |
| `--accent-error` | `#ef4444` | Error (red) |
| `--text-primary` | `#f1f5f9` | Heading, primary text |
| `--text-secondary` | `#94a3b8` | Body, description |
| `--border` | `#334155` | Borders, dividers |

#### Typography
| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| H1 | 24px | 700 | Page title |
| H2 | 18px | 600 | Section title |
| H3 | 14px | 600 | Card title |
| Body | 13px | 400 | Description, labels |
| Caption | 11px | 400 | Hints, metadata |
| Mono | 12px | 400 | Code, durations |

#### Spacing
- Base unit: 4px
- Card padding: 20px (5 units)
- Section gap: 24px (6 units)
- Border radius: 12px (cards), 8px (buttons), 999px (pills)

### 6.3 Responsive Breakpoints
| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | < 640px | Single column, stacked |
| Tablet | 640-1024px | Single column, wider |
| Desktop | > 1024px | Centered container, max-width 900px |

**Primary target: Desktop (1024px+)** — karena audio editing lebih nyaman di layar besar.

---

## 7. Development Plan & Milestones

### 7.1 Phase 1: Foundation (Week 1-2)
**Goal:** Project setup, Docker, dan basic API

| Task | Estimasi | Owner |
|------|----------|-------|
| Setup repository & project structure | 1 hari | Dev |
| Create Docker Compose configuration | 1 hari | Dev |
| Setup Vite + React + Tailwind frontend | 1 hari | FE Dev |
| Setup FastAPI + Demucs backend | 2 hari | BE Dev |
| Implement health check endpoint | 0.5 hari | BE Dev |
| Basic file upload endpoint (async, return task_id) | 1 hari | BE Dev |
| Task state via metadata.json | 0.5 hari | BE Dev |
| Integrate Demucs CLI processing (background thread) | 2 hari | BE Dev |
| Status polling endpoint (GET /tasks/{id}) | 0.5 hari | BE Dev |
| Basic upload UI component | 1 hari | FE Dev |

**Deliverable:** `docker compose up` berhasil, upload file → return task_id → proses di background thread → status bisa di-poll via GET /tasks/{id}.

### 7.2 Phase 2: Core Features (Week 3-4)
**Goal:** Waveform, playback, polling UI, download, dan custom mix

| Task | Estimasi | Owner |
|------|----------|-------|
| Integrate Wavesurfer.js | 2 hari | FE Dev |
| Audio playback kontrol (play/pause/seek) | 2 hari | FE Dev |
| Stem mixer UI (volume sliders) | 1 hari | FE Dev |
| Polling service di frontend (Zustand + interval) | 1 hari | FE Dev |
| Download endpoint & UI (vocals, no_vocals, ZIP) | 1 hari | BE/FE Dev |
| Custom mix export via Web Audio API (client-side) | 1.5 hari | FE Dev |
| Progress tracking & status UI | 1 hari | FE Dev |
| Error handling & toast notifications | 1 hari | FE Dev |
| File cleanup (auto-delete after 24h, APScheduler) | 0.5 hari | BE Dev |

**Deliverable:** User dapat upload → polling status → lihat waveform → play stems → download hasil / custom mix.

### 7.3 Phase 3: Polish & QA (Week 5)
**Goal:** UI refinement, testing, dan dokumentasi

| Task | Estimasi | Owner |
|------|----------|-------|
| Dark theme refinement | 1 hari | FE Dev |
| Loading states & skeleton screens | 1 hari | FE Dev |
| Keyboard shortcuts | 0.5 hari | FE Dev |
| Unit tests (backend) | 2 hari | BE Dev |
| Integration tests | 1 hari | QA/Dev |
| README & setup documentation | 1 hari | Dev |
| Performance optimization | 1 hari | Dev |

**Deliverable:** MVP siap digunakan, dokumentasi lengkap, test coverage > 70%.

### 7.4 Phase 4: Future Enhancements (Post-MVP)
| Feature | Priority | Effort |
|---------|----------|--------|
| Celery + Redis async queue (multi-user) | P1 | Medium |
| 4-stem separation | P2 | Low |
| Batch processing | P2 | Medium |
| PWA support | P2 | Medium |
| Server-side custom mix rendering | P2 | Medium |
| Cloud GPU deployment option | P2 | High |
| User authentication & history | P3 | High |
| Real-time preview (DSP) | P3 | High |

### 7.5 Gantt Chart (Simplified)

```
Week:    1    2    3    4    5
         ├────┼────┼────┼────┤
Phase 1: ████████████
Phase 2:           ████████████
Phase 3:                         ████████████
         ▲
         MVP Release
```

---

## 8. Risk Assessment

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| **Demucs terlalu lambat di CPU** | High | High | Informasikan ekspektasi waktu (~3x real-time) di UI sebelum proses; fallback ke model lebih ringan; rekomendasikan GPU untuk production |
| **File audio corrupt / tidak standar** | Medium | Medium | Validasi file dengan FFmpeg magic bytes; try-catch robust; pesan error yang informatif |
| **RAM tidak cukup saat processing** | Medium | High | Cek available memory sebelum processing; batalkan dengan graceful; rekomendasikan tutup aplikasi lain |
| **Docker image terlalu besar** | Medium | Low | Gunakan Python slim base; multi-stage build; pre-download model saat build |
| **Server restart kehilangan task state** | Low | Medium | State disimpan di metadata.json (bukan in-memory); task dapat di-recover dari file system |
| **CORS issue saat development** | Low | Low | Konfigurasi CORS eksplisit; dokumentasikan troubleshooting |
| **Model Demucs tidak compatible** | Low | High | Pin versi dependency; test di berbagai environment; fallback model |
| **Browser tidak support audio format** | Low | Medium | Convert ke WAV untuk playback; deteksi browser capability |
| **OfflineAudioContext memory limit** | Low | Medium | Batasi custom mix export untuk file < 10 menit; informasikan limitasi ke pengguna |

---

## 9. Open Questions

1. **Apakah perlu support untuk file stereo vs mono?** Demucs default stereo — mono mungkin perlu upsampling.
2. **Berapa lama file hasil disimpan?** MVP: 24 jam auto-cleanup. Future: persistent storage dengan auth.
3. **Apakah perlu support untuk sample rate non-44.1kHz?** Demucs resample otomatis, tapi perlu konfirmasi kualitas.
4. **Bagaimana handle file dengan metadata (ID3 tags, cover art)?** Keputusan: strip metadata untuk simplicity, tidak di-preserve ke output.
5. **Progress granular dari Demucs?** Demucs CLI tidak expose progress percentage — progress bar di UI bersifat indeterminate (animasi) dengan estimasi waktu berdasarkan RTF. Dapat dikembangkan dengan parsing stderr Demucs di future release.
6. **Apakah custom mix export via OfflineAudioContext cukup untuk file 10 menit?** Perlu validasi memori browser; jika terlalu berat, batas durasi untuk custom mix export dapat diturunkan ke 5 menit.

---

## 10. Appendix

### 10.1 Glossary
| Term | Definition |
|------|------------|
| **Stem** | Komponen individual dari mix audio (vocal, drums, bass, dll) |
| **SDR** | Signal-to-Distortion Ratio — metrik kualitas separasi audio |
| **Demucs** | Deep learning model untuk music source separation oleh Meta AI |
| **RTF** | Real-Time Factor — rasio waktu processing vs durasi audio |
| **ONNX** | Open Neural Network Exchange — format model AI universal |
| **CORS** | Cross-Origin Resource Sharing — kebijakan browser untuk request antar domain |
| **magic bytes** | Byte pertama dari file yang mengidentifikasi format sebenarnya (bukan ekstensi) |
| **OfflineAudioContext** | Web Audio API bawaan browser untuk render audio ke buffer tanpa playback |
| **ThreadPoolExecutor** | Komponen Python stdlib untuk menjalankan task di background thread |

### 10.2 References
- Demucs GitHub: https://github.com/facebookresearch/demucs
- FastAPI Documentation: https://fastapi.tiangolo.com
- Wavesurfer.js Documentation: https://wavesurfer-js.org
- HT-Demucs FT Benchmark: https://github.com/adefossez/demucs
- Web Audio API (OfflineAudioContext): https://developer.mozilla.org/en-US/docs/Web/API/OfflineAudioContext

### 10.3 Revision History
| Versi | Tanggal | Author | Perubahan |
|-------|---------|--------|-----------|
| 1.0 | 2026-08-17 | Product Team | Initial PRD |
| 1.1 | 2026-08-17 | Product Team | [R1] Processing async (background thread + polling); [R2] Tambah endpoint GET /tasks/{id}; [R3] Konvensi nama stem (API: no_vocals, UI: Instrumental); [R4] Processing time diselaraskan ke < 3x real-time; [R5] Custom mix via client-side Web Audio API; [R6] State task persistent via metadata.json; [R7] Rate limiting diturunkan ke opsional (MVP single-user); [R8] Batas ukuran file dipisah per format (MP3/M4A 50MB, WAV/FLAC 200MB) |
| 1.2 | 2026-08-17 | Product Team | [R9] Menambahkan fitur YouTube to MP3 Converter terintegrasi dengan yt-dlp; [R10] Migrasi ke Arsitektur Cloud-Native dengan PostgreSQL untuk persistensi metadata (menggantikan metadata.json); [R11] Migrasi ke Object Storage menggunakan MinIO (S3-compatible) dengan sistem Presigned URL untuk performa unduhan optimal dan meringankan beban backend. |

---

## 11. Cloud-Native & Advanced Features (Phase 7 & 8)

### 11.1 YouTube to MP3 Converter
- **Deskripsi**: Fitur untuk mendownload audio dari YouTube secara langsung.
- **Teknologi**: Menggunakan `yt-dlp` di dalam background thread. Mengatasi proteksi HTTP 403 dengan integrasi argumen ekstraktor `--extractor-args youtube:player_client=android` dan caching management yang baik.
- **UI**: Halaman dedikasi "Youtube To MP3" di Sidebar (grup Menu). Menggunakan progress bar (Zustand store terpisah) dan dropdown pemilih Bitrate (128, 192, 320 kbps).

### 11.2 PostgreSQL & SQLAlchemy
- **Deskripsi**: Semua manajemen status tugas (ID, status, progress, waktu, dsb.) dipindahkan dari file teks lokal (`metadata.json`) ke PostgreSQL.
- **Skema**: Tabel `tasks` tunggal yang menyimpan kolom ID, status, tipe tugas (demucs/youtube), dan kolom JSONB (`meta_data`) untuk fleksibilitas struktural yang dinamis.

### 11.3 MinIO Object Storage
- **Deskripsi**: Seluruh hasil pemrosesan (Vocals, Instrumental, MP3 YouTube) diunggah (upload) dari direktori sementara server ke *bucket* MinIO lokal.
- **Presigned URLs**: Endpoint unduhan FastAPI kini mengembalikan `307 Temporary Redirect` bersama *S3 Presigned URL*. Frontend dan browser secara otomatis mengikuti URL tersebut untuk menarik file dari MinIO, menghilangkan beban streaming bandwidth 100% dari instance FastAPI.

---

**End of Document**

