import React from 'react';
import { TrendingCards } from '@/components/dashboard/TrendingCards';
import { TrackList } from '@/components/dashboard/TrackList';

export function Home() {
  return (
    <div className="w-full">
      <TrendingCards />
      
      <div className="flex flex-col lg:flex-row gap-10 mt-10">
        <TrackList />
        
        {/* Right Sidebar Mockup (Top Artist) */}
        <div className="w-full lg:w-72 shrink-0 space-y-10">
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-text-primary tracking-wide">Top Artist</h2>
              <button className="text-sm text-text-secondary hover:text-text-primary transition-colors">View All</button>
            </div>
            <div className="space-y-4">
              {[
                { name: 'Justin Bieber', followers: '60M', color: 'from-orange-400 to-accent-warning' },
                { name: 'Sean Paul', followers: '40M', color: 'from-accent-primary to-accent-warning' },
                { name: 'Marshmello', followers: '30M', color: 'from-pink-500 to-orange-400' },
              ].map((artist, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${artist.color}`}></div>
                    <div>
                      <h4 className="text-sm font-bold">{artist.name}</h4>
                      <p className="text-xs text-text-secondary">{artist.followers} Followers</p>
                    </div>
                  </div>
                  <button className="px-3 py-1 rounded-full border border-white/10 text-xs font-medium hover:bg-white/5 transition-colors">
                    Follow
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
