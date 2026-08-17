import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, Shuffle, Volume2, Heart, Download, X } from 'lucide-react';

export function BottomPlayer() {
  return (
    <div className="h-20 md:h-24 bg-card border-t border-white/5 rounded-t-[32px] flex items-center justify-between px-3 md:px-6 z-20 shrink-0 relative group">
      
      {/* Close Button (Top Right) */}
      <button className="absolute top-3 right-4 p-1 text-text-secondary hover:text-white transition-colors opacity-0 group-hover:opacity-100 hidden md:block">
        <X className="w-4 h-4" />
      </button>

      {/* Left: Track Info */}
      <div className="flex items-center w-auto md:w-1/3 min-w-0">
        <div className="w-12 h-12 md:w-14 md:h-14 rounded-lg bg-gradient-to-br from-accent-primary to-accent-warning flex items-center justify-center shrink-0">
          <div className="w-5 h-5 md:w-6 md:h-6 rounded-sm bg-white/20 backdrop-blur-sm"></div>
        </div>
        <div className="ml-3 md:ml-4 truncate">
          <h4 className="text-sm font-bold text-text-primary truncate">Calling On Me</h4>
          <p className="text-xs text-text-secondary mt-0.5 md:mt-1 truncate hidden sm:block">Sean Paul, Tove Lo</p>
        </div>
        <div className="ml-4 md:ml-6 items-center space-x-3 text-text-secondary hidden lg:flex">
          <button className="hover:text-accent-primary transition-colors"><Heart className="w-5 h-5" /></button>
          <button className="hover:text-accent-primary transition-colors"><Download className="w-5 h-5" /></button>
        </div>
      </div>

      {/* Center: Controls & Progress */}
      <div className="flex flex-col items-center justify-center flex-1 md:w-1/3 px-2">
        <div className="flex items-center space-x-3 md:space-x-6">
          <button className="text-text-secondary hover:text-text-primary transition-colors hidden sm:block">
            <Shuffle className="w-4 h-4" />
          </button>
          <button className="text-text-primary hover:text-accent-primary transition-colors">
            <SkipBack className="w-4 h-4 md:w-5 md:h-5 fill-current" />
          </button>
          
          <button className="w-10 h-10 md:w-10 md:h-10 rounded-full bg-gradient-to-r from-accent-primary to-accent-secondary flex items-center justify-center hover:scale-105 transition-transform shadow-lg shadow-accent-primary/20 shrink-0">
            <Pause className="w-4 h-4 md:w-5 md:h-5 text-white fill-current" />
          </button>
          
          <button className="text-text-primary hover:text-accent-primary transition-colors">
            <SkipForward className="w-4 h-4 md:w-5 md:h-5 fill-current" />
          </button>
          <button className="text-text-secondary hover:text-text-primary transition-colors hidden sm:block">
            <Repeat className="w-4 h-4" />
          </button>
        </div>
        
        <div className="w-full flex items-center space-x-2 md:space-x-3 mt-1.5 md:mt-3 hidden sm:flex">
          <span className="text-[10px] md:text-xs text-text-secondary font-medium w-8 text-right">1:35</span>
          <div className="flex-1 h-1 bg-border rounded-full relative cursor-pointer group/progress">
            <div className="absolute top-0 left-0 h-full bg-gradient-to-r from-accent-primary to-accent-warning rounded-full w-1/3 group-hover/progress:from-accent-secondary group-hover/progress:to-accent-primary transition-colors"></div>
            <div className="absolute top-1/2 left-1/3 -translate-y-1/2 -translate-x-1/2 w-3 h-3 bg-white rounded-full opacity-0 group-hover/progress:opacity-100 transition-opacity shadow-md"></div>
          </div>
          <span className="text-[10px] md:text-xs text-text-secondary font-medium w-8">3:42</span>
        </div>
      </div>

      {/* Right: Volume */}
      <div className="items-center justify-end w-1/3 space-x-3 text-text-secondary hidden md:flex pr-4">
        <Volume2 className="w-5 h-5" />
        <div className="w-24 h-1 bg-border rounded-full cursor-pointer relative group/volume">
          <div className="absolute top-0 left-0 h-full bg-accent-primary rounded-full w-2/3 group-hover/volume:bg-accent-secondary transition-colors"></div>
        </div>
      </div>
    </div>
  );
}
