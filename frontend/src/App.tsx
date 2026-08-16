import React, { useEffect, useRef, useState } from 'react'
import { AudioUploader } from '@/components/AudioUploader'
import { WaveformPlayer, type WaveformPlayerRef } from '@/components/WaveformPlayer'
import { StemMixer, type MixState } from '@/components/StemMixer'
import { DownloadManager } from '@/components/DownloadManager'
import { useAppStore } from '@/store/useAppStore'
import { Toaster } from 'sonner'
import { Loader2, AlertCircle } from 'lucide-react'

function App() {
  const { taskId, status, progressData, error, setTaskId, startPolling, reset } = useAppStore()
  
  const playerRef = useRef<WaveformPlayerRef>(null)
  
  const [mixState, setMixState] = useState<MixState>({
    vocals: { volume: 1, muted: false },
    instrumental: { volume: 1, muted: false }
  })

  useEffect(() => {
    if (playerRef.current) {
      playerRef.current.setVocalsVolume(mixState.vocals.muted ? 0 : mixState.vocals.volume)
      playerRef.current.setInstrumentalVolume(mixState.instrumental.muted ? 0 : mixState.instrumental.volume)
    }
  }, [mixState])

  const handleTaskQueued = (id: string) => {
    startPolling(id)
  }

  const renderContent = () => {
    if (!taskId || status === 'idle') {
      return <AudioUploader onTaskQueued={handleTaskQueued} />
    }

    if (status === 'queued' || status === 'processing') {
      return (
        <div className="p-8 border border-border rounded-xl bg-card w-full max-w-2xl text-center flex flex-col items-center">
          {/* Audio Equalizer Animation */}
          <div className="flex items-end justify-center space-x-1 h-12 mb-6">
            <div className="w-2 bg-primary rounded-t-sm animate-equalizer"></div>
            <div className="w-2 bg-accent-secondary rounded-t-sm animate-equalizer animation-delay-200"></div>
            <div className="w-2 bg-primary rounded-t-sm animate-equalizer animation-delay-400"></div>
            <div className="w-2 bg-accent-secondary rounded-t-sm animate-equalizer animation-delay-100"></div>
            <div className="w-2 bg-primary rounded-t-sm animate-equalizer animation-delay-300"></div>
          </div>
          
          <h3 className="text-xl font-semibold mb-2 text-text-primary">
            {status === 'queued' ? 'Menunggu Antrian...' : 'Memisahkan Audio...'}
          </h3>
          <p className="text-text-secondary mb-6">
            Menggunakan model AI Demucs (CPU). Proses ini memakan waktu sekitar 3x durasi audio.
          </p>
          
          {progressData && status === 'processing' && (
            <div className="w-full bg-background border border-border rounded-lg p-5 flex flex-col items-center">
              <div className="w-full flex justify-between text-sm text-text-secondary mb-2">
                <span>
                  {progressData.progress_percent === 100 
                    ? 'Menyimpan file WAV (harap tunggu)...' 
                    : 'Memisahkan audio...'}
                </span>
                <span className="font-medium text-primary">{progressData.progress_percent || 0}%</span>
              </div>
              <div className="w-full h-2 bg-border rounded-full overflow-hidden">
                <div 
                  className="h-full bg-primary transition-all duration-500 ease-out" 
                  style={{ width: `${progressData.progress_percent || 0}%` }}
                ></div>
              </div>
              <div className="w-full flex justify-between text-xs text-text-secondary mt-3 opacity-70">
                <span>Waktu berjalan: {progressData.elapsed_seconds}s</span>
              </div>
            </div>
          )}
        </div>
      )
    }

    if (status === 'failed') {
      return (
        <div className="p-8 border border-error/50 bg-error/10 rounded-xl w-full max-w-2xl text-center flex flex-col items-center">
          <AlertCircle className="w-12 h-12 text-error mb-4" />
          <h3 className="text-xl font-semibold mb-2 text-error">Proses Gagal</h3>
          <p className="text-error/80 mb-6">{error}</p>
          <button 
            onClick={reset}
            className="px-6 py-2 bg-error text-white rounded-md hover:bg-error/90 font-medium"
          >
            Coba Lagi
          </button>
        </div>
      )
    }

    if (status === 'completed') {
      return (
        <div className="w-full max-w-4xl flex flex-col items-center">
          <div className="w-full flex justify-between items-end mb-4 px-2">
            <div>
              <h2 className="text-2xl font-bold text-text-primary">Hasil Pemisahan</h2>
              <p className="text-text-secondary text-sm">Task ID: {taskId}</p>
            </div>
            <button onClick={reset} className="text-sm text-primary hover:underline font-medium">
              + Upload Baru
            </button>
          </div>
          
          <WaveformPlayer 
            ref={playerRef}
            vocalsUrl={`http://localhost:8000/api/v1/download/${taskId}/vocals`}
            instrumentalUrl={`http://localhost:8000/api/v1/download/${taskId}/no_vocals`}
          />
          
          <StemMixer mix={mixState} onChange={setMixState} />
          
          <DownloadManager taskId={taskId} mixState={mixState} />
        </div>
      )
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-text-primary">
      <Toaster theme="dark" position="top-center" />
      
      <header className="border-b border-border bg-card p-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold flex items-center gap-2">
            <span className="text-primary">Vocal</span>Remover
          </h1>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-6 w-full max-w-5xl mx-auto">
        {status === 'idle' && (
          <div className="text-center mb-8 max-w-xl px-2">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Pisahkan Vokal & Instrumen</h2>
            <p className="text-sm sm:text-base text-text-secondary">
              Unggah file audio Anda dan AI kami akan memisahkan vokal dan instrumen secara otomatis menggunakan model Demucs dengan kualitas tinggi.
            </p>
          </div>
        )}

        {renderContent()}
      </main>

      <footer className="p-4 text-center text-sm text-text-secondary border-t border-border mt-auto">
        Vocal Remover Web App MVP &copy; {new Date().getFullYear()}
      </footer>
    </div>
  )
}

export default App
