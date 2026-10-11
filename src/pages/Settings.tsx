import React, { useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Settings as SettingsIcon,
  Monitor,
  Bell,
  Database,
  Info,
  ChevronRight,
  Download,
  Upload,
  Trash2,
  Check,
  X,
  Droplets,
  Camera,
  Trophy,
  Volume2,
  Vibrate,
  Dumbbell,
  Sun,
  Moon,
  Globe,
  Calendar,
  Clock,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { exportAllData, importAllData } from '../db';
import type { AppSettings } from '../types';

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastMsg { id: number; text: string; type: 'success' | 'error' }

function useToast() {
  const [toasts, setToasts] = useState<ToastMsg[]>([]);
  const show = useCallback((text: string, type: 'success' | 'error' = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, text, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3000);
  }, []);
  return { toasts, show };
}

function ToastContainer({ toasts }: { toasts: ToastMsg[] }) {
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 pointer-events-none">
      <AnimatePresence>
        {toasts.map(t => (
          <motion.div
            key={t.id}
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 60 }}
            className={`flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-sm font-medium pointer-events-auto
              ${t.type === 'success'
                ? 'bg-[#1a1a1a] border border-[#22c55e]/40 text-[#22c55e]'
                : 'bg-[#1a1a1a] border border-[#ef4444]/40 text-[#ef4444]'
              }`}
          >
            {t.type === 'success' ? <Check size={16} /> : <X size={16} />}
            {t.text}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors duration-200 focus:outline-none
        ${checked ? 'bg-[#ef4444]' : 'bg-[#333333]'}`}
      role="switch"
      aria-checked={checked}
    >
      <span
        className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200
          ${checked ? 'translate-x-6' : 'translate-x-1'}`}
      />
    </button>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2 px-4 pt-6 pb-2">
      <Icon size={16} className="text-[#ef4444]" />
      <span className="text-xs font-semibold uppercase tracking-wider text-[#888888]">{title}</span>
    </div>
  );
}

// ─── Settings Row ─────────────────────────────────────────────────────────────

function SettingRow({ label, sublabel, children }: {
  label: string;
  sublabel?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-3 min-h-[56px] gap-4">
      <div className="flex-1 min-w-0">
        <p className="text-[#f5f5f5] text-sm font-medium leading-tight">{label}</p>
        {sublabel && <p className="text-[#888888] text-xs mt-0.5 leading-tight">{sublabel}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

// ─── Color Swatch ─────────────────────────────────────────────────────────────

const ACCENT_COLORS = ['#ef4444', '#f97316', '#8b5cf6', '#06b6d4', '#22c55e', '#f59e0b'];

function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  return (
    <div className="flex gap-2 flex-wrap">
      {ACCENT_COLORS.map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all"
          style={{
            backgroundColor: c,
            borderColor: value === c ? '#ffffff' : 'transparent',
            boxShadow: value === c ? `0 0 0 2px ${c}` : 'none',
          }}
        >
          {value === c && <Check size={14} className="text-white" strokeWidth={3} />}
        </button>
      ))}
    </div>
  );
}

// ─── Reset Modal ──────────────────────────────────────────────────────────────

