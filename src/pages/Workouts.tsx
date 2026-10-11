import React, { useState, useMemo, useCallback } from 'react';
import {
  Plus, ChevronUp, ChevronDown, X, Search, Check,
  Clock, Dumbbell, Moon, Copy, Edit3, Trash2, ChevronRight,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type {
  Workout, WorkoutExercise, Exercise, MuscleGroup, DayOfWeek, ScheduleDay,
} from '../types';
import { estimateWorkoutDuration } from '../utils/fitness';
import ExerciseImage from '../components/ExerciseImage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const FULL_DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const MUSCLE_GROUPS: MuscleGroup[] = [
  'chest', 'shoulders', 'back', 'biceps', 'triceps',
  'legs', 'hamstrings', 'glutes', 'calves', 'core', 'forearms', 'fullBody',
];

const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  chest: 'bg-red-900/40 text-red-300',
  shoulders: 'bg-blue-900/40 text-blue-300',
  back: 'bg-green-900/40 text-green-300',
  biceps: 'bg-purple-900/40 text-purple-300',
  triceps: 'bg-orange-900/40 text-orange-300',
  legs: 'bg-yellow-900/40 text-yellow-300',
  hamstrings: 'bg-pink-900/40 text-pink-300',
  glutes: 'bg-indigo-900/40 text-indigo-300',
  calves: 'bg-teal-900/40 text-teal-300',
  core: 'bg-cyan-900/40 text-cyan-300',
  forearms: 'bg-amber-900/40 text-amber-300',
  fullBody: 'bg-[#ef4444]/20 text-[#ef4444]',
};

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

function formatMuscle(m: MuscleGroup): string {
  return m === 'fullBody' ? 'Full Body' : m.charAt(0).toUpperCase() + m.slice(1);
}

// ─── Exercise Picker Modal ────────────────────────────────────────────────────

interface ExercisePickerProps {
  exercises: Exercise[];
  alreadyAdded: string[];
  onAdd: (ex: Exercise) => void;
  onClose: () => void;
}

