import React from 'react';
import { Heart, Play, MoreVertical } from 'lucide-react';

export function TrackList() {
  const tracks = [
    { id: 1, title: 'Calling On Me', artist: 'Sean Paul, Tove Lo', date: '29 Jul 2019', duration: '3:42', color: 'from-orange-400 to-accent-primary' },
    { id: 2, title: 'Get Me (Feat. Kehlani)', artist: 'Justin Bieber, Kehlani', date: '15 Mar 2019', duration: '4:15', color: 'from-orange-300 to-pink-500' },
    { id: 3, title: 'Let Me Down Slowly', artist: 'Sean Paul, Tove Lo', date: '11 Apr 2020', duration: '2:50', color: 'from-accent-secondary to-indigo-400' },
  ];

  return (
    <div className="flex-1">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-text-primary tracking-wide">Recently Played</h2>
        <button className="text-sm text-text-secondary hover:text-text-primary transition-colors">View All</button>
      </div>

      <div className="space-y-2">
        {tracks.map((track) => (
          <div key={track.id} className="group flex items-center justify-between p-3 rounded-xl hover:bg-white/5 transition-colors cursor-pointer">
            
            <div className="flex items-center space-x-3 md:space-x-4 w-1/2 sm:w-1/3">
              <div className={`w-10 h-10 md:w-12 md:h-12 rounded-lg bg-gradient-to-br ${track.color} shrink-0 shadow-md`}></div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-text-primary group-hover:text-accent-primary transition-colors truncate">{track.title}</h4>
                <p className="text-xs text-text-secondary mt-0.5 md:mt-1 truncate">{track.artist}</p>
              </div>
            </div>

            <div className="hidden sm:block w-1/3 text-sm text-text-secondary">
              {track.date}
            </div>

            <div className="flex items-center justify-end space-x-4 md:space-x-6 w-1/2 sm:w-1/3 text-text-secondary">
              <span className="text-sm hidden md:inline-block">{track.duration}</span>
              <button className="hover:text-accent-primary transition-colors opacity-100 md:opacity-0 group-hover:opacity-100"><Heart className="w-4 h-4" /></button>
              <button className="w-8 h-8 rounded-full bg-accent-primary/20 text-accent-primary flex items-center justify-center opacity-100 md:opacity-0 group-hover:opacity-100 hover:bg-accent-primary hover:text-white transition-all">
                <Play className="w-4 h-4 fill-current" />
              </button>
              <button className="hover:text-text-primary transition-colors"><MoreVertical className="w-4 h-4" /></button>
            </div>

          </div>
        ))}
      </div>
    </div>
  );
}
