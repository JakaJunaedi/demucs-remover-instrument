import React from 'react';
import { Mic2, Music4, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';

export interface MixState {
  vocals: { volume: number; muted: boolean };
  instrumental: { volume: number; muted: boolean };
}

interface StemMixerProps {
  mix: MixState;
  onChange: (mix: MixState) => void;
}

export function StemMixer({ mix, onChange }: StemMixerProps) {
  
  const updateStem = (stem: 'vocals' | 'instrumental', updates: Partial<MixState['vocals']>) => {
    onChange({
      ...mix,
      [stem]: { ...mix[stem], ...updates }
    });
  };

  return (
    <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
      {/* Vocals */}
      <Card className="border-none bg-black/20 backdrop-blur-sm">
        <CardContent className="p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-pink-500/20 rounded-lg">
                <Mic2 className="w-5 h-5 text-pink-400" />
              </div>
              <h3 className="font-semibold text-white">Vocals</h3>
            </div>
            <Button
              variant={mix.vocals.muted ? "destructive" : "secondary"}
              size="sm"
              onClick={() => updateStem('vocals', { muted: !mix.vocals.muted })}
              className={cn("h-7 px-3 text-xs font-bold rounded-full", mix.vocals.muted ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50" : "bg-white/10 text-white hover:bg-white/20")}
            >
              {mix.vocals.muted ? "MUTED" : "MUTE"}
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <button onClick={() => updateStem('vocals', { muted: !mix.vocals.muted })} className="text-text-secondary hover:text-white transition-colors">
              {mix.vocals.muted || mix.vocals.volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <Slider
              defaultValue={[mix.vocals.volume]}
              value={[mix.vocals.volume]}
              max={1}
              step={0.01}
              onValueChange={(vals) => updateStem('vocals', { volume: vals[0] })}
              className={cn("flex-1", mix.vocals.muted ? "opacity-50" : "")}
            />
            <span className="text-xs font-medium text-text-secondary w-8 text-right">
              {Math.round(mix.vocals.volume * 100)}%
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Instrumental */}
      <Card className="border-none bg-black/20 backdrop-blur-sm">
        <CardContent className="p-5 flex flex-col space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-orange-400/20 rounded-lg">
                <Music4 className="w-5 h-5 text-orange-400" />
              </div>
              <h3 className="font-semibold text-white">Instrumental</h3>
            </div>
            <Button
              variant={mix.instrumental.muted ? "destructive" : "secondary"}
              size="sm"
              onClick={() => updateStem('instrumental', { muted: !mix.instrumental.muted })}
              className={cn("h-7 px-3 text-xs font-bold rounded-full", mix.instrumental.muted ? "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50" : "bg-white/10 text-white hover:bg-white/20")}
            >
              {mix.instrumental.muted ? "MUTED" : "MUTE"}
            </Button>
          </div>
          
          <div className="flex items-center space-x-4">
            <button onClick={() => updateStem('instrumental', { muted: !mix.instrumental.muted })} className="text-text-secondary hover:text-white transition-colors">
              {mix.instrumental.muted || mix.instrumental.volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <Slider
              defaultValue={[mix.instrumental.volume]}
              value={[mix.instrumental.volume]}
              max={1}
              step={0.01}
              onValueChange={(vals) => updateStem('instrumental', { volume: vals[0] })}
              className={cn("flex-1", mix.instrumental.muted ? "opacity-50" : "")}
            />
            <span className="text-xs font-medium text-text-secondary w-8 text-right">
              {Math.round(mix.instrumental.volume * 100)}%
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
