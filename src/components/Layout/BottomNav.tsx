import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Calendar, Dumbbell, Apple, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface Tab {
  label: string;
  path: string;
  icon: React.ElementType;
}

const TABS: Tab[] = [
  { label: 'Home',      path: '/',          icon: Home },
  { label: 'Workouts',  path: '/workouts',  icon: Calendar },
  { label: 'Library',   path: '/library',   icon: Dumbbell },
  { label: 'Nutrition', path: '/nutrition', icon: Apple },
  { label: 'Progress',  path: '/progress',  icon: TrendingUp },
];

export default function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { state } = useApp();
  const hasActiveSession = !!state.activeSession;

  const isActive = (path: string) => {
    if (path === '/') return pathname === '/';
    return pathname.startsWith(path);
  };

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-[#111111] border-t border-[#2a2a2a]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch">
        {TABS.map(tab => {
          const active = isActive(tab.path);
          const isWorkouts = tab.path === '/workouts';
          const Icon = tab.icon;

          return (
            <button
              key={tab.path}
              onClick={() => navigate(tab.path)}
              className="flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[56px] relative focus:outline-none"
            >
              {/* Icon + badge wrapper */}
              <div className="relative">
                <Icon
                  size={22}
                  strokeWidth={active ? 2.5 : 1.8}
                  className={`transition-colors duration-150 ${
                    active ? 'text-[#ef4444]' : 'text-[#888888]'
                  }`}
                />

                {/* Active session pulsing badge on Workouts tab */}
                {isWorkouts && hasActiveSession && (
                  <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#ef4444] opacity-75" />
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#ef4444]" />
                  </span>
                )}
              </div>

              {/* Label */}
              <span
                className={`text-[10px] font-medium leading-none transition-colors duration-150 ${
                  active ? 'text-[#ef4444]' : 'text-[#888888]'
                }`}
              >
                {tab.label}
              </span>

              {/* Active dot indicator */}
              {active && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[#ef4444]" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
