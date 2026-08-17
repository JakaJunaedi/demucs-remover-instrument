import React, { useState } from 'react';
import { Download, FileArchive, Settings2, Loader2 } from 'lucide-react';
import { exportCustomMix } from '@/lib/audio-export';
import type { MixState } from './StemMixer';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

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
    <Card className="w-full mt-4 border-none bg-black/20 backdrop-blur-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg text-white">Download Hasil</CardTitle>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Button 
            variant="outline" 
            className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white"
            asChild
          >
            <a href={vocalsUrl}>
              <Download className="w-4 h-4 mr-2" />
              Vocals Only
            </a>
          </Button>
          
          <Button 
            variant="outline" 
            className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white"
            asChild
          >
            <a href={instrumentalUrl}>
              <Download className="w-4 h-4 mr-2" />
              Instrumental Only
            </a>
          </Button>
          
          <Button 
            variant="default" 
            className="w-full bg-accent-primary hover:bg-accent-secondary text-white shadow-lg shadow-accent-primary/20"
            asChild
          >
            <a href={zipUrl}>
              <FileArchive className="w-4 h-4 mr-2" />
              Download Semua (ZIP)
            </a>
          </Button>
          
          <Button 
            onClick={handleCustomExport}
            disabled={isExporting}
            variant="secondary"
            className="w-full bg-accent-secondary/20 hover:bg-accent-secondary/30 text-accent-secondary border border-accent-secondary/30"
          >
            {isExporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Settings2 className="w-4 h-4 mr-2" />
            )}
            Export Custom Mix
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
