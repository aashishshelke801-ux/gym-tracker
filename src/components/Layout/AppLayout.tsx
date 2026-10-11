import React, { useEffect } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useApp } from '../../context/AppContext';
import BottomNav from './BottomNav';

// ─── Loading Skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Fake header */}
      <div className="px-4 pt-12 pb-4">
        <div className="h-8 w-40 bg-[#1a1a1a] rounded-xl animate-pulse mb-2" />
        <div className="h-4 w-24 bg-[#161616] rounded-lg animate-pulse" />
      </div>

      {/* Fake cards */}
      <div className="px-4 flex flex-col gap-3 flex-1">
        {[120, 80, 160, 100].map((h, i) => (
          <div
            key={i}
            className="bg-[#111111] border border-[#1e1e1e] rounded-2xl animate-pulse"
            style={{ height: h }}
          />
        ))}
      </div>

      {/* Fake nav */}
      <div className="h-16 bg-[#111111] border-t border-[#1e1e1e] animate-pulse" />
    </div>
  );
}

// ─── AppLayout ────────────────────────────────────────────────────────────────

export default function AppLayout() {
  const { state } = useApp();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  // Redirect to onboarding if profile not complete
  useEffect(() => {
    if (!state.loading && !state.profile?.onboardingComplete) {
      if (pathname !== '/onboarding') {
        navigate('/onboarding', { replace: true });
      }
    }
  }, [state.loading, state.profile?.onboardingComplete, pathname, navigate]);

  // Show loading skeleton while initializing
  if (state.loading) {
    return <LoadingSkeleton />;
  }

  // Don't show layout chrome on onboarding route
  if (pathname === '/onboarding') {
    return <Outlet />;
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Main content – pad bottom so content isn't hidden under nav */}
      <main className="flex-1 pb-[calc(64px+env(safe-area-inset-bottom))] overflow-x-hidden">
        <Outlet />
      </main>

      {/* Bottom Navigation */}
      <BottomNav />
    </div>
  );
}
