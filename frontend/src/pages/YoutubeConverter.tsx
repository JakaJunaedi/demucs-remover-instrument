import React, { useState, useEffect } from 'react';
import { useYoutubeStore } from '@/store/useYoutubeStore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { MonitorPlay, Download, Link2, Music } from 'lucide-react';

export function YoutubeConverter() {
  const { taskId, status, progressData, error, startDownload, startPolling, reset } = useYoutubeStore();
  
  const [url, setUrl] = useState('');
  const [bitrate, setBitrate] = useState('320');

  // Resume polling on reload
  useEffect(() => {
    if (taskId && (status === 'queued' || status === 'processing')) {
      startPolling(taskId);
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    startDownload(url.trim(), bitrate);
  };

  return (
    <div className="w-full h-full flex flex-col pt-4 md:pt-10">
      <div className="mb-12 text-center">
        <h1 className="text-4xl md:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-red-500 to-rose-400 tracking-tight mb-4 flex justify-center items-center gap-4">
          <svg className="w-10 h-10 text-red-500" viewBox="0 0 24 24" fill="currentColor" stroke="none">
            <path d="M22.54 6.42a2.78 2.78 0 0 0-1.94-2C18.88 4 12 4 12 4s-6.88 0-8.6.46a2.78 2.78 0 0 0-1.94 2A29 29 0 0 0 1 11.75a29 29 0 0 0 .46 5.33 2.78 2.78 0 0 0 1.94 2c1.72.46 8.6.46 8.6.46s6.88 0 8.6-.46a2.78 2.78 0 0 0 1.94-2 29 29 0 0 0 .46-5.33 29 29 0 0 0-.46-5.33z"></path>
            <polygon points="9.75 15.02 15.5 11.75 9.75 8.48 9.75 15.02" fill="white"></polygon>
          </svg>
          YouTube <span className="text-white">to MP3</span>
        </h1>
        <p className="text-text-secondary text-base md:text-lg max-w-2xl mx-auto">
          Unduh dan konversi video YouTube menjadi format audio MP3 berkualitas tinggi secara instan.
        </p>
      </div>

      <div className="flex-1 flex flex-col items-center p-2 md:p-6 w-full">
        {(!taskId || status === 'idle') && (
          <Card className="w-full max-w-2xl p-8 border-none bg-black/20 backdrop-blur-md">
            <form onSubmit={handleSubmit} className="flex flex-col space-y-6">
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary ml-1">URL Video YouTube</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Link2 className="h-5 w-5 text-text-secondary" />
                  </div>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=..."
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    required
                    className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all"
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="text-sm font-medium text-text-secondary ml-1">Kualitas Audio (Bitrate)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Music className="h-5 w-5 text-text-secondary" />
                  </div>
                  <select
                    value={bitrate}
                    onChange={(e) => setBitrate(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-background border border-border rounded-xl text-text-primary focus:outline-none focus:ring-2 focus:ring-red-500/50 focus:border-red-500 transition-all appearance-none cursor-pointer"
                  >
                    <option value="320">320 kbps (Kualitas Studio Terbak)</option>
                    <option value="256">256 kbps (Sangat Bagus)</option>
                    <option value="192">192 kbps (Standar)</option>
                    <option value="128">128 kbps (Hemat Kuota)</option>
                  </select>
                </div>
              </div>
              
              <Button 
                type="submit"
                disabled={!url.trim()}
                className="w-full py-6 text-lg font-bold rounded-xl bg-gradient-to-r from-red-600 to-red-500 hover:from-red-500 hover:to-red-400 text-white shadow-[0_8px_30px_rgba(239,68,68,0.3)] border-none transition-all"
              >
                Mulai Konversi
              </Button>
            </form>
          </Card>
        )}

        {(status === 'queued' || status === 'processing') && (
          <div className="w-full max-w-xl text-center mt-8">
            <h3 className="text-xl font-bold mb-2 text-text-primary">
              {status === 'queued' ? 'Menunggu Antrian...' : 'Sedang Mengunduh & Mengonversi'}
            </h3>
            <p className="text-sm text-text-secondary mb-8">
              Proses ini bergantung pada durasi video dan kecepatan server.
            </p>
            
            {progressData && status === 'processing' && (
              <div className="w-full bg-background border-none rounded-xl p-6 flex flex-col items-center shadow-[0_5px_30px_rgba(239,68,68,0.05)]">
                <div className="w-full flex justify-between text-sm text-text-secondary mb-4 font-medium">
                  <span>Mengekstrak Audio...</span>
                  <span className="text-red-500 font-bold">{progressData.progress_percent || 0}%</span>
                </div>
                
                <Progress value={progressData.progress_percent || 0} className="w-full h-3 shadow-inner bg-border" indicatorColor="bg-red-500" />
              </div>
            )}
          </div>
        )}

        {status === 'failed' && (
          <div className="w-full max-w-xl text-center p-8 border-none bg-red-500/10 rounded-2xl mt-8">
            <h3 className="text-xl font-bold mb-2 text-red-500">Konversi Gagal</h3>
            <p className="text-red-400 mb-6">{error}</p>
            <Button 
              onClick={reset}
              variant="destructive"
              className="px-8 py-6 rounded-full font-bold shadow-lg"
            >
              Coba Link Lain
            </Button>
          </div>
        )}

        {status === 'completed' && (
          <div className="w-full max-w-xl flex flex-col items-center mt-8 animate-in fade-in zoom-in duration-500">
            <Card className="w-full p-8 border-none bg-black/20 backdrop-blur-md flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mb-6">
                <Download className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-text-primary mb-2">Konversi Berhasil!</h2>
              <p className="text-text-secondary text-sm mb-8">
                File MP3 Anda sudah siap diunduh. Ukuran: {progressData?.file?.size_bytes ? (progressData.file.size_bytes / 1024 / 1024).toFixed(2) : 0} MB
              </p>
              
              <div className="flex flex-col w-full space-y-4">
                <Button 
                  asChild
                  className="w-full py-6 text-lg font-bold rounded-xl bg-gradient-to-r from-green-600 to-green-500 hover:from-green-500 hover:to-green-400 text-white shadow-[0_8px_30px_rgba(34,197,94,0.3)] border-none transition-all"
                >
                  <a href={`http://localhost:8000/api/v1/youtube/download/${taskId}`} download>
                    Unduh MP3 Sekarang
                  </a>
                </Button>
                
                <Button onClick={reset} variant="ghost" className="text-text-secondary hover:text-white">
                  Konversi Video Lain
                </Button>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
