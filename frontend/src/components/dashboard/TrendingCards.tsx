import React from 'react';
import { Play } from 'lucide-react';

export function TrendingCards() {
  return (
    <div className="mb-10">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-primary tracking-wide">Trending Today</h2>
        <button className="text-sm text-text-secondary hover:text-text-primary transition-colors">View All</button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Card 1 */}
        <div className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-warning via-orange-400 to-accent-primary opacity-90 transition-transform duration-500 group-hover:scale-110"></div>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between backdrop-blur-sm bg-gradient-to-t from-black/60 to-transparent">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Intentions</h3>
              <p className="text-xs text-white/70">Justin Bieber, Quavo</p>
            </div>
            <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 hover:bg-white/40 transition-colors shadow-lg">
              <Play className="w-5 h-5 text-white fill-current" />
            </button>
          </div>
        </div>

        {/* Card 2 */}
        <div className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer shadow-lg">
          <div className="absolute inset-0 bg-gradient-to-br from-accent-secondary via-purple-500 to-accent-primary opacity-90 transition-transform duration-500 group-hover:scale-110"></div>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between backdrop-blur-sm bg-gradient-to-t from-black/60 to-transparent">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Friends</h3>
              <p className="text-xs text-white/70">Marshmello, Anne</p>
            </div>
            <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 hover:bg-white/40 transition-colors shadow-lg">
              <Play className="w-5 h-5 text-white fill-current" />
            </button>
          </div>
        </div>

        {/* Card 3 */}
        <div className="group relative h-48 rounded-2xl overflow-hidden cursor-pointer shadow-lg hidden md:block">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 via-accent-secondary to-pink-400 opacity-90 transition-transform duration-500 group-hover:scale-110"></div>
          <div className="absolute inset-0 bg-black/10"></div>
          <div className="absolute bottom-0 left-0 right-0 p-5 flex items-end justify-between backdrop-blur-sm bg-gradient-to-t from-black/60 to-transparent">
            <div>
              <h3 className="text-lg font-bold text-white mb-1">Blinding Lights</h3>
              <p className="text-xs text-white/70">The Weeknd</p>
            </div>
            <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 hover:bg-white/40 transition-colors shadow-lg">
              <Play className="w-5 h-5 text-white fill-current" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
