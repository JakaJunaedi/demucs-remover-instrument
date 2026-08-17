import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Home, Compass, Heart, Mic2, Music, FolderOpen, PlayCircle, Settings, X, MonitorPlay } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const location = useLocation();
  const currentPath = location.pathname;

  const getLinkClass = (path: string) => cn(
    "flex items-center space-x-3 font-medium transition-all px-4 py-2.5 rounded-full relative group",
    currentPath === path 
      ? "text-white bg-accent-primary/10 shadow-[0_0_15px_var(--accent-primary)] shadow-accent-primary/20" // Active state (neon capsule)
      : "text-text-secondary hover:text-white hover:bg-white/5" // Inactive & Hover state
  );

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={onClose}
        ></div>
      )}

      <aside 
        className={cn(
          "fixed md:static inset-y-0 left-0 w-64 bg-sidebar flex flex-col px-6 py-8 shrink-0 z-50 transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        <div className="flex items-center justify-between mb-12">
          <Link to="/" className="flex items-center space-x-2 cursor-pointer" onClick={onClose}>
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-accent-primary to-accent-secondary flex items-center justify-center shadow-lg shadow-accent-primary/20">
              <PlayCircle className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-bold text-text-primary tracking-wide">Studio<span className="text-accent-primary">AI</span></span>
          </Link>
          
          <button 
            className="md:hidden text-text-secondary hover:text-white transition-colors"
            onClick={onClose}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="space-y-8 flex-1 overflow-y-auto scrollbar-hide px-4 -mx-4">
          {/* Menu */}
          <div>
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 px-1">Menu</h3>
            <ul className="space-y-1">
              <li>
                <Link to="/" onClick={onClose} className={getLinkClass('/')}>
                  <Home className={cn("w-5 h-5", currentPath === '/' ? "text-accent-primary" : "")} />
                  <span>Dashboard</span>
                </Link>
              </li>
              <li>
                <Link to="/browse" onClick={onClose} className={getLinkClass('/browse')}>
                  <Compass className="w-5 h-5" />
                  <span>Browse</span>
                </Link>
              </li>
              <li>
                <Link to="/favourite" onClick={onClose} className={getLinkClass('/favourite')}>
                  <Heart className="w-5 h-5" />
                  <span>Favourite</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Studio Tools */}
          <div>
            <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-2 px-1">STUDIO TOOLS</h3>
            <ul className="space-y-1">
              <li>
                <Link to="/studio" onClick={onClose} className={getLinkClass('/studio')}>
                  <Mic2 className={cn("w-5 h-5", currentPath === '/studio' ? "text-accent-primary" : "")} />
                  <span>Vocal Remover</span>
                </Link>
              </li>
              <li>
                <Link to="/youtube" onClick={onClose} className={getLinkClass('/youtube')}>
                  <MonitorPlay className="w-5 h-5" />
                  <span>YT to MP3</span>
                </Link>
              </li>
              <li>
                <Link to="/instrumental" onClick={onClose} className={getLinkClass('/instrumental')}>
                  <Music className="w-5 h-5" />
                  <span>Instrumental Maker</span>
                </Link>
              </li>
              <li>
                <Link to="/projects" onClick={onClose} className={getLinkClass('/projects')}>
                  <FolderOpen className="w-5 h-5" />
                  <span>My Projects</span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-auto pt-8">
          <Link to="/settings" onClick={onClose} className={getLinkClass('/settings')}>
            <Settings className="w-5 h-5" />
            <span>Setting</span>
          </Link>
        </div>
      </aside>
    </>
  );
}
