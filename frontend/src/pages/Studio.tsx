import React, { useRef, useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { AudioUploader } from '@/components/AudioUploader';
import { DownloadManager } from '@/components/DownloadManager';
import { StemMixer } from '@/components/StemMixer';
import type { MixState } from '@/components/StemMixer';
import { WaveformPlayer } from '@/components/WaveformPlayer';
import type { WaveformPlayerRef } from '@/components/WaveformPlayer';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';

export function Studio() {
  const { taskId, status, progressData, error, setTaskId, startPolling, reset } = useAppStore();
  
  const playerRef = useRef<WaveformPlayerRef>(null);
  
  const [mixState, setMixState] = useState<MixState>({
    vocals: { volume: 1, muted: false },
    instrumental: { volume: 1, muted: false }
  });
  
  useEffect(() => {
    if (playerRef.current) {
      // Menggunakan 0.0001 daripada 0 mutlak untuk mencegah browser men-suspend audio engine
      const safeVocalsVolume = mixState.vocals.muted || mixState.vocals.volume === 0 
        ? 0.0001 
        : mixState.vocals.volume;
        
      const safeInstVolume = mixState.instrumental.muted || mixState.instrumental.volume === 0 
        ? 0.0001 
        : mixState.instrumental.volume;

      playerRef.current.setVocalsVolume(safeVocalsVolume);
      playerRef.current.setInstrumentalVolume(safeInstVolume);
    }
  }, [mixState]);

  // Resume polling jika halaman di-reload saat proses sedang berjalan
  useEffect(() => {
    if (taskId && (status === 'queued' || status === 'processing')) {
      startPolling(taskId);
    }
  }, []);

  const handleTaskQueued = (id: string) => {
    startPolling(id);
  };

  return (
    <div className="w-full h-full flex flex-col pt-4 md:pt-10">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60 tracking-tight mb-4">
          Vocal <span className="text-transparent bg-clip-text bg-gradient-to-br from-accent-primary to-accent-warning">Remover</span>
        </h1>
        <p className="text-text-secondary text-base md:text-lg max-w-2xl mx-auto">
          Pisahkan instrumen dan vokal dari audio Anda secara ajaib menggunakan teknologi AI <span className="text-white font-medium">Demucs</span>.
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center p-2 md:p-6 w-full">
        {(!taskId || status === 'idle') && (
          <AudioUploader onTaskQueued={handleTaskQueued} />
        )}

        {(status === 'queued' || status === 'processing' || status === 'paused') && (
          <div className="w-full max-w-xl text-center">
            {/* Audio Equalizer Animation */}
            <div className={`flex items-end justify-center space-x-1 h-12 mb-6 ${status === 'paused' ? 'opacity-50 grayscale' : ''}`}>
              <div className="w-2 bg-accent-primary rounded-t-sm animate-equalizer"></div>
              <div className="w-2 bg-accent-secondary rounded-t-sm animate-equalizer animation-delay-200"></div>
              <div className="w-2 bg-accent-primary rounded-t-sm animate-equalizer animation-delay-400"></div>
              <div className="w-2 bg-accent-secondary rounded-t-sm animate-equalizer animation-delay-100"></div>
              <div className="w-2 bg-accent-primary rounded-t-sm animate-equalizer animation-delay-300"></div>
            </div>
            
            <h3 className="text-xl font-bold mb-2 text-text-primary">
              {status === 'queued' ? 'Menunggu Antrian...' : status === 'paused' ? 'Proses Dihentikan Sementara' : 'AI Sedang Bekerja'}
            </h3>
            <p className="text-sm text-text-secondary mb-8">
              Pemrosesan memakan waktu sekitar 3x durasi lagu. Harap jangan tutup halaman ini.
            </p>
            
            {progressData && (status === 'processing' || status === 'paused') && (
              <div className="w-full bg-background border-none rounded-xl p-6 flex flex-col items-center shadow-[0_5px_30px_rgba(255,123,84,0.05)]">
                <div className="w-full flex justify-between text-sm text-text-secondary mb-4 font-medium">
                  <span>
                    {progressData.progress_percent === 100 
                      ? 'Menyimpan file WAV...' 
                      : `Memisahkan frekuensi... ${progressData.current_pass ? `(${progressData.current_pass}/${progressData.total_passes})` : ''}`}
                  </span>
                  <span className={status === 'paused' ? 'text-text-secondary' : 'text-accent-primary font-bold'}>
                    {progressData.progress_percent || 0}%
                  </span>
                </div>
                
                <Progress value={progressData.progress_percent || 0} className={`w-full h-3 shadow-inner ${status === 'paused' ? 'opacity-50' : ''}`} />
                
                <div className="w-full flex justify-between items-center mt-6">
                  <div className="text-xs text-text-secondary opacity-70">
                    Waktu berjalan: {progressData.elapsed_seconds || 0}s
                  </div>
                  
                  <div className="flex space-x-3">
                    {status === 'processing' ? (
                      <Button onClick={() => useAppStore.getState().pauseTask()} variant="secondary" size="sm" className="rounded-full px-4">
                        Pause
                      </Button>
                    ) : (
                      <Button onClick={() => useAppStore.getState().resumeTask()} variant="default" size="sm" className="rounded-full px-4 bg-accent-primary text-white hover:bg-accent-secondary">
                        Resume
                      </Button>
                    )}
                    <Button onClick={() => useAppStore.getState().cancelTask()} variant="destructive" size="sm" className="rounded-full px-4">
                      Cancel
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {status === 'failed' && (
          <div className="w-full max-w-xl text-center p-8 border-none bg-red-500/10 rounded-2xl">
            <h3 className="text-xl font-bold mb-2 text-red-500">Proses Gagal</h3>
            <p className="text-red-400 mb-6">{error}</p>
            <Button 
              onClick={reset}
              variant="destructive"
              className="px-8 py-6 rounded-full font-bold shadow-lg"
            >
              Coba Lagi
            </Button>
          </div>
        )}

        {status === 'completed' && (
          <div className="w-full max-w-4xl flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <div className="w-full flex justify-between items-end mb-4 px-2">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Hasil Pemisahan</h2>
                <p className="text-text-secondary text-sm">Task ID: {taskId}</p>
              </div>
              <Button onClick={reset} variant="link" className="text-accent-primary hover:text-white px-0">
                + Upload Baru
              </Button>
            </div>
            
            <WaveformPlayer 
              ref={playerRef}
              vocalsUrl={`http://localhost:8000/api/v1/download/${taskId}/vocals`}
              instrumentalUrl={`http://localhost:8000/api/v1/download/${taskId}/no_vocals`}
            />
            
            <StemMixer mix={mixState} onChange={setMixState} />
            
            <DownloadManager taskId={taskId!} mixState={mixState} />
          </div>
        )}
      </div>
    </div>
  );
}
