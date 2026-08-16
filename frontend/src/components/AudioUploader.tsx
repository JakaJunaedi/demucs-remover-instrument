import React, { useState, useRef } from 'react';
import { UploadCloud, Music, FileWarning, Loader2, CheckCircle2 } from 'lucide-react';
import axios from 'axios';
import { cn } from '@/lib/utils';

interface AudioUploaderProps {
  onTaskQueued: (taskId: string) => void;
}

export function AudioUploader({ onTaskQueued }: AudioUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    
    // Simplistic check for MVP
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

    try {
      // Endpoint sesuai PRD v1.1
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
    <div className="w-full max-w-2xl mx-auto">
      <div 
        className={cn(
          "border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors text-center cursor-pointer",
          isDragging ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50",
          error ? "border-error/50 bg-error/5" : ""
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
            <Loader2 className="w-12 h-12 text-primary animate-spin" />
            <p className="text-text-primary font-medium">Mengupload file...</p>
          </div>
        ) : file ? (
          <div className="flex flex-col items-center space-y-4">
            <div className="p-3 bg-primary/20 rounded-full">
              <CheckCircle2 className="w-8 h-8 text-primary" />
            </div>
            <div>
              <p className="text-text-primary font-medium">{file.name}</p>
              <p className="text-text-secondary text-sm">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); handleUpload(); }}
              className="mt-4 px-6 py-2 bg-primary text-background font-medium rounded-md hover:opacity-90 transition-opacity"
            >
              Mulai Pemisahan
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center space-y-4">
            <div className="p-4 bg-border/50 rounded-full">
              <UploadCloud className="w-10 h-10 text-text-secondary" />
            </div>
            <div>
              <p className="text-text-primary font-medium text-lg">Klik atau Drag & Drop file audio</p>
              <p className="text-text-secondary mt-1">MP3, WAV, FLAC, M4A (Max 10 menit)</p>
            </div>
            <div className="flex items-center space-x-2 text-sm text-text-secondary bg-background/50 px-3 py-1.5 rounded-pill border border-border">
              <Music className="w-4 h-4" />
              <span>MP3/M4A &lt; 50MB</span>
              <span className="mx-1">•</span>
              <span>WAV/FLAC &lt; 200MB</span>
            </div>
          </div>
        )}
      </div>
      
      {error && (
        <div className="mt-4 p-3 bg-error/10 border border-error/20 rounded-md flex items-start space-x-2 text-error">
          <FileWarning className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
}
