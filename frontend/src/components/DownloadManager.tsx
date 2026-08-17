import React, { useState } from 'react';
import { Download, Settings2, Loader2, Archive } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { exportCustomMix, exportCustomMix4Stems } from '@/lib/audio-export';
import type { MixState } from '@/components/StemMixer';
import type { ProMixState } from '@/components/studio/ProMixerConsole';

interface DownloadManagerProps {
  taskId: string;
  mixState: MixState;
  stemMode?: string;
  proMixState?: ProMixState;
}

export function DownloadManager({ taskId, mixState, stemMode = "2", proMixState }: DownloadManagerProps) {
  const [isExporting, setIsExporting] = useState(false);

  const vocalsUrl = `http://localhost:8000/api/v1/download/${taskId}/vocals`;
  const instrumentalUrl = `http://localhost:8000/api/v1/download/${taskId}/no_vocals`;

  const handleCustomExport = async () => {
    setIsExporting(true);
    toast.info("Merender custom mix...", { id: "render-toast" });
    try {
      let blob: Blob;
      
      if (stemMode === "4" && proMixState) {
        const urls = {
          'Vocals': `http://localhost:8000/api/v1/download/${taskId}/vocals`,
          'Drums': `http://localhost:8000/api/v1/download/${taskId}/drums`,
          'Bass': `http://localhost:8000/api/v1/download/${taskId}/bass`,
          'Melody': `http://localhost:8000/api/v1/download/${taskId}/other`
        };
        blob = await exportCustomMix4Stems(urls, proMixState.volumes, proMixState.mutes);
      } else {
        blob = await exportCustomMix(
          vocalsUrl,
          instrumentalUrl,
          mixState.vocals.volume,
          mixState.instrumental.volume,
          mixState.vocals.muted,
          mixState.instrumental.muted
        );
      }
      
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
        {stemMode === "2" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Button variant="outline" className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white" asChild>
              <a href={vocalsUrl}>
                <Download className="w-4 h-4 mr-2" />
                Vocals Only
              </a>
            </Button>
            
            <Button variant="outline" className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white" asChild>
              <a href={instrumentalUrl}>
                <Download className="w-4 h-4 mr-2" />
                Instrumental Only
              </a>
            </Button>
            
            <Button variant="outline" className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white" asChild>
              <a href={`http://localhost:8000/api/v1/download/${taskId}/zip`}>
                <Archive className="w-4 h-4 mr-2" />
                Download Semua (ZIP)
              </a>
            </Button>

            <Button 
              onClick={handleCustomExport} 
              disabled={isExporting}
              className="w-full bg-gradient-to-r from-accent-primary to-accent-secondary hover:opacity-90 text-white border-none"
            >
              {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings2 className="w-4 h-4 mr-2" />}
              {isExporting ? 'Merender...' : 'Export Custom Mix'}
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <Button variant="outline" className="w-full border-pink-500/30 bg-pink-500/10 hover:bg-pink-500/20 text-pink-400" asChild>
              <a href={`http://localhost:8000/api/v1/download/${taskId}/vocals`}>
                <Download className="w-4 h-4 mr-2" /> Vocals
              </a>
            </Button>
            <Button variant="outline" className="w-full border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400" asChild>
              <a href={`http://localhost:8000/api/v1/download/${taskId}/drums`}>
                <Download className="w-4 h-4 mr-2" /> Drums
              </a>
            </Button>
            <Button variant="outline" className="w-full border-yellow-500/30 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400" asChild>
              <a href={`http://localhost:8000/api/v1/download/${taskId}/bass`}>
                <Download className="w-4 h-4 mr-2" /> Bass
              </a>
            </Button>
            <Button variant="outline" className="w-full border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400" asChild>
              <a href={`http://localhost:8000/api/v1/download/${taskId}/other`}>
                <Download className="w-4 h-4 mr-2" /> Melody
              </a>
            </Button>
            
            <Button variant="outline" className="w-full border-white/10 bg-white/5 hover:bg-white/10 text-white" asChild>
              <a href={`http://localhost:8000/api/v1/download/${taskId}/zip`}>
                <Archive className="w-4 h-4 mr-2" /> ZIP
              </a>
            </Button>

            <Button 
              onClick={handleCustomExport} 
              disabled={isExporting}
              className="w-full bg-gradient-to-r from-accent-primary to-accent-secondary hover:opacity-90 text-white border-none"
            >
              {isExporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Settings2 className="w-4 h-4 mr-2" />}
              Export Mix
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
