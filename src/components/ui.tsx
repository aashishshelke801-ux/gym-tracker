import React, { useState, useEffect, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, Trophy } from 'lucide-react';

// ─── Toast System ──────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'info' | 'pr';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType, duration?: number) => void;
}

const ToastContext = React.createContext<ToastContextValue>({ showToast: () => {} });

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: ToastType = 'success', duration = 3000) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(prev => [...prev, { id, message, type, duration }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 max-w-xs w-full pointer-events-none">
        {toasts.map(toast => (
          <ToastItem key={toast.id} toast={toast} onDismiss={() => setToasts(prev => prev.filter(t => t.id !== toast.id))} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={18} className="text-green-400 shrink-0" />,
    error: <AlertCircle size={18} className="text-red-400 shrink-0" />,
    info: <Info size={18} className="text-blue-400 shrink-0" />,
    pr: <Trophy size={18} className="text-yellow-400 shrink-0" />,
  };
  const borders: Record<ToastType, string> = {
    success: 'border-green-500/30',
    error: 'border-red-500/30',
    info: 'border-blue-500/30',
    pr: 'border-yellow-500/30',
  };

  return (
    <div className={`pointer-events-auto flex items-start gap-3 p-3 rounded-xl bg-[#1a1a1a] border ${borders[toast.type]} shadow-xl`}>
      {icons[toast.type]}
      <span className="text-sm text-[#f5f5f5] flex-1 leading-snug">{toast.message}</span>
      <button onClick={onDismiss} className="text-[#888] hover:text-[#f5f5f5] transition-colors">
        <X size={14} />
      </button>
    </div>
  );
}

export function useToast() {
  return React.useContext(ToastContext);
}

// ─── Modal ────────────────────────────────────────────────────────────────────

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'full';
}

export function Modal({ isOpen, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const sizes = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-2xl', full: 'max-w-full h-full' };

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div
        className={`relative w-full ${sizes[size]} bg-[#111111] border border-[#2a2a2a] rounded-t-2xl sm:rounded-2xl overflow-hidden shadow-2xl max-h-[90vh] flex flex-col`}
        onClick={e => e.stopPropagation()}
      >
        {title && (
          <div className="flex items-center justify-between p-4 border-b border-[#2a2a2a] shrink-0">
            <h2 className="font-bold text-[#f5f5f5] text-lg">{title}</h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-[#222] transition-colors">
              <X size={20} className="text-[#888]" />
            </button>
          </div>
        )}
        <div className="overflow-y-auto flex-1">
          {children}
        </div>
      </div>
    </div>
  );
}

// ─── Confirm Dialog ───────────────────────────────────────────────────────────

interface ConfirmProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({ isOpen, title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm, onCancel, danger = false }: ConfirmProps) {
  if (!isOpen) return null;
  return (
    <Modal isOpen={isOpen} onClose={onCancel} title={title} size="sm">
      <div className="p-4 space-y-4">
        <p className="text-[#888] text-sm leading-relaxed">{message}</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-[#2a2a2a] text-[#f5f5f5] text-sm font-medium hover:bg-[#222] transition-colors">
            {cancelText}
          </button>
          <button
            onClick={onConfirm}
            className={`flex-1 py-2.5 rounded-xl text-white text-sm font-bold transition-colors ${danger ? 'bg-red-600 hover:bg-red-700' : 'bg-[#ef4444] hover:bg-[#dc2626]'}`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Progress Bar ─────────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  height?: string;
  showLabel?: boolean;
  label?: string;
}

export function ProgressBar({ value, max, color = '#ef4444', height = 'h-2', showLabel, label }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0;
  return (
    <div className="w-full">
      {showLabel && (
        <div className="flex justify-between mb-1">
          <span className="text-xs text-[#888]">{label}</span>
          <span className="text-xs text-[#f5f5f5]">{Math.round(value)} / {Math.round(max)}</span>
        </div>
      )}
      <div className={`w-full ${height} bg-[#2a2a2a] rounded-full overflow-hidden`}>
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}

// ─── Empty State ──────────────────────────────────────────────────────────────

export function EmptyState({ icon, title, message, action }: {
  icon: React.ReactNode;
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6 text-center gap-3">
      <div className="text-4xl opacity-50">{icon}</div>
      <h3 className="font-bold text-[#f5f5f5] text-lg">{title}</h3>
      <p className="text-[#888] text-sm max-w-xs leading-relaxed">{message}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

// ─── Badge ────────────────────────────────────────────────────────────────────

export function Badge({ children, color = '#ef4444' }: { children: React.ReactNode; color?: string }) {
  return (
    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: color }}>
      {children}
    </span>
  );
}

// ─── Chip ─────────────────────────────────────────────────────────────────────

export function Chip({ children, active, onClick }: { children: React.ReactNode; active?: boolean; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${
        active
          ? 'bg-[#ef4444] border-[#ef4444] text-white'
          : 'border-[#2a2a2a] text-[#888] hover:border-[#ef4444] hover:text-[#ef4444]'
      }`}
    >
      {children}
    </button>
  );
}

// ─── Toggle ───────────────────────────────────────────────────────────────────

export function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-12 h-6 rounded-full transition-colors ${checked ? 'bg-[#ef4444]' : 'bg-[#2a2a2a]'}`}
    >
      <span
        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${checked ? 'translate-x-6' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

// ─── Input ────────────────────────────────────────────────────────────────────

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-[#888] mb-1.5">{label}</label>}
      <input
        className={`w-full px-3 py-2.5 bg-[#1a1a1a] border ${error ? 'border-red-500' : 'border-[#2a2a2a]'} rounded-xl text-[#f5f5f5] text-sm placeholder-[#555] focus:outline-none focus:border-[#ef4444] transition-colors ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-400 mt-1">{error}</p>}
    </div>
  );
}

// ─── Select ───────────────────────────────────────────────────────────────────

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string }[];
}

export function Select({ label, options, className = '', ...props }: SelectProps) {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-medium text-[#888] mb-1.5">{label}</label>}
      <select
        className={`w-full px-3 py-2.5 bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl text-[#f5f5f5] text-sm focus:outline-none focus:border-[#ef4444] transition-colors appearance-none ${className}`}
        {...props}
      >
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
    </div>
  );
}

// ─── Card ─────────────────────────────────────────────────────────────────────

export function Card({ children, className = '', onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <div
      className={`bg-[#111111] border border-[#2a2a2a] rounded-2xl ${onClick ? 'cursor-pointer card-hover' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

export function SectionHeader({ title, action }: { title: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-bold text-[#f5f5f5] text-base">{title}</h2>
      {action}
    </div>
  );
}

// ─── Muscle color map ─────────────────────────────────────────────────────────

export const MUSCLE_COLORS: Record<string, string> = {
  chest: '#ef4444',
  shoulders: '#f97316',
  back: '#3b82f6',
  biceps: '#8b5cf6',
  triceps: '#ec4899',
  legs: '#22c55e',
  hamstrings: '#16a34a',
  glutes: '#15803d',
  calves: '#4ade80',
  core: '#f59e0b',
  forearms: '#06b6d4',
  fullBody: '#6b7280',
};

export function muscleLabel(m: string): string {
  const labels: Record<string, string> = {
    chest: 'Chest', shoulders: 'Shoulders', back: 'Back',
    biceps: 'Biceps', triceps: 'Triceps', legs: 'Legs',
    hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves',
    core: 'Core', forearms: 'Forearms', fullBody: 'Full Body',
  };
  return labels[m] ?? m;
}

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatDate(date: string): string {
  return new Date(date + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric'
  });
}