function ExercisePicker({ exercises, alreadyAdded, onAdd, onClose }: ExercisePickerProps) {
  const [search, setSearch] = useState('');
  const [muscleFilter, setMuscleFilter] = useState<MuscleGroup | null>(null);

  const filtered = useMemo(() => {
    let list = exercises;
    if (muscleFilter) list = list.filter(e => e.primaryMuscle === muscleFilter || e.secondaryMuscles.includes(muscleFilter));
    if (search.trim()) list = list.filter(e => e.name.toLowerCase().includes(search.toLowerCase()));
    return list;
  }, [exercises, muscleFilter, search]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[#2a2a2a]">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1a1a1a]">
          <X size={20} className="text-[#f5f5f5]" />
        </button>
        <h2 className="text-lg font-bold text-[#f5f5f5]">Add Exercise</h2>
      </div>

      {/* Search */}
      <div className="p-3 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-xl px-3 py-2">
          <Search size={16} className="text-[#888888]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search exercises…"
            className="flex-1 bg-transparent text-[#f5f5f5] placeholder-[#888888] outline-none text-sm"
            autoFocus
          />
          {search && (
            <button onClick={() => setSearch('')}><X size={14} className="text-[#888888]" /></button>
          )}
        </div>
      </div>

      {/* Muscle filter chips */}
      <div className="flex gap-2 px-3 py-2 overflow-x-auto border-b border-[#2a2a2a]" style={{ scrollbarWidth: 'none' }}>
        <button
          onClick={() => setMuscleFilter(null)}
          className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${!muscleFilter ? 'bg-[#ef4444] text-white' : 'bg-[#1a1a1a] text-[#888888]'}`}
        >
          All
        </button>
        {MUSCLE_GROUPS.map(m => (
          <button
            key={m}
            onClick={() => setMuscleFilter(muscleFilter === m ? null : m)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium ${muscleFilter === m ? 'bg-[#ef4444] text-white' : 'bg-[#1a1a1a] text-[#888888]'}`}
          >
            {formatMuscle(m)}
          </button>
        ))}
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 && (
          <div className="text-center text-[#888888] py-12 text-sm">No exercises found</div>
        )}
        {filtered.map(ex => {
          const added = alreadyAdded.includes(ex.id);
          return (
            <button
              key={ex.id}
              onClick={() => { if (!added) { onAdd(ex); } }}
              className={`w-full flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a] text-left ${added ? 'opacity-40' : 'active:bg-[#1a1a1a]'}`}
            >
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#222222] border border-[#2a2a2a] flex-shrink-0">
                <ExerciseImage
                  src={ex.image || ex.imageUrl}
                  alt={ex.name}
                  aspectRatio="square"
                  fallbackIconSize={16}
                  className="w-full h-full"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[#f5f5f5] font-medium text-sm truncate">{ex.name}</p>
                <div className="flex gap-1.5 mt-0.5 flex-wrap">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${MUSCLE_COLORS[ex.primaryMuscle]}`}>
                    {formatMuscle(ex.primaryMuscle)}
                  </span>
                  <span className="text-xs text-[#888888] capitalize">{ex.equipment}</span>
                </div>
              </div>
              {added ? (
                <Check size={16} className="text-[#ef4444] shrink-0" />
              ) : (
                <Plus size={16} className="text-[#888888] shrink-0" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Exercise Editor Modal ────────────────────────────────────────────────────

interface ExerciseEditorProps {
  workout: Workout;
  exercises: Exercise[];
  onSave: (updated: Workout) => void;
  onClose: () => void;
}

function ExerciseEditor({ workout, exercises, onSave, onClose }: ExerciseEditorProps) {
  const [wexes, setWexes] = useState<WorkoutExercise[]>(
    [...workout.exercises].sort((a, b) => a.order - b.order)
  );
  const [showPicker, setShowPicker] = useState(false);

  const exMap = useMemo(() => {
    const m = new Map<string, Exercise>();
    exercises.forEach(e => m.set(e.id, e));
    return m;
  }, [exercises]);

  function move(idx: number, dir: -1 | 1) {
    const newList = [...wexes];
    const target = idx + dir;
    if (target < 0 || target >= newList.length) return;
    [newList[idx], newList[target]] = [newList[target], newList[idx]];
    setWexes(newList.map((e, i) => ({ ...e, order: i })));
  }

  function updateField(idx: number, field: keyof WorkoutExercise, value: string | number) {
    setWexes(prev => prev.map((e, i) => i === idx ? { ...e, [field]: value } : e));
  }

  function remove(idx: number) {
    setWexes(prev => prev.filter((_, i) => i !== idx).map((e, i) => ({ ...e, order: i })));
  }

  function addExercise(ex: Exercise) {
    const newWex: WorkoutExercise = {
      exerciseId: ex.id,
      sets: ex.defaultSets,
      reps: ex.defaultReps,
      restSeconds: ex.defaultRestSeconds,
      order: wexes.length,
    };
    setWexes(prev => [...prev, newWex]);
    setShowPicker(false);
  }

  function handleSave() {
    const updated: Workout = {
      ...workout,
      exercises: wexes,
      estimatedDurationMins: estimateWorkoutDuration(wexes),
      updatedAt: new Date().toISOString(),
    };
    onSave(updated);
  }

  if (showPicker) {
    return (
      <ExercisePicker
        exercises={exercises}
        alreadyAdded={wexes.map(w => w.exerciseId)}
        onAdd={addExercise}
        onClose={() => setShowPicker(false)}
      />
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[#2a2a2a]">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1a1a1a]">
          <X size={20} className="text-[#f5f5f5]" />
        </button>
        <h2 className="text-lg font-bold text-[#f5f5f5] flex-1">Edit Exercises</h2>
        <button
          onClick={handleSave}
          className="px-4 py-2 bg-[#ef4444] text-white rounded-xl text-sm font-semibold"
        >
          Save
        </button>
      </div>

      {/* Exercise list */}
      <div className="flex-1 overflow-y-auto pb-4">
        {wexes.length === 0 && (
          <div className="text-center text-[#888888] py-12 text-sm">No exercises yet. Add some below.</div>
        )}
        {wexes.map((we, idx) => {
          const ex = exMap.get(we.exerciseId);
          if (!ex) return null;
          return (
            <div key={`${we.exerciseId}-${idx}`} className="mx-3 my-2 bg-[#111111] rounded-2xl p-3 border border-[#2a2a2a]">
              {/* Top row */}
              <div className="flex items-center gap-2 mb-3">
                <div className="w-9 h-9 rounded-xl overflow-hidden bg-[#222222] border border-[#2a2a2a] flex-shrink-0">
                  <ExerciseImage
                    src={ex.image || ex.imageUrl}
                    alt={ex.name}
                    aspectRatio="square"
                    fallbackIconSize={15}
                    className="w-full h-full"
                  />
                </div>
                <p className="flex-1 text-[#f5f5f5] font-semibold text-sm truncate">{ex.name}</p>
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => move(idx, -1)} disabled={idx === 0}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#222222] disabled:opacity-30">
                    <ChevronUp size={14} className="text-[#f5f5f5]" />
                  </button>
                  <button onClick={() => move(idx, 1)} disabled={idx === wexes.length - 1}
                    className="w-7 h-7 flex items-center justify-center rounded-lg bg-[#222222] disabled:opacity-30">
                    <ChevronDown size={14} className="text-[#f5f5f5]" />
                  </button>
                </div>
                <button onClick={() => remove(idx)} className="w-8 h-8 flex items-center justify-center rounded-full bg-red-900/20">
                  <Trash2 size={14} className="text-red-400" />
                </button>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="text-xs text-[#888888] mb-1 block">Sets</label>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={we.sets}
                    onChange={e => updateField(idx, 'sets', parseInt(e.target.value) || 1)}
                    className="w-full bg-[#1a1a1a] text-[#f5f5f5] rounded-lg px-2 py-2 text-sm text-center border border-[#2a2a2a] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#888888] mb-1 block">Reps</label>
                  <input
                    type="text"
                    value={we.reps}
                    onChange={e => updateField(idx, 'reps', e.target.value)}
                    placeholder="8-12"
                    className="w-full bg-[#1a1a1a] text-[#f5f5f5] rounded-lg px-2 py-2 text-sm text-center border border-[#2a2a2a] outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs text-[#888888] mb-1 block">Rest (s)</label>
                  <input
                    type="number"
                    min={0}
                    step={15}
                    value={we.restSeconds}
                    onChange={e => updateField(idx, 'restSeconds', parseInt(e.target.value) || 0)}
                    className="w-full bg-[#1a1a1a] text-[#f5f5f5] rounded-lg px-2 py-2 text-sm text-center border border-[#2a2a2a] outline-none"
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* Add Exercise */}
        <button
          onClick={() => setShowPicker(true)}
          className="mx-3 mt-2 w-[calc(100%-24px)] flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed border-[#2a2a2a] text-[#888888] text-sm"
        >
          <Plus size={16} />
          Add Exercise
        </button>
      </div>
    </div>
  );
}

// ─── Create Workout Modal ─────────────────────────────────────────────────────

interface CreateWorkoutModalProps {
  onSave: (w: Workout) => void;
  onClose: () => void;
}

function CreateWorkoutModal({ onSave, onClose }: CreateWorkoutModalProps) {
  const [name, setName] = useState('');
  const [selectedMuscles, setSelectedMuscles] = useState<MuscleGroup[]>([]);

  function toggleMuscle(m: MuscleGroup) {
    setSelectedMuscles(prev => prev.includes(m) ? prev.filter(x => x !== m) : [...prev, m]);
  }

  function handleCreate() {
    if (!name.trim()) return;
    const now = new Date().toISOString();
    const workout: Workout = {
      id: uid(),
      name: name.trim(),
      muscleGroups: selectedMuscles,
      exercises: [],
      estimatedDurationMins: 0,
      isRestDay: false,
      createdAt: now,
      updatedAt: now,
    };
    onSave(workout);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/60 backdrop-blur-sm">
      <div className="w-full bg-[#111111] rounded-t-3xl p-5 pb-8">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-[#f5f5f5]">New Workout</h2>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-full bg-[#222222]">
            <X size={16} className="text-[#888888]" />
          </button>
        </div>

        <label className="text-xs text-[#888888] mb-1.5 block">Workout Name</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="e.g. Push Day"
          autoFocus
          className="w-full bg-[#1a1a1a] text-[#f5f5f5] rounded-xl px-4 py-3 text-sm border border-[#2a2a2a] outline-none mb-4"
        />

        <label className="text-xs text-[#888888] mb-2 block">Muscle Groups</label>
        <div className="flex flex-wrap gap-2 mb-5">
          {MUSCLE_GROUPS.map(m => (
            <button
              key={m}
              onClick={() => toggleMuscle(m)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${selectedMuscles.includes(m) ? 'bg-[#ef4444] text-white' : 'bg-[#222222] text-[#888888]'}`}
            >
              {formatMuscle(m)}
            </button>
          ))}
        </div>

        <button
          onClick={handleCreate}
          disabled={!name.trim()}
          className="w-full py-4 bg-[#ef4444] text-white rounded-2xl font-bold text-base disabled:opacity-40"
        >
          Create Workout
        </button>
      </div>
    </div>
  );
}