function ResetModal({ onClose, onConfirm }: { onClose: () => void; onConfirm: () => void }) {
  const [input, setInput] = useState('');
  const valid = input === 'DELETE';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-2xl p-6 w-full max-w-sm"
      >
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-[#ef4444]/10 flex items-center justify-center">
            <AlertTriangle size={20} className="text-[#ef4444]" />
          </div>
          <div>
            <h3 className="text-[#f5f5f5] font-bold text-base">Reset All Data</h3>
            <p className="text-[#888888] text-xs">This cannot be undone</p>
          </div>
        </div>
        <p className="text-[#888888] text-sm mb-4 leading-relaxed">
          This will delete <span className="text-[#ef4444] font-semibold">ALL</span> your data including workouts, sessions, nutrition logs, and progress. Type <span className="font-mono font-bold text-[#f5f5f5]">DELETE</span> to confirm.
        </p>
        <input
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Type DELETE"
          className="w-full bg-[#0a0a0a] border border-[#2a2a2a] rounded-xl px-4 py-3 text-[#f5f5f5] text-sm font-mono placeholder:text-[#444444] focus:outline-none focus:border-[#ef4444] mb-4"
          autoFocus
        />
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl bg-[#222222] text-[#f5f5f5] text-sm font-semibold border border-[#2a2a2a]"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={!valid}
            className={`flex-1 py-3 rounded-xl text-sm font-bold transition-all
              ${valid ? 'bg-[#ef4444] text-white' : 'bg-[#ef4444]/30 text-[#ef4444]/50 cursor-not-allowed'}`}
          >
            Delete Everything
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function Settings() {
  const { state, updateSettings, resetAll } = useApp();
  const { settings } = state;
  const { toasts, show: showToast } = useToast();

  const [showResetModal, setShowResetModal] = useState(false);
  const [reminderTime, setReminderTime] = useState('07:00');
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Save helper ────────────────────────────────────────────────────────────
  const save = useCallback(async (patch: Partial<AppSettings>, label?: string) => {
    try {
      await updateSettings(patch);
      if (label) showToast(`${label} saved`, 'success');
    } catch {
      showToast('Failed to save', 'error');
    }
  }, [updateSettings, showToast]);

  // ── Notifications ─────────────────────────────────────────────────────────
  const handleNotificationsToggle = async (enabled: boolean) => {
    if (enabled) {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        showToast('Notifications permission denied', 'error');
        return;
      }
    }
    await save({ notificationsEnabled: enabled }, 'Notifications');
  };

  // ── Export ────────────────────────────────────────────────────────────────
  const handleExport = async () => {
    try {
      const json = await exportAllData();
      const date = new Date().toISOString().slice(0, 10);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `irontrack-backup-${date}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data exported successfully', 'success');
    } catch {
      showToast('Export failed', 'error');
    }
  };

  // ── Import ────────────────────────────────────────────────────────────────
  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    try {
      const text = await file.text();
      await importAllData(text);
      showToast('Data imported! Reload to see changes.', 'success');
    } catch {
      showToast('Import failed – invalid file', 'error');
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // ── Reset ─────────────────────────────────────────────────────────────────
  const handleReset = async () => {
    setShowResetModal(false);
    try {
      await resetAll();
    } catch {
      showToast('Reset failed', 'error');
    }
  };

  const divider = <div className="h-px bg-[#1e1e1e] mx-4" />;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-28">
      <ToastContainer toasts={toasts} />

      {/* Header */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#2a2a2a] px-4 py-4 flex items-center gap-3">
        <SettingsIcon size={20} className="text-[#ef4444]" />
        <h1 className="text-[#f5f5f5] text-xl font-bold">Settings</h1>
      </div>

      {/* ── PREFERENCES ─────────────────────────────────────── */}
      <SectionHeader icon={Monitor} title="Preferences" />
      <div className="mx-4 bg-[#111111] rounded-2xl border border-[#2a2a2a] overflow-hidden">

        {/* Units */}
        <SettingRow label="Units" sublabel="Weight and distance">
          <div className="flex bg-[#1a1a1a] rounded-lg p-0.5">
            {(['metric', 'imperial'] as const).map(u => (
              <button
                key={u}
                onClick={() => save({ units: u }, 'Units')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                  ${settings.units === u
                    ? 'bg-[#ef4444] text-white shadow'
                    : 'text-[#888888] hover:text-[#f5f5f5]'}`}
              >
                {u === 'metric' ? 'Metric (kg)' : 'Imperial (lbs)'}
              </button>
            ))}
          </div>
        </SettingRow>
        {divider}

        {/* Theme */}
        <SettingRow label="Theme" sublabel="App appearance">
          <div className="flex bg-[#1a1a1a] rounded-lg p-0.5">
            {([['dark', Moon], ['light', Sun]] as const).map(([t, Icon]) => (
              <button
                key={t}
                onClick={() => save({ theme: t }, 'Theme')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                  ${settings.theme === t
                    ? 'bg-[#ef4444] text-white shadow'
                    : 'text-[#888888] hover:text-[#f5f5f5]'}`}
              >
                <Icon size={12} />
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </SettingRow>
        {divider}

        {/* Accent Color */}
        <SettingRow label="Accent Color" sublabel="Primary highlight color">
          <ColorPicker
            value={settings.accentColor}
            onChange={c => save({ accentColor: c }, 'Accent color')}
          />
        </SettingRow>
        {divider}

        {/* Week Start */}
        <SettingRow label="Week starts on" sublabel="Calendar and schedule">
          <div className="flex bg-[#1a1a1a] rounded-lg p-0.5">
            {([['Mon', 1], ['Sun', 0]] as [string, 0 | 1][]).map(([label, val]) => (
              <button
                key={val}
                onClick={() => save({ weekStartDay: val }, 'Week start')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all
                  ${settings.weekStartDay === val
                    ? 'bg-[#ef4444] text-white shadow'
                    : 'text-[#888888] hover:text-[#f5f5f5]'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </SettingRow>
        {divider}

        {/* Language */}
        <SettingRow label="Language" sublabel="App display language">
          <div className="flex items-center gap-2 text-[#888888] text-sm">
            <Globe size={14} />
            <span className="text-[#f5f5f5] text-sm font-medium">English</span>
            <ChevronRight size={14} className="opacity-40" />
          </div>
        </SettingRow>
      </div>

      {/* ── WORKOUT ─────────────────────────────────────────── */}
      <SectionHeader icon={Dumbbell} title="Workout" />
      <div className="mx-4 bg-[#111111] rounded-2xl border border-[#2a2a2a] overflow-hidden">

        {/* Default Rest Timer */}
        <SettingRow label="Default rest timer" sublabel={`${settings.defaultRestSeconds}s between sets`}>
          <div className="flex items-center gap-2">
            <Clock size={14} className="text-[#888888]" />
            <input
              type="number"
              min={30}
              max={300}
              step={15}
              value={settings.defaultRestSeconds}
              onChange={e => {
                const v = Number(e.target.value);
                if (v >= 30 && v <= 300) save({ defaultRestSeconds: v });
              }}
              onBlur={() => showToast('Rest timer saved', 'success')}
              className="w-20 bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-sm text-[#f5f5f5] text-center focus:outline-none focus:border-[#ef4444]"
            />
            <span className="text-[#888888] text-xs">sec</span>
          </div>
        </SettingRow>
        {divider}

        {/* Warm-up Suggestion */}
        <SettingRow label="Warm-up suggestions" sublabel="Show warm-up sets before working sets">
          <Toggle
            checked={settings.showWarmupSuggestion}
            onChange={v => save({ showWarmupSuggestion: v }, 'Warm-up suggestions')}
          />
        </SettingRow>
        {divider}

        {/* Deload Reminder */}
        <SettingRow label="Deload reminder" sublabel="Remind to deload every N weeks">
          <div className="flex items-center gap-2">
            <select
              value={settings.deloadReminderWeeks}
              onChange={e => save({ deloadReminderWeeks: Number(e.target.value) }, 'Deload reminder')}
              className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#ef4444] appearance-none pr-6"
            >
              {[4, 6, 8, 10].map(w => (
                <option key={w} value={w}>{w} weeks</option>
              ))}
            </select>
          </div>
        </SettingRow>
      </div>

      {/* ── NOTIFICATIONS ───────────────────────────────────── */}
      <SectionHeader icon={Bell} title="Notifications" />
      <div className="mx-4 bg-[#111111] rounded-2xl border border-[#2a2a2a] overflow-hidden">

        <SettingRow label="Enable notifications" sublabel="Allow push notifications">
          <Toggle
            checked={settings.notificationsEnabled}
            onChange={handleNotificationsToggle}
          />
        </SettingRow>

        <AnimatePresence>
          {settings.notificationsEnabled && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              {divider}
              <SettingRow label="Workout reminder" sublabel="Daily reminder to work out">
                <Toggle
                  checked={settings.workoutReminderEnabled}
                  onChange={v => save({ workoutReminderEnabled: v }, 'Workout reminder')}
                />
              </SettingRow>
              <AnimatePresence>
                {settings.workoutReminderEnabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    {divider}
                    <SettingRow label="Reminder time" sublabel="What time to remind you">
                      <input
                        type="time"
                        value={reminderTime}
                        onChange={e => setReminderTime(e.target.value)}
                        onBlur={() => showToast('Reminder time saved', 'success')}
                        className="bg-[#1a1a1a] border border-[#2a2a2a] rounded-lg px-2 py-1.5 text-sm text-[#f5f5f5] focus:outline-none focus:border-[#ef4444]"
                      />
                    </SettingRow>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── FEATURES ────────────────────────────────────────── */}
      <SectionHeader icon={ChevronRight} title="Features" />
      <div className="mx-4 bg-[#111111] rounded-2xl border border-[#2a2a2a] overflow-hidden">

        <SettingRow label="Water tracking" sublabel="Log daily water intake">
          <Toggle
            checked={settings.waterTrackingEnabled}
            onChange={v => save({ waterTrackingEnabled: v }, 'Water tracking')}
          />
        </SettingRow>
        {divider}

        <SettingRow label="Progress photos" sublabel="Track physique with photos">
          <Toggle
            checked={settings.progressPhotosEnabled}
            onChange={v => save({ progressPhotosEnabled: v }, 'Progress photos')}
          />
        </SettingRow>
        {divider}

        <SettingRow label="Achievements" sublabel="Unlock badges for milestones">
          <Toggle
            checked={settings.achievementsEnabled}
            onChange={v => save({ achievementsEnabled: v }, 'Achievements')}
          />
        </SettingRow>
        {divider}

        <SettingRow label="Rest timer sound" sublabel="Play sound when rest ends">
          <Toggle
            checked={settings.restTimerSound}
            onChange={v => save({ restTimerSound: v }, 'Rest timer sound')}
          />
        </SettingRow>
        {divider}

        <SettingRow label="Rest timer vibration" sublabel="Vibrate when rest ends">
          <Toggle
            checked={settings.restTimerVibration}
            onChange={v => save({ restTimerVibration: v }, 'Rest timer vibration')}
          />
        </SettingRow>
      </div>

      {/* ── DATA ────────────────────────────────────────────── */}
      <SectionHeader icon={Database} title="Data" />
      <div className="mx-4 bg-[#111111] rounded-2xl border border-[#2a2a2a] overflow-hidden">

        {/* Export */}
        <button
          onClick={handleExport}
          className="w-full flex items-center justify-between px-4 py-4 min-h-[56px] hover:bg-[#1a1a1a] active:bg-[#222222] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#06b6d4]/10 flex items-center justify-center">
              <Download size={16} className="text-[#06b6d4]" />
            </div>
            <div className="text-left">
              <p className="text-[#f5f5f5] text-sm font-medium">Export Data</p>
              <p className="text-[#888888] text-xs">Download backup as JSON</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-[#444444]" />
        </button>
        {divider}

        {/* Import */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          className="w-full flex items-center justify-between px-4 py-4 min-h-[56px] hover:bg-[#1a1a1a] active:bg-[#222222] transition-colors disabled:opacity-50"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#22c55e]/10 flex items-center justify-center">
              {importing
                ? <RefreshCw size={16} className="text-[#22c55e] animate-spin" />
                : <Upload size={16} className="text-[#22c55e]" />
              }
            </div>
            <div className="text-left">
              <p className="text-[#f5f5f5] text-sm font-medium">Import Data</p>
              <p className="text-[#888888] text-xs">{importing ? 'Importing…' : 'Restore from JSON backup'}</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-[#444444]" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          className="hidden"
          onChange={handleImport}
        />
        {divider}

        {/* Reset */}
        <button
          onClick={() => setShowResetModal(true)}
          className="w-full flex items-center justify-between px-4 py-4 min-h-[56px] hover:bg-[#1a1a1a] active:bg-[#222222] transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#ef4444]/10 flex items-center justify-center">
              <Trash2 size={16} className="text-[#ef4444]" />
            </div>
            <div className="text-left">
              <p className="text-[#ef4444] text-sm font-semibold">Reset All Data</p>
              <p className="text-[#888888] text-xs">Permanently delete everything</p>
            </div>
          </div>
          <ChevronRight size={16} className="text-[#444444]" />
        </button>
      </div>

      {/* ── ABOUT ───────────────────────────────────────────── */}
      <SectionHeader icon={Info} title="About" />
      <div className="mx-4 bg-[#111111] rounded-2xl border border-[#2a2a2a] overflow-hidden mb-4">

        <SettingRow label="App Version" sublabel="IronTrack">
          <span className="text-[#888888] text-sm font-mono">1.0.0</span>
        </SettingRow>
        {divider}

        <div className="px-4 py-4">
          <p className="text-xs text-[#888888] uppercase tracking-wider font-semibold mb-2">Disclaimer</p>
          <p className="text-[#888888] text-sm leading-relaxed">
            IronTrack provides general fitness guidance, not medical advice. Consult a doctor before starting any exercise program, especially if you have existing health conditions.
          </p>
        </div>
        {divider}

        <div className="px-4 py-4">
          <p className="text-xs text-[#888888] uppercase tracking-wider font-semibold mb-2">Credits</p>
          <p className="text-[#888888] text-sm leading-relaxed">
            Built with ❤️ using React, TypeScript, Tailwind CSS, Recharts, Framer Motion, and Lucide icons.
          </p>
        </div>
      </div>

      {/* Reset Modal */}
      <AnimatePresence>
        {showResetModal && (
          <ResetModal
            onClose={() => setShowResetModal(false)}
            onConfirm={handleReset}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
