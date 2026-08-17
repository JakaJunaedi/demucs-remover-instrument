import { useState, useCallback, useRef, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Music, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import WaveSurfer from 'wavesurfer.js';

export function VocalCleanup() {
  const [file, setFile] = useState<File | null>(null);
  const [taskId, setTaskId] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'uploading' | 'processing' | 'completed' | 'error'>('idle');
  
  // Create wavesurfer refs
  const originalContainerRef = useRef<HTMLDivElement>(null);
  const cleanedContainerRef = useRef<HTMLDivElement>(null);
  const wsOriginal = useRef<WaveSurfer | null>(null);
  const wsCleaned = useRef<WaveSurfer | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const selected = acceptedFiles[0];
    if (selected) {
      setFile(selected);
      setStatus('idle');
      setTaskId(null);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive, isDragReject } = useDropzone({
    onDrop,
    accept: {
      'audio/*': ['.mp3', '.wav', '.ogg', '.flac', '.m4a']
    },
    maxFiles: 1,
    multiple: false
  });

  const handleUpload = async () => {
    if (!file) return;

    setStatus('uploading');
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:8000/api/v1/cleanup', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Upload failed');

      const data = await response.json();
      setTaskId(data.task_id);
      setStatus('processing');
      pollStatus(data.task_id);
    } catch (error) {
      console.error(error);
      setStatus('error');
      toast.error('Gagal mengunggah file.');
    }
  };

  const pollStatus = (id: string) => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:8000/api/v1/tasks/${id}`);
        const data = await res.json();

        if (data.status === 'completed') {
          clearInterval(interval);
          setStatus('completed');
          toast.success('Pembersihan vokal selesai!');
        } else if (data.status === 'error') {
          clearInterval(interval);
          setStatus('error');
          toast.error('Gagal membersihkan audio.');
        }
      } catch (err) {
        clearInterval(interval);
        setStatus('error');
      }
    }, 2000);
  };

  useEffect(() => {
    if (status === 'completed' && taskId && originalContainerRef.current && cleanedContainerRef.current) {
      if (!wsOriginal.current) {
        wsOriginal.current = WaveSurfer.create({
          container: originalContainerRef.current,
          waveColor: '#475569',
          progressColor: '#94a3b8',
          height: 60,
          normalize: true,
        });
      }
      if (!wsCleaned.current) {
        wsCleaned.current = WaveSurfer.create({
          container: cleanedContainerRef.current,
          waveColor: '#ec4899',
          progressColor: '#fbcfe8',
          height: 60,
          normalize: true,
        });
        
        // Sync them
        wsOriginal.current.on('play', () => wsCleaned.current?.play());
        wsOriginal.current.on('pause', () => wsCleaned.current?.pause());
        // @ts-ignore
        wsOriginal.current.on('seeking', (time) => wsCleaned.current?.seekTo(time as number));
      }
      
      const originalUrl = URL.createObjectURL(file!);
      wsOriginal.current.load(originalUrl);
      wsCleaned.current.load(`http://localhost:8000/api/v1/download/${taskId}/cleaned`);
    }
    
    return () => {
      if (wsOriginal.current) {
        wsOriginal.current.destroy();
        wsOriginal.current = null;
      }
      if (wsCleaned.current) {
        wsCleaned.current.destroy();
        wsCleaned.current = null;
      }
    };
  }, [status, taskId, file]);

  return (
    <div className="min-h-screen pt-20 px-4 pb-24 lg:ml-64">
      <div className="max-w-4xl mx-auto flex flex-col items-center justify-center min-h-[calc(100vh-8rem)]">
        
        <div className="text-center mb-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center p-3 bg-pink-500/10 rounded-2xl mb-4">
            <Sparkles className="w-8 h-8 text-pink-500" />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4 tracking-tight">
            Vocal Cleanup
          </h1>
          <p className="text-text-secondary text-lg max-w-xl mx-auto leading-relaxed">
            Bersihkan sisa instrumen dan suara robotik (artefak) dari hasil ekstraksi vokal Anda menggunakan AI Spectral Noise Gating.
          </p>
        </div>

        {status === 'idle' || status === 'error' ? (
          <Card className="w-full max-w-2xl bg-black/40 border-white/5 backdrop-blur-xl shadow-2xl">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl font-bold text-white">Upload Audio Vokal</CardTitle>
              <CardDescription>Format yang didukung: MP3, WAV, FLAC, OGG, M4A</CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                {...getRootProps()} 
                className={cn(
                  "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all text-center cursor-pointer mt-4",
                  isDragActive ? "border-pink-500 bg-pink-500/10 scale-[1.02]" : "border-white/10 bg-black/20 hover:border-pink-500/50",
                  isDragReject || status === 'error' ? "border-red-500/50 bg-red-500/5" : ""
                )}
              >
                <input {...getInputProps()} />
                
                {isDragReject ? (
                  <AlertCircle className="w-12 h-12 text-red-500 mb-4 animate-bounce" />
                ) : (
                  <Upload className={cn(
                    "w-12 h-12 mb-4 transition-colors",
                    isDragActive ? "text-pink-500 animate-bounce" : "text-text-secondary"
                  )} />
                )}

                {file ? (
                  <div className="flex items-center space-x-3 text-pink-400 bg-pink-500/10 px-4 py-2 rounded-full">
                    <Music className="w-4 h-4" />
                    <span className="font-medium truncate max-w-[200px]">{file.name}</span>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-lg font-medium text-white">
                      {isDragActive ? "Lepaskan file di sini" : "Tarik & lepas file audio"}
                    </p>
                    <p className="text-sm text-text-secondary">
                      atau klik untuk mencari file
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-8">
                <Button 
                  onClick={handleUpload}
                  disabled={!file}
                  className="w-full h-14 text-lg font-semibold rounded-xl bg-gradient-to-r from-pink-500 to-purple-600 hover:opacity-90 transition-all shadow-[0_0_40px_rgba(236,72,153,0.3)] disabled:opacity-50 disabled:shadow-none border-0"
                >
                  <Sparkles className="w-5 h-5 mr-2" />
                  Bersihkan Vokal
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : status === 'uploading' || status === 'processing' ? (
          <div className="w-full max-w-2xl bg-black/40 border border-white/5 rounded-2xl p-12 text-center backdrop-blur-xl">
            <div className="relative w-24 h-24 mx-auto mb-8">
              <div className="absolute inset-0 bg-pink-500/20 rounded-full animate-ping"></div>
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                <Sparkles className="w-10 h-10 text-white" />
              </div>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-2">
              {status === 'uploading' ? 'Mengunggah...' : 'Membersihkan Noise...'}
            </h3>
            <p className="text-text-secondary mb-8">
              {status === 'uploading' 
                ? 'Mentransfer file ke server...' 
                : 'Menganalisis frekuensi dan menghapus artefak robotik'}
            </p>
          </div>
        ) : (
          <div className="w-full max-w-4xl flex flex-col items-center animate-in fade-in zoom-in duration-500">
            <div className="w-full flex justify-between items-end mb-4 px-2">
              <div>
                <h2 className="text-2xl font-bold text-text-primary">Hasil Pembersihan</h2>
                <p className="text-text-secondary text-sm">Bandingkan hasilnya di bawah ini</p>
              </div>
              <Button onClick={() => { setStatus('idle'); setFile(null); }} variant="link" className="text-pink-500 hover:text-white px-0">
                + Upload Baru
              </Button>
            </div>
            
            <div className="w-full space-y-4 mb-6">
              <div className="bg-black/30 border border-white/10 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-text-secondary">Original (Sebelum)</span>
                </div>
                <div ref={originalContainerRef} className="w-full" />
              </div>
              
              <div className="bg-black/30 border border-pink-500/30 rounded-xl p-4">
                <div className="flex justify-between mb-2">
                  <span className="text-sm font-medium text-pink-400 flex items-center">
                    <Sparkles className="w-4 h-4 mr-1" /> Cleaned (Sesudah)
                  </span>
                </div>
                <div ref={cleanedContainerRef} className="w-full" />
              </div>
            </div>
            
            <div className="flex gap-4 mb-8">
              <Button onClick={() => wsOriginal.current?.playPause()} variant="outline">Play/Pause Sync</Button>
              <Button 
                onClick={() => window.location.href = `http://localhost:8000/api/v1/download/${taskId}/cleaned`}
                className="bg-pink-600 hover:bg-pink-700 text-white border-0"
              >
                <Upload className="w-4 h-4 mr-2 rotate-180" />
                Download Hasil Bersih
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