// ─── Day Detail Panel ─────────────────────────────────────────────────────────

interface DayDetailProps {
  day: ScheduleDay;
  workouts: Workout[];
  exercises: Exercise[];
  onClose: () => void;
  onSaveSchedule: (day: ScheduleDay) => void;
  onSaveWorkout: (w: Workout) => void;
}

function DayDetail({ day, workouts, exercises, onClose, onSaveSchedule, onSaveWorkout }: DayDetailProps) {
  const [localDay, setLocalDay] = useState<ScheduleDay>(day);
  const [showExerciseEditor, setShowExerciseEditor] = useState(false);

  const workout = useMemo(
    () => workouts.find(w => w.id === localDay.workoutId) ?? null,
    [workouts, localDay.workoutId]
  );

  const sortedExercises = useMemo(
    () => workout ? [...workout.exercises].sort((a, b) => a.order - b.order) : [],
    [workout]
  );

  const exMap = useMemo(() => {
    const m = new Map<string, Exercise>();
    exercises.forEach(e => m.set(e.id, e));
    return m;
  }, [exercises]);

  function handleRestToggle() {
    const updated: ScheduleDay = {
      ...localDay,
      workoutId: localDay.workoutId ? null : (workouts[0]?.id ?? null),
    };
    setLocalDay(updated);
    onSaveSchedule(updated);
  }

  function handleWorkoutChange(workoutId: string) {
    const updated: ScheduleDay = { ...localDay, workoutId };
    setLocalDay(updated);
    onSaveSchedule(updated);
  }

  function handleTimeChange(time: string) {
    const updated: ScheduleDay = { ...localDay, preferredTime: time };
    setLocalDay(updated);
    onSaveSchedule(updated);
  }

  function handleDuplicate() {
    if (!workout) return;
    const now = new Date().toISOString();
    const copy: Workout = {
      ...workout,
      id: uid(),
      name: `${workout.name} (Copy)`,
      createdAt: now,
      updatedAt: now,
    };
    onSaveWorkout(copy);
  }

  function handleExerciseEditorSave(updated: Workout) {
    onSaveWorkout(updated);
    setShowExerciseEditor(false);
  }

  if (showExerciseEditor && workout) {
    return (
      <ExerciseEditor
        workout={workout}
        exercises={exercises}
        onSave={handleExerciseEditorSave}
        onClose={() => setShowExerciseEditor(false)}
      />
    );
  }

  const isRestDay = !localDay.workoutId;

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-[#2a2a2a]">
        <button onClick={onClose} className="w-10 h-10 flex items-center justify-center rounded-full bg-[#1a1a1a]">
          <X size={20} className="text-[#f5f5f5]" />
        </button>
        <h2 className="text-xl font-bold text-[#f5f5f5] flex-1">{FULL_DAY_NAMES[day.day]}</h2>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {/* Rest day toggle */}
        <div className="bg-[#111111] rounded-2xl p-4 border border-[#2a2a2a] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Moon size={18} className="text-[#888888]" />
            <span className="text-[#f5f5f5] font-medium">Rest Day</span>
          </div>
          <button
            onClick={handleRestToggle}
            className={`w-12 h-6 rounded-full transition-colors relative ${isRestDay ? 'bg-[#ef4444]' : 'bg-[#2a2a2a]'}`}
          >
            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${isRestDay ? 'left-7' : 'left-1'}`} />
          </button>
        </div>

        {/* Preferred time */}
        <div className="bg-[#111111] rounded-2xl p-4 border border-[#2a2a2a] flex items-center gap-3">
          <Clock size={18} className="text-[#888888]" />
          <span className="text-[#f5f5f5] font-medium flex-1">Preferred Time</span>
          <input
            type="time"
            value={localDay.preferredTime ?? ''}
            onChange={e => handleTimeChange(e.target.value)}
            className="bg-[#1a1a1a] text-[#f5f5f5] rounded-lg px-3 py-1.5 text-sm border border-[#2a2a2a] outline-none"
          />
        </div>

        {!isRestDay && (
          <>
            {/* Workout selector */}
            <div className="bg-[#111111] rounded-2xl p-4 border border-[#2a2a2a]">
              <label className="text-xs text-[#888888] mb-2 block">Assigned Workout</label>
              <select
                value={localDay.workoutId ?? ''}
                onChange={e => handleWorkoutChange(e.target.value)}
                className="w-full bg-[#1a1a1a] text-[#f5f5f5] rounded-xl px-3 py-3 text-sm border border-[#2a2a2a] outline-none"
              >
                {workouts.filter(w => !w.isRestDay).map(w => (
                  <option key={w.id} value={w.id}>{w.name}</option>
                ))}
              </select>

              {workout && (
                <div className="flex gap-2 mt-3">
                  <button
                    onClick={handleDuplicate}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#1a1a1a] text-[#888888] text-sm border border-[#2a2a2a]"
                  >
                    <Copy size={14} />
                    Duplicate
                  </button>
                  <button
                    onClick={() => setShowExerciseEditor(true)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl bg-[#ef4444]/10 text-[#ef4444] text-sm border border-[#ef4444]/20"
                  >
                    <Edit3 size={14} />
                    Edit Exercises
                  </button>
                </div>
              )}
            </div>

            {/* Exercises list */}
            {workout && sortedExercises.length > 0 && (
              <div className="bg-[#111111] rounded-2xl border border-[#2a2a2a] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#2a2a2a]">
                  <h3 className="text-sm font-semibold text-[#f5f5f5]">
                    {workout.exercises.length} Exercises · ~{workout.estimatedDurationMins} min
                  </h3>
                  {workout.muscleGroups.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {workout.muscleGroups.map(mg => (
                        <span key={mg} className={`text-xs px-2 py-0.5 rounded-full ${MUSCLE_COLORS[mg]}`}>
                          {formatMuscle(mg)}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {sortedExercises.map((we, idx) => {
                  const ex = exMap.get(we.exerciseId);
                  if (!ex) return null;
                  return (
                    <div key={idx} className="flex items-center gap-3 px-4 py-3 border-b border-[#1a1a1a] last:border-0">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#222222] border border-[#2a2a2a] flex-shrink-0">
                        <ExerciseImage
                          src={ex.image || ex.imageUrl}
                          alt={ex.name}
                          aspectRatio="square"
                          fallbackIconSize={16}
                          className="w-full h-full"
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-[#f5f5f5] font-medium truncate">{ex.name}</p>
                        <p className="text-xs text-[#888888]">{we.sets} sets · {we.reps} reps · {we.restSeconds}s rest</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {workout && sortedExercises.length === 0 && (
              <div className="bg-[#111111] rounded-2xl border border-[#2a2a2a] p-6 text-center">
                <Dumbbell size={32} className="text-[#2a2a2a] mx-auto mb-2" />
                <p className="text-[#888888] text-sm">No exercises yet</p>
                <button
                  onClick={() => setShowExerciseEditor(true)}
                  className="mt-3 px-4 py-2 bg-[#ef4444] text-white rounded-xl text-sm font-semibold"
                >
                  Add Exercises
                </button>
              </div>
            )}
          </>
        )}

        {isRestDay && (
          <div className="bg-[#111111] rounded-2xl border border-[#2a2a2a] p-8 text-center">
            <Moon size={40} className="text-[#2a2a2a] mx-auto mb-3" />
            <p className="text-[#888888]">Rest & recovery day</p>
            <p className="text-xs text-[#888888] mt-1">Toggle off rest day to assign a workout</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Workouts() {
  const { state, saveSchedule, saveWorkout } = useApp();
  const { schedule, workouts, exercises } = state;

  const [selectedDay, setSelectedDay] = useState<DayOfWeek | null>(null);
  const [showCreateWorkout, setShowCreateWorkout] = useState(false);

  const days = useMemo((): ScheduleDay[] => {
    if (!schedule) {
      return Array.from({ length: 7 }, (_, i) => ({ day: i as DayOfWeek, workoutId: null }));
    }
    return Array.from({ length: 7 }, (_, i) => {
      const found = schedule.days.find(d => d.day === i);
      return found ?? { day: i as DayOfWeek, workoutId: null };
    });
  }, [schedule]);

  const workoutMap = useMemo(() => {
    const m = new Map<string, Workout>();
    workouts.forEach(w => m.set(w.id, w));
    return m;
  }, [workouts]);

  const exMap = useMemo(() => {
    const m = new Map<string, Exercise>();
    exercises.forEach(e => m.set(e.id, e));
    return m;
  }, [exercises]);

  const today = new Date().getDay() as DayOfWeek;

  const handleSaveScheduleDay = useCallback(async (updatedDay: ScheduleDay) => {
    const currentDays = schedule?.days ?? days;
    const newDays = currentDays.map(d => d.day === updatedDay.day ? updatedDay : d);
    // Add if not present
    if (!newDays.find(d => d.day === updatedDay.day)) {
      newDays.push(updatedDay);
    }
    await saveSchedule({ days: newDays });
  }, [schedule, days, saveSchedule]);

  const handleCreateWorkout = useCallback(async (workout: Workout) => {
    await saveWorkout(workout);
    setShowCreateWorkout(false);
  }, [saveWorkout]);

  const selectedDayData = selectedDay !== null ? days.find(d => d.day === selectedDay) ?? { day: selectedDay, workoutId: null } : null;

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0a]">
      {/* Header */}
      <div className="px-4 pt-12 pb-4">
        <h1 className="text-2xl font-bold text-[#f5f5f5]">Timetable</h1>
        <p className="text-sm text-[#888888] mt-0.5">Weekly workout schedule</p>
      </div>

      {/* 7-day grid */}
      <div className="px-4 space-y-2 flex-1">
        {days.map(d => {
          const workout = d.workoutId ? workoutMap.get(d.workoutId) : null;
          const isToday = d.day === today;
          const isRest = !d.workoutId;

          return (
            <button
              key={d.day}
              onClick={() => setSelectedDay(d.day)}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl border text-left transition-colors ${
                isToday
                  ? 'bg-[#1a0a0a] border-[#ef4444]/40'
                  : 'bg-[#111111] border-[#2a2a2a]'
              }`}
            >
              {/* Day name */}
              <div className={`w-12 shrink-0 text-center ${isToday ? 'text-[#ef4444]' : 'text-[#888888]'}`}>
                <p className="text-xs font-medium">{DAY_NAMES[d.day]}</p>
                {isToday && <div className="w-1.5 h-1.5 rounded-full bg-[#ef4444] mx-auto mt-0.5" />}
              </div>

              <div className="flex-1 min-w-0">
                {isRest ? (
                  <div className="flex items-center gap-2">
                    <Moon size={14} className="text-[#888888]" />
                    <span className="text-[#888888] text-sm">Rest Day</span>
                  </div>
                ) : workout ? (
                  <>
                    <p className="text-[#f5f5f5] font-semibold text-sm truncate">{workout.name}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-xs text-[#888888] flex items-center gap-1">
                        <Dumbbell size={11} />
                        {workout.exercises.length} exercises
                      </span>
                      <span className="text-xs text-[#888888] flex items-center gap-1">
                        <Clock size={11} />
                        {workout.estimatedDurationMins} min
                      </span>
                    </div>
                    {workout.muscleGroups.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {workout.muscleGroups.slice(0, 3).map(mg => (
                          <span key={mg} className={`text-xs px-1.5 py-0.5 rounded-full ${MUSCLE_COLORS[mg]}`}>
                            {formatMuscle(mg)}
                          </span>
                        ))}
                        {workout.muscleGroups.length > 3 && (
                          <span className="text-xs text-[#888888]">+{workout.muscleGroups.length - 3}</span>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <span className="text-[#888888] text-sm">No workout assigned</span>
                )}
              </div>

              {d.preferredTime && !isRest && (
                <span className="text-xs text-[#888888] shrink-0">{d.preferredTime}</span>
              )}
              <ChevronRight size={16} className="text-[#2a2a2a] shrink-0" />
            </button>
          );
        })}
      </div>

      {/* Create Workout FAB */}
      <div className="sticky bottom-24 px-4 py-3 flex justify-end">
        <button
          onClick={() => setShowCreateWorkout(true)}
          className="flex items-center gap-2 px-5 py-3 bg-[#ef4444] text-white rounded-2xl font-semibold shadow-lg shadow-red-900/40"
        >
          <Plus size={18} />
          New Workout
        </button>
      </div>

      {/* Workouts overview */}
      <div className="px-4 pb-28">
        <h2 className="text-base font-bold text-[#f5f5f5] mb-3">All Workouts</h2>
        <div className="space-y-2">
          {workouts.filter(w => !w.isRestDay).map(w => (
            <div key={w.id} className="bg-[#111111] rounded-2xl p-4 border border-[#2a2a2a]">
              <div className="flex items-center gap-2">
                <p className="flex-1 text-[#f5f5f5] font-semibold text-sm">{w.name}</p>
                <span className="text-xs text-[#888888]">{w.exercises.length} exercises</span>
              </div>
              {w.muscleGroups.length > 0 && (
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {w.muscleGroups.map(mg => (
                    <span key={mg} className={`text-xs px-2 py-0.5 rounded-full ${MUSCLE_COLORS[mg]}`}>
                      {formatMuscle(mg)}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Day detail overlay */}
      {selectedDay !== null && selectedDayData && (
        <DayDetail
          day={selectedDayData}
          workouts={workouts}
          exercises={exercises}
          onClose={() => setSelectedDay(null)}
          onSaveSchedule={handleSaveScheduleDay}
          onSaveWorkout={saveWorkout}
        />
      )}

      {/* Create workout modal */}
      {showCreateWorkout && (
        <CreateWorkoutModal
          onSave={handleCreateWorkout}
          onClose={() => setShowCreateWorkout(false)}
        />
      )}
    </div>
  );
}
