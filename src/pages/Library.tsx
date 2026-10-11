import React, { useState, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search, Heart, Plus, Edit2, Trash2, X, ChevronDown,
  Dumbbell, Zap, AlertTriangle, CheckCircle, Info,
  BarChart2, Clock, RotateCcw, Camera, BookOpen, Lightbulb, Trophy
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { Exercise, MuscleGroup, Equipment, Difficulty } from '../types';
import ExerciseImage from '../components/ExerciseImage';

// ─── Constants ────────────────────────────────────────────────────────────────

const MUSCLE_COLORS: Record<string, string> = {
  chest: '#ef4444',
  shoulders: '#f97316',
  back: '#3b82f6',
  biceps: '#8b5cf6',
  triceps: '#ec4899',
  legs: '#22c55e',
  core: '#f59e0b',
  forearms: '#06b6d4',
  hamstrings: '#84cc16',
  glutes: '#a855f7',
  calves: '#14b8a6',
  fullBody: '#6366f1',
};

const MUSCLE_FILTERS = [
  'All', 'Chest', 'Shoulders', 'Back', 'Biceps', 'Triceps', 'Legs', 'Core', 'Arms',
] as const;

const EQUIPMENT_FILTERS = [
  'All', 'Dumbbell', 'Cable', 'Machine', 'Barbell', 'Bodyweight',
] as const;

const EQUIPMENT_ICONS: Record<string, string> = {
  barbell: '🏋️',
  dumbbell: '🪀',
  cable: '⚡',
  machine: '🤖',
  bodyweight: '🧘',
  ezBar: '🔧',
  bands: '🔁',
};

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  beginner: '#22c55e',
  intermediate: '#f59e0b',
  advanced: '#ef4444',
};

const ALL_MUSCLES: MuscleGroup[] = [
  'chest', 'shoulders', 'back', 'biceps', 'triceps', 'legs', 'core',
  'forearms', 'hamstrings', 'glutes', 'calves', 'fullBody',
];
const ALL_EQUIPMENT: Equipment[] = ['barbell', 'dumbbell', 'cable', 'machine', 'bodyweight', 'ezBar', 'bands'];
const ALL_DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];

// ─── Helper: map filter label → MuscleGroup keys ──────────────────────────────

function filterToMuscles(filter: string): MuscleGroup[] {
  switch (filter.toLowerCase()) {
    case 'chest': return ['chest'];
    case 'shoulders': return ['shoulders'];
    case 'back': return ['back'];
    case 'biceps': return ['biceps'];
    case 'triceps': return ['triceps'];
    case 'legs': return ['legs', 'hamstrings', 'glutes', 'calves'];
    case 'core': return ['core'];
    case 'arms': return ['biceps', 'triceps', 'forearms'];
    default: return [];
  }
}

function filterToEquipment(filter: string): Equipment | null {
  const map: Record<string, Equipment> = {
    dumbbell: 'dumbbell', cable: 'cable', machine: 'machine',
    barbell: 'barbell', bodyweight: 'bodyweight',
  };
  return map[filter.toLowerCase()] ?? null;
}

