import React, { useState } from 'react';
import { Sidebar } from './Sidebar';
import { BottomPlayer } from './BottomPlayer';
import { Search, Bell, Menu } from 'lucide-react';
import { useLocation, Outlet } from 'react-router-dom';

export function DashboardLayout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const location = useLocation();

  // Helper to determine page title
  const getPageTitle = () => {
    if (location.pathname === '/studio') return 'Vocal Remover';
    if (location.pathname === '/youtube') return 'YouTube to MP3';
    return 'Home';
  };

  return (
    <div className="flex flex-col h-screen bg-background overflow-hidden text-text-primary">
      
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar (Responsive) */}
        <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />

        {/* Main Content Area (Center + Right) */}
        <div className="flex-1 flex flex-col min-w-0 relative">
          
          {/* Top Header */}
          <header className="h-16 md:h-20 px-4 md:px-8 flex items-center justify-between shrink-0 bg-background/80 backdrop-blur-md z-30 sticky top-0">
            <div className="flex items-center space-x-4 md:space-x-6">
              
              <button 
                className="md:hidden text-text-primary p-1 hover:bg-white/10 rounded-md transition-colors"
                onClick={() => setIsSidebarOpen(true)}
              >
                <Menu className="w-6 h-6" />
              </button>
              
              <h1 className="text-xl md:text-2xl font-bold tracking-wide">{getPageTitle()}</h1>
              
              {/* Search Bar */}
              <div className="relative hidden lg:block">
                <Search className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary" />
                <input 
                  type="text" 
                  placeholder="Search Music..." 
                  className="w-64 h-10 bg-white/5 border border-white/10 rounded-full pl-11 pr-4 text-sm text-text-primary focus:outline-none focus:border-white/20 transition-colors"
                />
              </div>
            </div>

            <div className="flex items-center space-x-4 md:space-x-6">
              <button className="text-text-secondary hover:text-white transition-colors relative hidden sm:block">
                <Bell className="w-5 h-5" />
                <span className="absolute top-0 right-0 w-2 h-2 bg-accent-primary rounded-full"></span>
              </button>
              <div className="flex items-center space-x-3 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-gradient-to-r from-orange-400 to-pink-500"></div>
                <span className="text-sm font-medium hidden sm:block">Alex</span>
              </div>
            </div>
          </header>

          {/* Scrollable Content */}
          <main className="flex-1 overflow-y-auto overflow-x-hidden px-4 md:px-8 pb-8 scrollbar-hide">
            <div className="w-full mt-4 md:mt-6">
              <Outlet />
            </div>
          </main>
          
        </div>
      </div>

      {/* Bottom Player (Full Width, Fixed at Bottom) */}
      <div className="w-full z-50 shrink-0 shadow-[0_-10px_30px_rgba(0,0,0,0.5)]">
        <BottomPlayer />
      </div>

    </div>
  );
}
