import React from 'react';
import { Mic2, Music4, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Mic2 className="w-5 h-5 text-accent-secondary" />
            <h3 className="font-semibold text-text-primary">Vocals</h3>
          </div>
          <button
            onClick={() => updateStem('vocals', { muted: !mix.vocals.muted })}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-pill transition-colors",
              mix.vocals.muted 
                ? "bg-error/20 text-error border border-error/50" 
                : "bg-border/50 text-text-secondary hover:bg-hover border border-transparent"
            )}
          >
            {mix.vocals.muted ? "MUTED" : "MUTE"}
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          {mix.vocals.muted || mix.vocals.volume === 0 ? (
            <VolumeX className="w-4 h-4 text-text-secondary" />
          ) : (
            <Volume2 className="w-4 h-4 text-text-secondary" />
          )}
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01"
            value={mix.vocals.volume}
            onChange={(e) => updateStem('vocals', { volume: parseFloat(e.target.value) })}
            className="flex-1 accent-accent-secondary h-2 bg-border rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-text-secondary w-8 text-right">
            {Math.round(mix.vocals.volume * 100)}%
          </span>
        </div>
      </div>

      {/* Instrumental */}
      <div className="bg-card border border-border rounded-xl p-5 flex flex-col space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Music4 className="w-5 h-5 text-accent-primary" />
            <h3 className="font-semibold text-text-primary">Instrumental</h3>
          </div>
          <button
            onClick={() => updateStem('instrumental', { muted: !mix.instrumental.muted })}
            className={cn(
              "px-3 py-1 text-xs font-medium rounded-pill transition-colors",
              mix.instrumental.muted 
                ? "bg-error/20 text-error border border-error/50" 
                : "bg-border/50 text-text-secondary hover:bg-hover border border-transparent"
            )}
          >
            {mix.instrumental.muted ? "MUTED" : "MUTE"}
          </button>
        </div>
        
        <div className="flex items-center space-x-3">
          {mix.instrumental.muted || mix.instrumental.volume === 0 ? (
            <VolumeX className="w-4 h-4 text-text-secondary" />
          ) : (
            <Volume2 className="w-4 h-4 text-text-secondary" />
          )}
          <input 
            type="range" 
            min="0" 
            max="1" 
            step="0.01"
            value={mix.instrumental.volume}
            onChange={(e) => updateStem('instrumental', { volume: parseFloat(e.target.value) })}
            className="flex-1 accent-accent-primary h-2 bg-border rounded-lg appearance-none cursor-pointer"
          />
          <span className="text-xs text-text-secondary w-8 text-right">
            {Math.round(mix.instrumental.volume * 100)}%
          </span>
        </div>
      </div>
    </div>
  );
}
