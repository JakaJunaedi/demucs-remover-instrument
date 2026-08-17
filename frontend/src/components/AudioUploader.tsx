import React, { useState, useRef } from 'react';
import { UploadCloud, Music, FileWarning, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface AudioUploaderProps {
  onTaskQueued: (taskId: string) => void;
}

export function AudioUploader({ onTaskQueued }: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stemMode, setStemMode] = useState<"2" | "4">("2");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const validateFile = (file: File) => {
    setError(null);
    const validExtensions = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/mp4', 'audio/x-m4a'];
    
    if (!validExtensions.includes(file.type) && !file.name.match(/\.(mp3|wav|flac|m4a)$/i)) {
      setError('Format file tidak didukung. Gunakan MP3, WAV, FLAC, atau M4A.');
      return false;
    }

    const isLossless = file.name.match(/\.(wav|flac)$/i);
    const maxSize = isLossless ? 200 * 1024 * 1024 : 50 * 1024 * 1024;
    
    if (file.size > maxSize) {
      setError(`Ukuran file melebihi batas (${isLossless ? '200MB untuk WAV/FLAC' : '50MB untuk MP3/M4A'}).`);
      return false;
    }

    return true;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && validateFile(droppedFile)) {
      setFile(droppedFile);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile && validateFile(selectedFile)) {
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file) return;
    
    setIsUploading(true);
    setError(null);
    
    const formData = new FormData();
    formData.append('file', file);
    formData.append('stem_mode', stemMode);

    try {
      const response = await axios.post('http://localhost:8000/api/v1/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      if (response.data.task_id) {
        onTaskQueued(response.data.task_id);
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Gagal mengupload file.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto border-none bg-black/20 backdrop-blur-sm">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-2xl text-white">Upload Audio</CardTitle>
        <CardDescription>Pisahkan Vokal dan Instrumen menggunakan AI Demucs</CardDescription>
      </CardHeader>
      <CardContent>
        
        <div className="flex justify-center mb-6 mt-2">
          <div className="bg-black/30 p-1 rounded-full flex border border-white/5">
            <button
              onClick={() => setStemMode("2")}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 active:scale-95",
                stemMode === "2" 
                  ? "bg-gradient-to-br from-[#FFB775] to-[#E05297] text-white shadow-lg" 
                  : "text-text-secondary hover:text-white hover:bg-white/5"
              )}
            >
              2 Stems (Standard)
            </button>
            <button
              onClick={() => setStemMode("4")}
              className={cn(
                "px-6 py-2 rounded-full text-sm font-medium transition-all duration-300 active:scale-95",
                stemMode === "4" 
                  ? "bg-gradient-to-br from-[#FFB775] to-[#E05297] text-white shadow-lg" 
                  : "text-text-secondary hover:text-white hover:bg-white/5"
              )}
            >
              4 Stems (Pro)
            </button>
          </div>
        </div>

        <div 
          className={cn(
            "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-all text-center cursor-pointer mt-4",
            isDragging ? "border-accent-primary bg-accent-primary/10 scale-[1.02]" : "border-white/10 bg-black/20 hover:border-accent-primary/50",
            error ? "border-red-500/50 bg-red-500/5" : ""
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept=".mp3,.wav,.flac,.m4a"
            onChange={handleFileChange}
            disabled={isUploading}
          />
          
          {isUploading ? (
            <div className="flex flex-col items-center space-y-4">
              <Loader2 className="w-12 h-12 text-accent-primary animate-spin" />
              <p className="text-white font-medium animate-pulse">Mengupload file...</p>
            </div>
          ) : file ? (
            <div className="flex flex-col items-center space-y-4">
              <div className="p-3 bg-accent-primary/20 rounded-full">
                <CheckCircle2 className="w-8 h-8 text-accent-primary" />
              </div>
              <div>
                <p className="text-white font-bold text-lg">{file.name}</p>
                <p className="text-text-secondary text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              <Button 
                onClick={(e) => { e.stopPropagation(); handleUpload(); }}
                className="mt-4 px-8 py-6 rounded-full font-bold bg-gradient-to-br from-[#FFB775] to-[#E05297] hover:opacity-90 transition-opacity border-none text-white text-base shadow-sm"
              >
                Mulai Pemisahan AI
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <div className="p-5 bg-white/5 rounded-full group-hover:bg-white/10 transition-colors">
                <UploadCloud className="w-10 h-10 text-text-secondary group-hover:text-white" />
              </div>
              <div>
                <p className="text-white font-medium text-lg">Klik atau Drag & Drop file audio</p>
                <p className="text-text-secondary mt-1">MP3, WAV, FLAC, M4A (Max 10 menit)</p>
              </div>
              <div className="flex items-center space-x-2 text-sm text-text-secondary bg-black/30 px-4 py-2 rounded-full border border-white/5 mt-2">
                <Music className="w-4 h-4 text-accent-primary" />
                <span>MP3/M4A &lt; 50MB</span>
                <span className="mx-1 opacity-50">•</span>
                <span>WAV/FLAC &lt; 200MB</span>
              </div>
            </div>
          )}
        </div>
        
        {error && (
          <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg flex items-start space-x-3 text-red-400">
            <FileWarning className="w-5 h-5 shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
