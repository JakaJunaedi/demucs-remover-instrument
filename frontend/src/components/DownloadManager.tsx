import React, { useState } from 'react';
import { Download, FileArchive, Settings2, Loader2 } from 'lucide-react';
import { exportCustomMix } from '@/lib/audio-export';
import type { MixState } from './StemMixer';
import { toast } from 'sonner';

interface DownloadManagerProps {
  taskId: string;
  mixState: MixState;
}

export function DownloadManager({ taskId, mixState }: DownloadManagerProps) {
  const [isExporting, setIsExporting] = useState(false);

  const vocalsUrl = `http://localhost:8000/api/v1/download/${taskId}/vocals`;
  const instrumentalUrl = `http://localhost:8000/api/v1/download/${taskId}/no_vocals`;
  const zipUrl = `http://localhost:8000/api/v1/download/${taskId}/zip`;

  const handleCustomExport = async () => {
    setIsExporting(true);
    toast.info("Merender custom mix...", { id: "render-toast" });
    try {
      const blob = await exportCustomMix(
        vocalsUrl,
        instrumentalUrl,
        mixState.vocals.volume,
        mixState.instrumental.volume,
        mixState.vocals.muted,
        mixState.instrumental.muted
      );
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${taskId}_custom_mix.wav`;
      a.click();
      URL.revokeObjectURL(url);
      
      toast.success("Custom mix berhasil didownload!", { id: "render-toast" });
    } catch (err) {
      console.error(err);
      toast.error("Gagal merender custom mix.", { id: "render-toast" });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="w-full bg-card border border-border rounded-xl p-6 mt-4">
      <h3 className="text-lg font-semibold mb-4 text-text-primary">Download Hasil</h3>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <a 
          href={vocalsUrl}
          className="flex items-center justify-center space-x-2 bg-border/30 hover:bg-border/50 border border-border p-3 rounded-lg transition-colors text-text-primary"
        >
          <Download className="w-4 h-4" />
          <span className="font-medium text-sm">Vocals Only</span>
        </a>
        
        <a 
          href={instrumentalUrl}
          className="flex items-center justify-center space-x-2 bg-border/30 hover:bg-border/50 border border-border p-3 rounded-lg transition-colors text-text-primary"
        >
          <Download className="w-4 h-4" />
          <span className="font-medium text-sm">Instrumental Only</span>
        </a>
        
        <a 
          href={zipUrl}
          className="flex items-center justify-center space-x-2 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary p-3 rounded-lg transition-colors"
        >
          <FileArchive className="w-4 h-4" />
          <span className="font-medium text-sm">Download Semua (ZIP)</span>
        </a>
        
        <button 
          onClick={handleCustomExport}
          disabled={isExporting}
          className="flex items-center justify-center space-x-2 bg-accent-secondary/10 hover:bg-accent-secondary/20 border border-accent-secondary/30 text-accent-secondary p-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {isExporting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Settings2 className="w-4 h-4" />
          )}
          <span className="font-medium text-sm">Export Custom Mix</span>
        </button>
      </div>
    </div>
  );
}
