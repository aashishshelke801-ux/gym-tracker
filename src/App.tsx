import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import AppLayout from './components/Layout/AppLayout';
import Dashboard from './pages/Dashboard';
import Workouts from './pages/Workouts';
import Library from './pages/Library';
import Nutrition from './pages/Nutrition';
import Progress from './pages/Progress';
import Settings from './pages/Settings';
import Session from './pages/Session';
import Profile from './pages/Profile';
import Onboarding from './components/Onboarding/Onboarding';

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Routes>
          {/* Onboarding - no layout */}
          <Route path="/onboarding" element={<Onboarding />} />
          {/* Main app with bottom nav layout */}
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="workouts" element={<Workouts />} />
            <Route path="library" element={<Library />} />
            <Route path="nutrition" element={<Nutrition />} />
            <Route path="progress" element={<Progress />} />
            <Route path="settings" element={<Settings />} />
            <Route path="profile" element={<Profile />} />
          </Route>
          {/* Session - fullscreen, no bottom nav */}
          <Route path="session" element={<Session />} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppProvider>
    </BrowserRouter>
  );
}
