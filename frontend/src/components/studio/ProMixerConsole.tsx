import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, SkipBack, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface StemInfo {
  name: string;
  url: string;
  color: string;
}

export interface ProMixState {
  volumes: Record<string, number>;
  mutes: Record<string, boolean>;
}

interface ProMixerConsoleProps {
  taskId: string;
  stems: StemInfo[];
  mixState: ProMixState;
  onVolumeChange: (name: string, val: number) => void;
  onMuteToggle: (name: string) => void;
}

export function ProMixerConsole({ taskId, stems, mixState, onVolumeChange, onMuteToggle }: ProMixerConsoleProps) {
  const [isReady, setIsReady] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loadingPercent, setLoadingPercent] = useState(0);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const surfersRef = useRef<Record<string, WaveSurfer>>({});

  useEffect(() => {
    if (!containerRef.current) return;

    let loadedCount = 0;
    
    // We create one visible waveform (the first one) and the rest are hidden
    stems.forEach((stem, index) => {
      const isMaster = index === 0;
      const targetContainer = isMaster ? containerRef.current! : document.createElement('div');
      
      const ws = WaveSurfer.create({
        container: targetContainer,
        waveColor: isMaster ? '#334155' : 'transparent',
        progressColor: isMaster ? '#06b6d4' : 'transparent',
        cursorColor: isMaster ? '#f1f5f9' : 'transparent',
        barWidth: isMaster ? 2 : 0,
        height: isMaster ? 80 : 0,
        normalize: true,
      });

      ws.on('ready', () => {
        loadedCount++;
        setLoadingPercent(Math.round((loadedCount / stems.length) * 100));
        if (loadedCount === stems.length) {
          setIsReady(true);
        }
      });
      
      ws.load(stem.url);
      surfersRef.current[stem.name] = ws;
    });

    const masterWs = surfersRef.current[stems[0].name];
    
    // Sync all to master
    masterWs.on('play', () => {
      stems.forEach((s, i) => {
        if (i !== 0) surfersRef.current[s.name].play();
      });
    });
    
    masterWs.on('pause', () => {
      stems.forEach((s, i) => {
        if (i !== 0) surfersRef.current[s.name].pause();
      });
    });
    
    // @ts-ignore
    masterWs.on('seeking', (progress) => {
      stems.forEach((s, i) => {
        if (i !== 0) surfersRef.current[s.name].seekTo(progress as number);
      });
    });
    
    masterWs.on('finish', () => setIsPlaying(false));

    return () => {
      Object.values(surfersRef.current).forEach(ws => ws.destroy());
    };
  }, [stems, taskId]);

  useEffect(() => {
    // Apply volumes and mutes
    stems.forEach(stem => {
      const ws = surfersRef.current[stem.name];
      if (ws) {
        // Use 0.0001 to prevent audio context suspension in some browsers
        const vol = mixState.mutes[stem.name] || mixState.volumes[stem.name] === 0 ? 0.0001 : mixState.volumes[stem.name];
        ws.setVolume(vol);
      }
    });
  }, [mixState, stems]);

  const togglePlay = () => {
    const masterWs = surfersRef.current[stems[0].name];
    if (masterWs) {
      if (isPlaying) {
        masterWs.pause();
      } else {
        masterWs.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const stop = () => {
    const masterWs = surfersRef.current[stems[0].name];
    if (masterWs) {
      masterWs.stop();
      stems.forEach((s, i) => {
        if (i !== 0) surfersRef.current[s.name].stop();
      });
      setIsPlaying(false);
    }
  };

  return (
    <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
      {/* Master Display */}
      <div className="w-full bg-black/50 rounded-xl p-4 mb-8 border border-white/5 relative h-28 flex items-center justify-center">
        {!isReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 space-y-2 bg-black/50 rounded-xl">
            <Loader2 className="w-6 h-6 animate-spin text-accent-primary" />
            <span className="text-sm font-medium text-text-secondary">Loading Stems {loadingPercent}%</span>
          </div>
        )}
        <div ref={containerRef} className="w-full h-full opacity-70" />
      </div>

      {/* Mixer Board */}
      <div className="flex justify-around items-stretch gap-2 mb-8">
        {stems.map((stem) => (
          <div key={stem.name} className="flex flex-col items-center bg-black/30 p-4 rounded-xl border border-white/5 flex-1 max-w-[120px]">
            {/* Header */}
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-4 h-8 text-center flex items-center">
              {stem.name}
            </h4>

            {/* Mute Button (Illuminated) */}
            <button
              onClick={() => onMuteToggle(stem.name)}
              className={cn(
                "w-12 h-8 rounded-md mb-8 transition-all duration-300 border font-bold text-xs shadow-inner",
                mixState.mutes[stem.name]
                  ? "bg-red-500/20 border-red-500/50 text-red-400 shadow-[inset_0_0_10px_rgba(239,68,68,0.3)]"
                  : "bg-green-500/10 border-green-500/30 text-green-400"
              )}
            >
              {mixState.mutes[stem.name] ? 'MUTE' : 'ON'}
            </button>

            {/* Vertical Fader */}
            <div className="relative h-48 flex items-center justify-center mb-6 w-full group">
              {/* Fader Track */}
              <div className="absolute w-2 bg-black rounded-full h-full border border-white/10 overflow-hidden">
                <div 
                  className="absolute bottom-0 w-full transition-all duration-100"
                  style={{ 
                    height: `${mixState.volumes[stem.name] * 100}%`,
                    backgroundColor: stem.color,
                    opacity: mixState.mutes[stem.name] ? 0.3 : 1
                  }}
                />
              </div>
              
              {/* Invisible Range Input for Interaction */}
              <input 
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={mixState.volumes[stem.name]}
                onChange={(e) => onVolumeChange(stem.name, parseFloat(e.target.value))}
                className="absolute w-48 h-full -rotate-90 appearance-none bg-transparent cursor-pointer opacity-0 z-10"
              />
              
              {/* Fader Cap (Visual) */}
              <div 
                className={cn(
                  "absolute w-8 h-4 rounded-sm border shadow-lg pointer-events-none transition-all duration-75",
                  mixState.mutes[stem.name] ? "bg-gray-800 border-gray-600" : "bg-gray-700 border-gray-400 group-hover:border-white"
                )}
                style={{
                  bottom: `calc(${mixState.volumes[stem.name] * 100}% - 8px)`
                }}
              >
                <div className="w-full h-[2px] bg-white/50 mt-[7px]" />
              </div>
            </div>
            
            {/* Percentage */}
            <div className="text-xs font-mono text-text-secondary bg-black/50 px-2 py-1 rounded">
              {Math.round(mixState.volumes[stem.name] * 100)}%
            </div>
          </div>
        ))}
      </div>

      {/* Transport Controls */}
      <div className="flex items-center justify-center space-x-6 pt-4 border-t border-white/10">
        <button 
          onClick={stop}
          disabled={!isReady}
          className="p-4 bg-white/5 hover:bg-white/10 rounded-full transition-colors disabled:opacity-50 border border-white/10"
        >
          <SkipBack className="w-5 h-5 text-white" />
        </button>
        
        <button 
          onClick={togglePlay}
          disabled={!isReady}
          className="p-5 bg-gradient-to-br from-accent-primary to-accent-secondary rounded-full hover:scale-105 transition-all shadow-[0_0_20px_rgba(255,123,84,0.3)] disabled:opacity-50 disabled:hover:scale-100"
        >
          {isPlaying ? (
            <Pause className="w-7 h-7 text-white fill-current" />
          ) : (
            <Play className="w-7 h-7 text-white fill-current ml-1" />
          )}
        </button>
      </div>
    </div>
  );
}
