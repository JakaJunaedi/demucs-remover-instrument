import React, { useEffect, useRef, useState, useImperativeHandle, forwardRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, SkipBack } from 'lucide-react';

interface WaveformPlayerProps {
  vocalsUrl: string;
  instrumentalUrl: string;
  onReady?: () => void;
}

export interface WaveformPlayerRef {
  setVocalsVolume: (val: number) => void;
  setInstrumentalVolume: (val: number) => void;
}

export const WaveformPlayer = forwardRef<WaveformPlayerRef, WaveformPlayerProps>(
  ({ vocalsUrl, instrumentalUrl, onReady }, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isReady, setIsReady] = useState(false);
    
    // We keep track of both instances to play them simultaneously
    const wsVocals = useRef<WaveSurfer | null>(null);
    const wsInst = useRef<WaveSurfer | null>(null);

    useEffect(() => {
      if (!containerRef.current) return;

      // Master waveform visualization is driven by vocals or instrumental. 
      // We overlay them by having one render the wave and the other hidden (or both overlaid).
      // Here we render instrumental as main, and vocals overlaid.
      
      wsInst.current = WaveSurfer.create({
        container: containerRef.current,
        waveColor: '#334155',
        progressColor: '#06b6d4',
        cursorColor: '#f1f5f9',
        barWidth: 2,
        height: 100,
        normalize: true,
      });

      // We only use the second instance for audio playback, hiding its waveform
      const hiddenContainer = document.createElement('div');
      wsVocals.current = WaveSurfer.create({
        container: hiddenContainer,
        waveColor: 'transparent',
        progressColor: 'transparent',
        cursorColor: 'transparent',
        height: 0,
      });

      let loadedCount = 0;
      const onLoaded = () => {
        loadedCount++;
        if (loadedCount === 2) {
          setIsReady(true);
          onReady?.();
        }
      };

      wsInst.current.on('ready', onLoaded);
      wsVocals.current.on('ready', onLoaded);
      
      wsInst.current.on('play', () => wsVocals.current?.play());
      wsInst.current.on('pause', () => wsVocals.current?.pause());
      // @ts-ignore
      wsInst.current.on('seeking', (progress) => wsVocals.current?.seekTo(progress as number));
      
      wsInst.current.on('finish', () => setIsPlaying(false));

      wsInst.current.load(instrumentalUrl);
      wsVocals.current.load(vocalsUrl);

      return () => {
        wsInst.current?.destroy();
        wsVocals.current?.destroy();
      };
    }, [vocalsUrl, instrumentalUrl]);

    useImperativeHandle(ref, () => ({
      setVocalsVolume: (val: number) => {
        wsVocals.current?.setVolume(val);
      },
      setInstrumentalVolume: (val: number) => {
        wsInst.current?.setVolume(val);
      }
    }));

    const togglePlay = () => {
      if (wsInst.current) {
        if (isPlaying) {
          wsInst.current.pause();
        } else {
          wsInst.current.play();
        }
        setIsPlaying(!isPlaying);
      }
    };

    const stop = () => {
      if (wsInst.current) {
        wsInst.current.stop();
        wsVocals.current?.stop();
        setIsPlaying(false);
      }
    };

    return (
      <div className="w-full bg-card border border-border rounded-xl p-6">
        <div ref={containerRef} className="w-full mb-6 relative">
          {!isReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-card/80 z-10">
              <span className="text-text-secondary">Memuat audio...</span>
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-center space-x-4">
          <button 
            onClick={stop}
            disabled={!isReady}
            className="p-3 bg-border/50 hover:bg-hover rounded-full transition-colors disabled:opacity-50"
          >
            <SkipBack className="w-5 h-5 text-text-primary" />
          </button>
          
          <button 
            onClick={togglePlay}
            disabled={!isReady}
            className="p-4 bg-primary text-background rounded-full hover:opacity-90 transition-opacity shadow-lg shadow-primary/20 disabled:opacity-50"
          >
            {isPlaying ? (
              <Pause className="w-6 h-6 fill-current" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-1" />
            )}
          </button>
        </div>
      </div>
    );
  }
);