function getExerciseColor(muscle: MuscleGroup): string {
  return MUSCLE_COLORS[muscle] ?? '#888888';
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ─── Blank exercise template ───────────────────────────────────────────────────

function blankExercise(): Exercise {
  return {
    id: '',
    name: '',
    primaryMuscle: 'chest',
    secondaryMuscles: [],
    equipment: 'dumbbell',
    difficulty: 'beginner',
    instructions: [''],
    tips: [''],
    commonMistakes: [''],
    safetyTips: [''],
    alternativeExercise: '',
    image: '',
    imageUrl: '',
    isCustom: true,
    isFavorite: false,
    defaultSets: 3,
    defaultReps: '8-12',
    defaultRestSeconds: 90,
  };
}

// ─── Subcomponents ────────────────────────────────────────────────────────────

function MuscleChip({ muscle, small }: { muscle: MuscleGroup; small?: boolean }) {
  const color = getExerciseColor(muscle);
  return (
    <span
      className={`inline-block rounded-full font-medium ${small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-0.5 text-xs'}`}
      style={{ backgroundColor: color + '22', color }}
    >
      {capitalize(muscle)}
    </span>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  const color = DIFFICULTY_COLORS[difficulty];
  return (
    <span
      className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
      style={{ backgroundColor: color + '22', color }}
    >
      {difficulty}
    </span>
  );
}

// ─── Exercise Card ─────────────────────────────────────────────────────────────

interface ExerciseCardProps {
  exercise: Exercise;
  onTap: () => void;
  onFavorite: () => void;
}

function ExerciseCard({ exercise, onTap, onFavorite }: ExerciseCardProps) {
  const imageSrc = exercise.image || exercise.imageUrl;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileTap={{ scale: 0.97 }}
      className="bg-[#111111] rounded-2xl border border-[#2a2a2a] hover:border-[#3a3a3a] overflow-hidden cursor-pointer transition-colors shadow-sm flex flex-col group"
      onClick={onTap}
    >
      {/* 4:3 Image container with overlay buttons */}
      <div className="relative w-full overflow-hidden bg-[#161616]">
        <ExerciseImage
          src={imageSrc}
          alt={exercise.name}
          aspectRatio="4/3"
          fallbackIconSize={26}
          showFallbackLabel={false}
          className="group-hover:scale-105 transition-transform duration-300"
        />

        {/* Favorite button */}
        <button
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-90"
          onClick={e => { e.stopPropagation(); onFavorite(); }}
          aria-label="Toggle favourite"
        >
          <Heart
            size={14}
            fill={exercise.isFavorite ? '#ef4444' : 'none'}
            stroke={exercise.isFavorite ? '#ef4444' : '#aaaaaa'}
          />
        </button>

        {/* Custom badge */}
        {exercise.isCustom && (
          <span className="absolute top-2 left-2 bg-[#ef4444]/90 backdrop-blur-sm text-white text-[9px] font-bold rounded px-1.5 py-0.5 uppercase tracking-wide">
            Custom
          </span>
        )}
      </div>

      {/* Info */}
      <div className="p-3 space-y-1.5 flex-1 flex flex-col justify-between">
        <div>
          <p className="text-[#f5f5f5] text-xs sm:text-sm font-semibold leading-tight line-clamp-2">{exercise.name}</p>
          <div className="mt-1">
            <MuscleChip muscle={exercise.primaryMuscle} small />
          </div>
        </div>
        <div className="flex items-center justify-between pt-1 border-t border-[#1e1e1e]">
          <span className="text-[#888888] text-[11px] capitalize truncate">
            {exercise.equipment}
          </span>
          <DifficultyBadge difficulty={exercise.difficulty} />
        </div>
      </div>
    </motion.div>
  );
}

// ─── Exercise Detail Modal ─────────────────────────────────────────────────────

interface DetailModalProps {
  exercise: Exercise;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onFavorite: () => void;
  usedInWorkouts: boolean;
  personalRecord: { heaviestWeightKg: number; bestReps: number; estimated1RM: number } | null;
  recentSessions: { date: string; weight: number | null; reps: number | null }[];
}

function DetailModal({
  exercise, onClose, onEdit, onDelete, onFavorite, usedInWorkouts, personalRecord, recentSessions
}: DetailModalProps) {
  const [tab, setTab] = useState<'instructions' | 'tips' | 'records'>('instructions');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const color = getExerciseColor(exercise.primaryMuscle);
  const imageSrc = exercise.image || exercise.imageUrl;

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="absolute inset-x-0 bottom-0 bg-[#111111] rounded-t-3xl overflow-hidden flex flex-col"
        style={{ maxHeight: '92vh' }}
      >
        {/* Header image */}
        <div
          className="w-full h-56 sm:h-64 relative flex-shrink-0 bg-[#161616]"
        >
          <ExerciseImage
            src={imageSrc}
            alt={exercise.name}
            aspectRatio="auto"
            className="w-full h-full"
            fallbackIconSize={36}
            showFallbackLabel={true}
          />

          {/* Close */}
          <button
            className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center transition-transform active:scale-90"
            onClick={onClose}
          >
            <X size={18} color="#f5f5f5" />
          </button>
          {/* Actions */}
          <div className="absolute top-4 left-4 flex gap-2">
            <button
              className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center"
              onClick={onFavorite}
            >
              <Heart size={16} fill={exercise.isFavorite ? '#ef4444' : 'none'} stroke={exercise.isFavorite ? '#ef4444' : '#f5f5f5'} />
            </button>
            <button
              className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center"
              onClick={onEdit}
            >
              <Edit2 size={15} color="#f5f5f5" />
            </button>
            <button
              className="w-9 h-9 rounded-full bg-black/50 flex items-center justify-center"
              onClick={() => setConfirmDelete(true)}
            >
              <Trash2 size={15} color="#ef4444" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 pb-8">
          {/* Title + meta */}
          <div className="pt-4 pb-3 space-y-2">
            <h2 className="text-[#f5f5f5] text-xl font-bold">{exercise.name}</h2>
            <div className="flex flex-wrap gap-1.5 items-center">
              <MuscleChip muscle={exercise.primaryMuscle} />
              {exercise.secondaryMuscles.map(m => (
                <MuscleChip key={m} muscle={m} small />
              ))}
            </div>
            <div className="flex items-center gap-3 text-sm text-[#888888]">
              <span>{EQUIPMENT_ICONS[exercise.equipment]} {capitalize(exercise.equipment)}</span>
              <span>·</span>
              <DifficultyBadge difficulty={exercise.difficulty} />
              {exercise.isCustom && (
                <>
                  <span>·</span>
                  <span className="text-[#ef4444] text-xs font-semibold">Custom</span>
                </>
              )}
            </div>
            <div className="flex items-center gap-4 text-sm text-[#888888] pt-1">
              <span className="flex items-center gap-1"><BarChart2 size={13} /> {exercise.defaultSets} sets</span>
              <span className="flex items-center gap-1"><Dumbbell size={13} /> {exercise.defaultReps} reps</span>
              <span className="flex items-center gap-1"><Clock size={13} /> {exercise.defaultRestSeconds}s rest</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-0 rounded-xl bg-[#1a1a1a] p-1 mb-4">
            {(['instructions', 'tips', 'records'] as const).map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
                  tab === t ? 'bg-[#ef4444] text-white' : 'text-[#888888]'
                }`}
              >
                {t === 'instructions' ? 'Instructions' : t === 'tips' ? 'Tips' : 'My Records'}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {tab === 'instructions' && (
            <div className="space-y-4">
              {exercise.instructions.length > 0 && (
                <section>
                  <h3 className="text-[#f5f5f5] font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <BookOpen size={14} color="#ef4444" /> Step-by-Step
                  </h3>
                  <ol className="space-y-2">
                    {exercise.instructions.map((step, i) => (
                      <li key={i} className="flex gap-3 text-sm text-[#f5f5f5]/80">
                        <span
                          className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                          style={{ backgroundColor: getExerciseColor(exercise.primaryMuscle) }}
                        >
                          {i + 1}
                        </span>
                        <span className="pt-0.5">{step}</span>
                      </li>
                    ))}
                  </ol>
                </section>
              )}
              {exercise.commonMistakes.length > 0 && (
                <section>
                  <h3 className="text-[#f5f5f5] font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <X size={14} color="#ef4444" /> Common Mistakes
                  </h3>
                  <ul className="space-y-1.5">
                    {exercise.commonMistakes.map((m, i) => (
                      <li key={i} className="flex gap-2 text-sm text-[#f5f5f5]/80">
                        <X size={14} className="mt-0.5 flex-shrink-0" color="#ef4444" />
                        {m}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              {exercise.safetyTips.length > 0 && (
                <section>
                  <h3 className="text-[#f5f5f5] font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <AlertTriangle size={14} color="#f59e0b" /> Safety Tips
                  </h3>
                  <ul className="space-y-1.5">
                    {exercise.safetyTips.map((s, i) => (
                      <li key={i} className="flex gap-2 text-sm text-[#f5f5f5]/80">
                        <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" color="#f59e0b" />
                        {s}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          )}

          {tab === 'tips' && (
            <div className="space-y-4">
              {exercise.tips.length > 0 && (
                <section>
                  <h3 className="text-[#f5f5f5] font-semibold text-sm mb-2 flex items-center gap-1.5">
                    <Lightbulb size={14} color="#f59e0b" /> Pro Tips
                  </h3>
                  <ul className="space-y-2">
                    {exercise.tips.map((tip, i) => (
                      <li key={i} className="flex gap-2 text-sm text-[#f5f5f5]/80">
                        <CheckCircle size={14} className="mt-0.5 flex-shrink-0" color="#22c55e" />
                        {tip}
                      </li>
                    ))}
                  </ul>
                </section>
              )}
              <section className="bg-[#1a1a1a] rounded-xl p-3 space-y-2">
                <h3 className="text-[#f5f5f5] font-semibold text-sm">Recommended Protocol</h3>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { label: 'Sets', val: exercise.defaultSets },
                    { label: 'Reps', val: exercise.defaultReps },
                    { label: 'Rest', val: `${exercise.defaultRestSeconds}s` },
                  ].map(item => (
                    <div key={item.label} className="bg-[#222222] rounded-lg p-2 text-center">
                      <div className="text-[#ef4444] text-base font-bold">{item.val}</div>
                      <div className="text-[#888888] text-[10px]">{item.label}</div>
                    </div>
                  ))}
                </div>
              </section>
              {exercise.alternativeExercise && (
                <section className="flex items-center gap-2 bg-[#1a1a1a] rounded-xl px-3 py-2.5">
                  <RotateCcw size={14} color="#8b5cf6" />
                  <div>
                    <p className="text-[#888888] text-[10px]">Alternative</p>
                    <p className="text-[#f5f5f5] text-sm font-medium">{exercise.alternativeExercise}</p>
                  </div>
                </section>
              )}
            </div>
          )}

          {tab === 'records' && (
            <div className="space-y-4">
              {personalRecord ? (
                <section className="bg-[#1a1a1a] rounded-xl p-4">
                  <h3 className="text-[#f5f5f5] font-semibold text-sm mb-3 flex items-center gap-1.5">
                    <Trophy size={14} color="#f59e0b" /> Personal Records
                  </h3>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { label: 'Heaviest', val: `${personalRecord.heaviestWeightKg}kg` },
                      { label: 'Best Reps', val: personalRecord.bestReps },
                      { label: 'Est. 1RM', val: `${personalRecord.estimated1RM.toFixed(1)}kg` },
                    ].map(item => (
                      <div key={item.label} className="bg-[#222222] rounded-lg p-2 text-center">
                        <div className="text-[#ef4444] text-sm font-bold">{item.val}</div>
                        <div className="text-[#888888] text-[10px] mt-0.5">{item.label}</div>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <div className="bg-[#1a1a1a] rounded-xl p-4 text-center">
                  <Trophy size={28} color="#2a2a2a" className="mx-auto mb-2" />
                  <p className="text-[#888888] text-sm">No records yet. Complete a workout to set your first PR!</p>
                </div>
              )}
              {recentSessions.length > 0 ? (
                <section>
                  <h3 className="text-[#f5f5f5] font-semibold text-sm mb-2">Recent Sessions</h3>
                  <div className="bg-[#1a1a1a] rounded-xl overflow-hidden">
                    <div className="grid grid-cols-3 px-4 py-2 border-b border-[#2a2a2a]">
                      {['Date', 'Weight', 'Reps'].map(h => (
                        <span key={h} className="text-[#888888] text-xs font-semibold">{h}</span>
                      ))}
                    </div>
                    {recentSessions.slice(0, 8).map((s, i) => (
                      <div key={i} className="grid grid-cols-3 px-4 py-2.5 border-b border-[#2a2a2a]/50 last:border-0">
                        <span className="text-[#f5f5f5] text-xs">{new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                        <span className="text-[#f5f5f5] text-xs">{s.weight != null ? `${s.weight}kg` : '—'}</span>
                        <span className="text-[#f5f5f5] text-xs">{s.reps ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                </section>
              ) : (
                <p className="text-[#888888] text-sm text-center pt-2">No session history yet.</p>
              )}
            </div>
          )}
        </div>

        {/* Confirm delete */}
        <AnimatePresence>
          {confirmDelete && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/70 flex items-end"
            >
              <motion.div
                initial={{ y: 80 }}
                animate={{ y: 0 }}
                exit={{ y: 80 }}
                className="w-full bg-[#1a1a1a] rounded-t-2xl p-6 space-y-4"
              >
                <h3 className="text-[#f5f5f5] font-semibold text-base">Delete Exercise?</h3>
                {usedInWorkouts && (
                  <div className="flex gap-2 bg-[#f59e0b]/10 rounded-xl p-3">
                    <AlertTriangle size={16} color="#f59e0b" className="flex-shrink-0 mt-0.5" />
                    <p className="text-[#f59e0b] text-sm">This exercise is used in one or more workouts. Deleting it will remove it from those workouts.</p>
                  </div>
                )}
                <p className="text-[#888888] text-sm">This action cannot be undone.</p>
                <div className="flex gap-3">
                  <button
                    className="flex-1 py-3 rounded-xl bg-[#222222] text-[#f5f5f5] font-semibold"
                    onClick={() => setConfirmDelete(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="flex-1 py-3 rounded-xl bg-[#ef4444] text-white font-semibold"
                    onClick={onDelete}
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ─── Add / Edit Modal ─────────────────────────────────────────────────────────

interface EditModalProps {
  initial: Exercise;
  onClose: () => void;
  onSave: (e: Exercise) => void;
}

function EditModal({ initial, onClose, onSave }: EditModalProps) {
  const [form, setForm] = useState<Exercise>({ ...initial });
  const fileRef = useRef<HTMLInputElement>(null);

  const update = <K extends keyof Exercise>(key: K, val: Exercise[K]) =>
    setForm(f => ({ ...f, [key]: val }));

  const updateList = (key: 'instructions' | 'tips' | 'commonMistakes' | 'safetyTips', index: number, val: string) => {
    setForm(f => {
      const arr = [...f[key]];
      arr[index] = val;
      return { ...f, [key]: arr };
    });
  };

  const addListItem = (key: 'instructions' | 'tips' | 'commonMistakes' | 'safetyTips') =>
    setForm(f => ({ ...f, [key]: [...f[key], ''] }));

  const removeListItem = (key: 'instructions' | 'tips' | 'commonMistakes' | 'safetyTips', index: number) =>
    setForm(f => ({ ...f, [key]: f[key].filter((_, i) => i !== index) }));

  const toggleSecondary = (m: MuscleGroup) => {
    setForm(f => {
      const has = f.secondaryMuscles.includes(m);
      return {
        ...f,
        secondaryMuscles: has
          ? f.secondaryMuscles.filter(x => x !== m)
          : [...f.secondaryMuscles, m],
      };
    });
  };

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const result = ev.target?.result as string;
      // Compress via canvas
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        const ratio = Math.min(maxDim / img.width, maxDim / img.height, 1);
        canvas.width = img.width * ratio;
        canvas.height = img.height * ratio;
        const ctx = canvas.getContext('2d')!;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.8);
        update('image', compressed);
        update('imageUrl', compressed);
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  const handleSave = () => {
    if (!form.name.trim()) return;
    const id = form.id || `custom-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    onSave({
      ...form,
      id,
      name: form.name.trim(),
      image: form.image || form.imageUrl || '',
      imageUrl: form.image || form.imageUrl || '',
      instructions: form.instructions.filter(s => s.trim()),
      tips: form.tips.filter(s => s.trim()),
      commonMistakes: form.commonMistakes.filter(s => s.trim()),
      safetyTips: form.safetyTips.filter(s => s.trim()),
    });
  };

  const inputCls = "w-full bg-[#222222] border border-[#2a2a2a] rounded-xl px-3 py-2.5 text-[#f5f5f5] text-sm focus:outline-none focus:border-[#ef4444] placeholder:text-[#555]";
  const labelCls = "block text-[#888888] text-xs font-semibold mb-1.5 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex flex-col" style={{ background: 'rgba(0,0,0,0.85)' }}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        className="absolute inset-x-0 bottom-0 bg-[#111111] rounded-t-3xl flex flex-col"
        style={{ maxHeight: '94vh' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 pt-5 pb-3 flex-shrink-0">
          <h2 className="text-[#f5f5f5] font-bold text-lg">{initial.id ? 'Edit Exercise' : 'New Exercise'}</h2>
          <button className="w-8 h-8 rounded-full bg-[#222222] flex items-center justify-center" onClick={onClose}>
            <X size={16} color="#888888" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-5">
          {/* Image Upload */}
          <div>
            <label className={labelCls}>Exercise Image</label>
            <div className="flex gap-4 items-center">
              <div className="w-20 h-20 rounded-2xl overflow-hidden border border-[#2a2a2a] bg-[#1a1a1a] flex-shrink-0">
                <ExerciseImage
                  src={form.image || form.imageUrl}
                  alt={form.name || 'Custom Exercise'}
                  aspectRatio="auto"
                  className="w-full h-full"
                  fallbackIconSize={24}
                />
              </div>
              <div className="flex flex-col gap-2 flex-1">
                <button
                  type="button"
                  className="flex items-center justify-center gap-2 bg-[#222222] hover:bg-[#2a2a2a] text-[#f5f5f5] text-xs font-semibold border border-[#333333] rounded-xl px-4 py-2.5 transition-colors"
                  onClick={() => fileRef.current?.click()}
                >
                  <Camera size={15} />
                  <span>{form.image || form.imageUrl ? 'Change Photo' : 'Upload Photo'}</span>
                </button>
                {(form.image || form.imageUrl) && (
                  <button
                    type="button"
                    className="text-xs text-red-400 hover:text-red-300 text-left font-medium"
                    onClick={() => {
                      update('image', '');
                      update('imageUrl', '');
                    }}
                  >
                    Remove photo (use icon)
                  </button>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImage} />
              </div>
            </div>
          </div>

          {/* Name */}
          <div>
            <label className={labelCls}>Exercise Name *</label>
            <input
              className={inputCls}
              placeholder="e.g. Incline Dumbbell Press"
              value={form.name}
              onChange={e => update('name', e.target.value)}
            />
          </div>

          {/* Primary Muscle */}
          <div>
            <label className={labelCls}>Primary Muscle *</label>
            <div className="relative">
              <select
                className={inputCls + ' appearance-none pr-8'}
                value={form.primaryMuscle}
                onChange={e => update('primaryMuscle', e.target.value as MuscleGroup)}
              >
                {ALL_MUSCLES.map(m => (
                  <option key={m} value={m}>{capitalize(m)}</option>
                ))}
              </select>
              <ChevronDown size={14} color="#888" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Secondary Muscles */}
          <div>
            <label className={labelCls}>Secondary Muscles</label>
            <div className="flex flex-wrap gap-2">
              {ALL_MUSCLES.filter(m => m !== form.primaryMuscle).map(m => {
                const selected = form.secondaryMuscles.includes(m);
                return (
                  <button
                    key={m}
                    onClick={() => toggleSecondary(m)}
                    className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-all ${
                      selected
                        ? 'border-transparent text-white'
                        : 'border-[#2a2a2a] text-[#888888]'
                    }`}
                    style={selected ? { backgroundColor: getExerciseColor(m), borderColor: getExerciseColor(m) } : {}}
                  >
                    {capitalize(m)}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Equipment */}
          <div>
            <label className={labelCls}>Equipment *</label>
            <div className="relative">
              <select
                className={inputCls + ' appearance-none pr-8'}
                value={form.equipment}
                onChange={e => update('equipment', e.target.value as Equipment)}
              >
                {ALL_EQUIPMENT.map(eq => (
                  <option key={eq} value={eq}>{capitalize(eq)}</option>
                ))}
              </select>
              <ChevronDown size={14} color="#888" className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Difficulty */}
          <div>
            <label className={labelCls}>Difficulty *</label>
            <div className="grid grid-cols-3 gap-2">
              {ALL_DIFFICULTIES.map(d => (
                <button
                  key={d}
                  onClick={() => update('difficulty', d)}
                  className={`py-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                    form.difficulty === d ? 'border-transparent text-white' : 'border-[#2a2a2a] text-[#888888]'
                  }`}
                  style={form.difficulty === d ? { backgroundColor: DIFFICULTY_COLORS[d] } : {}}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>

          {/* Sets / Reps / Rest */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Sets</label>
              <input
                className={inputCls}
                type="number"
                min="1"
                max="10"
                value={form.defaultSets}
                onChange={e => update('defaultSets', Number(e.target.value))}
              />
            </div>
            <div>
              <label className={labelCls}>Reps</label>
              <input
                className={inputCls}
                placeholder="8-12"
                value={form.defaultReps}
                onChange={e => update('defaultReps', e.target.value)}
              />
            </div>
            <div>
              <label className={labelCls}>Rest (s)</label>
              <input
                className={inputCls}
                type="number"
                min="0"
                step="15"
                value={form.defaultRestSeconds}
                onChange={e => update('defaultRestSeconds', Number(e.target.value))}
              />
            </div>
          </div>

          {/* Instructions */}
          <EditableList
            label="Instructions"
            items={form.instructions}
            onChange={(i, v) => updateList('instructions', i, v)}
            onAdd={() => addListItem('instructions')}
            onRemove={i => removeListItem('instructions', i)}
            placeholder="Step description..."
          />

          {/* Tips */}
          <EditableList
            label="Tips"
            items={form.tips}
            onChange={(i, v) => updateList('tips', i, v)}
            onAdd={() => addListItem('tips')}
            onRemove={i => removeListItem('tips', i)}
            placeholder="Pro tip..."
          />

          {/* Common Mistakes */}
          <EditableList
            label="Common Mistakes"
            items={form.commonMistakes}
            onChange={(i, v) => updateList('commonMistakes', i, v)}
            onAdd={() => addListItem('commonMistakes')}
            onRemove={i => removeListItem('commonMistakes', i)}
            placeholder="Mistake to avoid..."
          />

          {/* Safety Tips */}
          <EditableList
            label="Safety Tips"
            items={form.safetyTips}
            onChange={(i, v) => updateList('safetyTips', i, v)}
            onAdd={() => addListItem('safetyTips')}
            onRemove={i => removeListItem('safetyTips', i)}
            placeholder="Safety note..."
          />

          {/* Alternative */}
          <div>
            <label className={labelCls}>Alternative Exercise</label>
            <input
              className={inputCls}
              placeholder="e.g. Machine Press"
              value={form.alternativeExercise}
              onChange={e => update('alternativeExercise', e.target.value)}
            />
          </div>
        </div>

        {/* Save bar */}
        <div className="px-5 py-4 border-t border-[#2a2a2a] flex-shrink-0">
          <button
            className="w-full py-4 rounded-2xl bg-[#ef4444] text-white font-bold text-base disabled:opacity-40"
            disabled={!form.name.trim()}
            onClick={handleSave}
          >
            Save Exercise
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── EditableList helper ───────────────────────────────────────────────────────

interface EditableListProps {
  label: string;
  items: string[];
  onChange: (i: number, v: string) => void;
  onAdd: () => void;
  onRemove: (i: number) => void;
  placeholder: string;
}

function EditableList({ label, items, onChange, onAdd, onRemove, placeholder }: EditableListProps) {
  const labelCls = "block text-[#888888] text-xs font-semibold mb-1.5 uppercase tracking-wider";
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className={labelCls}>{label}</label>
        <button
          className="text-[#ef4444] text-xs font-semibold flex items-center gap-1"
          onClick={onAdd}
        >
          <Plus size={12} /> Add
        </button>
      </div>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex gap-2">
            <span className="w-5 h-9 flex items-center justify-center text-[#555] text-xs flex-shrink-0">
              {i + 1}.
            </span>
            <input
              className="flex-1 bg-[#222222] border border-[#2a2a2a] rounded-xl px-3 py-2 text-[#f5f5f5] text-sm focus:outline-none focus:border-[#ef4444] placeholder:text-[#555]"
              placeholder={placeholder}
              value={item}
              onChange={e => onChange(i, e.target.value)}
            />
            <button
              className="w-9 h-9 flex items-center justify-center text-[#888888] hover:text-[#ef4444] flex-shrink-0"
              onClick={() => onRemove(i)}
            >
              <X size={14} />
            </button>
          </div>
        ))}
        {items.length === 0 && (
          <p className="text-[#555] text-xs italic">No items yet — tap Add.</p>
        )}
      </div>
    </div>
  );
}

// ─── Main Library Page ─────────────────────────────────────────────────────────

export default function Library() {
  const { state, saveExercise, deleteExercise } = useApp();
  const { exercises, workouts, sessions, personalRecords } = state;

  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState('All');
  const [equipmentFilter, setEquipmentFilter] = useState('All');
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const [editingExercise, setEditingExercise] = useState<Exercise | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);

  // ── Filtering ───────────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const musclesToMatch = filterToMuscles(muscleFilter);
    const eqToMatch = filterToEquipment(equipmentFilter);

    return exercises.filter(ex => {
      if (q && !ex.name.toLowerCase().includes(q)) return false;
      if (musclesToMatch.length > 0) {
        const allMuscles = [ex.primaryMuscle, ...ex.secondaryMuscles];
        if (!musclesToMatch.some(m => allMuscles.includes(m))) return false;
      }
      if (eqToMatch && ex.equipment !== eqToMatch) return false;
      return true;
    });
  }, [exercises, search, muscleFilter, equipmentFilter]);

  // ── Derived data for selected exercise ─────────────────────────────────────

  const usedInWorkouts = useMemo(() => {
    if (!selectedExercise) return false;
    return workouts.some(w => w.exercises.some(we => we.exerciseId === selectedExercise.id));
  }, [workouts, selectedExercise]);

  const personalRecord = useMemo(() => {
    if (!selectedExercise) return null;
    const pr = personalRecords.find(p => p.exerciseId === selectedExercise.id);
    if (!pr) return null;
    return { heaviestWeightKg: pr.heaviestWeightKg, bestReps: pr.bestReps, estimated1RM: pr.estimated1RM };
  }, [personalRecords, selectedExercise]);

  const recentSessions = useMemo(() => {
    if (!selectedExercise) return [];
    const result: { date: string; weight: number | null; reps: number | null }[] = [];
    const sorted = [...sessions].sort((a, b) => b.date.localeCompare(a.date));
    for (const session of sorted) {
      const log = session.exerciseLogs.find(l => l.exerciseId === selectedExercise.id);
      if (!log) continue;
      for (const set of log.sets) {
        if (set.completed) {
          result.push({ date: session.date, weight: set.weightKg, reps: set.actualReps });
        }
      }
      if (result.length >= 10) break;
    }
    return result;
  }, [sessions, selectedExercise]);

  // ── Handlers ────────────────────────────────────────────────────────────────

  const handleFavorite = useCallback((exercise: Exercise) => {
    saveExercise({ ...exercise, isFavorite: !exercise.isFavorite });
  }, [saveExercise]);

  const handleSave = useCallback(async (exercise: Exercise) => {
    await saveExercise(exercise);
    setShowAddModal(false);
    setEditingExercise(null);
  }, [saveExercise]);

  const handleDelete = useCallback(async () => {
    if (!selectedExercise) return;
    await deleteExercise(selectedExercise.id);
    setSelectedExercise(null);
  }, [deleteExercise, selectedExercise]);

  const handleEdit = useCallback(() => {
    if (!selectedExercise) return;
    setEditingExercise(selectedExercise);
    setSelectedExercise(null);
  }, [selectedExercise]);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-28">
      {/* Sticky Header */}
      <div className="sticky top-0 z-30 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#2a2a2a] px-4 pt-12 pb-3 space-y-3">
        <h1 className="text-[#f5f5f5] text-2xl font-bold tracking-tight">Exercise Library</h1>

        {/* Search */}
        <div className="relative">
          <Search size={16} color="#555" className="absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            className="w-full bg-[#1a1a1a] border border-[#2a2a2a] rounded-xl pl-9 pr-4 py-2.5 text-[#f5f5f5] text-sm focus:outline-none focus:border-[#ef4444] placeholder:text-[#555]"
            placeholder="Search exercises..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          {search && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => setSearch('')}>
              <X size={14} color="#888" />
            </button>
          )}
        </div>

        {/* Muscle filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {MUSCLE_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setMuscleFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                muscleFilter === f
                  ? 'bg-[#ef4444] text-white'
                  : 'bg-[#1a1a1a] text-[#888888] border border-[#2a2a2a]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Equipment filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {EQUIPMENT_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setEquipmentFilter(f)}
              className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                equipmentFilter === f
                  ? 'bg-[#3b82f6] text-white'
                  : 'bg-[#1a1a1a] text-[#888888] border border-[#2a2a2a]'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <div className="px-4 pt-3 pb-1">
        <p className="text-[#888888] text-xs">
          {filtered.length} exercise{filtered.length !== 1 ? 's' : ''}
          {muscleFilter !== 'All' && ` · ${muscleFilter}`}
          {equipmentFilter !== 'All' && ` · ${equipmentFilter}`}
        </p>
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <Search size={40} color="#2a2a2a" className="mb-4" />
          <p className="text-[#f5f5f5] font-semibold mb-1">No exercises found</p>
          <p className="text-[#888888] text-sm">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <motion.div
          layout
          className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 px-4 pt-2 max-w-7xl mx-auto"
        >
          <AnimatePresence>
            {filtered.map(exercise => (
              <ExerciseCard
                key={exercise.id}
                exercise={exercise}
                onTap={() => setSelectedExercise(exercise)}
                onFavorite={() => handleFavorite(exercise)}
              />
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* FAB */}
      <motion.button
        whileTap={{ scale: 0.92 }}
        className="fixed bottom-24 right-5 w-14 h-14 rounded-full bg-[#ef4444] flex items-center justify-center shadow-lg shadow-red-900/40 z-20"
        onClick={() => setShowAddModal(true)}
        aria-label="Add custom exercise"
      >
        <Plus size={26} color="white" strokeWidth={2.5} />
      </motion.button>

      {/* Exercise Detail Modal */}
      <AnimatePresence>
        {selectedExercise && (
          <DetailModal
            exercise={selectedExercise}
            onClose={() => setSelectedExercise(null)}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onFavorite={() => {
              const updated = { ...selectedExercise, isFavorite: !selectedExercise.isFavorite };
              saveExercise(updated);
              setSelectedExercise(updated);
            }}
            usedInWorkouts={usedInWorkouts}
            personalRecord={personalRecord}
            recentSessions={recentSessions}
          />
        )}
      </AnimatePresence>

      {/* Add Modal */}
      <AnimatePresence>
        {showAddModal && (
          <EditModal
            initial={blankExercise()}
            onClose={() => setShowAddModal(false)}
            onSave={handleSave}
          />
        )}
      </AnimatePresence>

      {/* Edit Modal */}
      <AnimatePresence>
        {editingExercise && (
          <EditModal
            initial={editingExercise}
            onClose={() => setEditingExercise(null)}
            onSave={async (updated) => {
              await handleSave(updated);
              setSelectedExercise(updated);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
