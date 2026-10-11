import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dumbbell, Flame, Droplets, TrendingUp, Calendar,
  Play, Plus, Scale, Utensils, ChevronRight, Zap,
  Wind, Moon, Heart, Activity, Target, RotateCcw,
  Timer, CheckCircle2, Clock,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateStreak, kgToLbs } from '../utils/fitness';
import type { MuscleGroup } from '../types';
import ExerciseImage from '../components/ExerciseImage';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
}

const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  chest: 'bg-red-900/60 text-red-300',
  shoulders: 'bg-orange-900/60 text-orange-300',
  back: 'bg-blue-900/60 text-blue-300',
  biceps: 'bg-purple-900/60 text-purple-300',
  triceps: 'bg-pink-900/60 text-pink-300',
  legs: 'bg-green-900/60 text-green-300',
  hamstrings: 'bg-teal-900/60 text-teal-300',
  glutes: 'bg-yellow-900/60 text-yellow-300',
  calves: 'bg-lime-900/60 text-lime-300',
  core: 'bg-cyan-900/60 text-cyan-300',
  forearms: 'bg-indigo-900/60 text-indigo-300',
  fullBody: 'bg-rose-900/60 text-rose-300',
};

function muscleLabel(m: MuscleGroup): string {
  const map: Record<MuscleGroup, string> = {
    chest: 'Chest', shoulders: 'Shoulders', back: 'Back',
    biceps: 'Biceps', triceps: 'Triceps', legs: 'Legs',
    hamstrings: 'Hamstrings', glutes: 'Glutes', calves: 'Calves',
    core: 'Core', forearms: 'Forearms', fullBody: 'Full Body',
  };
  return map[m] ?? m;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ProgressBarProps {
  value: number;
  max: number;
  color?: string;
  height?: string;
}
function ProgressBar({ value, max, color = 'bg-[#ef4444]', height = 'h-2' }: ProgressBarProps) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className={`w-full ${height} bg-[#2a2a2a] rounded-full overflow-hidden`}>
      <div
        className={`${height} ${color} rounded-full transition-all duration-700`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

interface MacroRowProps {
  label: string;
  value: number;
  target: number;
  unit?: string;
  color: string;
}
function MacroRow({ label, value, target, unit = 'g', color }: MacroRowProps) {
  const pct = target > 0 ? Math.min(100, Math.round((value / target) * 100)) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <span className="text-xs text-[#888888]">{label}</span>
        <span className="text-xs font-medium text-[#f5f5f5]">
          {Math.round(value)}{unit} / {target}{unit}
          <span className="text-[#888888] ml-1">({pct}%)</span>
        </span>
      </div>
      <div className="w-full h-1.5 bg-[#2a2a2a] rounded-full overflow-hidden">
        <div className={`h-1.5 ${color} rounded-full transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function Dashboard() {
  const navigate = useNavigate();
  const { state, updateWaterLog } = useApp();
  const {
    profile, schedule, workouts, exercises, sessions,
    foodLogs, waterLogs, nutritionTargets, settings, activeSession,
    weightLogs,
  } = state;

  const today = useMemo(() => getTodayISO(), []);
  const todayDate = useMemo(() => new Date(), []);
  const dayOfWeek = todayDate.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;

  // ── Today's scheduled workout ──────────────────────────────────────────────
  const scheduleDay = useMemo(
    () => schedule?.days.find(d => d.day === dayOfWeek) ?? null,
    [schedule, dayOfWeek]
  );
  const todayWorkout = useMemo(
    () => scheduleDay?.workoutId ? workouts.find(w => w.id === scheduleDay.workoutId) ?? null : null,
    [scheduleDay, workouts]
  );
  const isRestDay = !scheduleDay?.workoutId || (todayWorkout?.isRestDay ?? false);

  // ── Exercise names map ────────────────────────────────────────────────────
  const exerciseMap = useMemo(
    () => Object.fromEntries(exercises.map(e => [e.id, e])),
    [exercises]
  );

  // ── Nutrition today ────────────────────────────────────────────────────────
  const todayLogs = useMemo(() => foodLogs.filter(f => f.date === today), [foodLogs, today]);
  const todayNutrition = useMemo(() => todayLogs.reduce(
    (acc, f) => ({
      calories: acc.calories + f.calories * f.servings,
      protein: acc.protein + f.proteinG * f.servings,
      carbs: acc.carbs + f.carbsG * f.servings,
      fat: acc.fat + f.fatG * f.servings,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  ), [todayLogs]);

  // ── Water today ───────────────────────────────────────────────────────────
  const todayWater = useMemo(() => waterLogs.find(w => w.date === today), [waterLogs, today]);
  const waterMl = todayWater?.amountMl ?? 0;
  const waterTargetMl = 2500;

  // ── Quick-add water ───────────────────────────────────────────────────────
  async function addWater(ml: number) {
    const newAmount = waterMl + ml;
    await updateWaterLog({ date: today, amountMl: newAmount });
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const completedDates = useMemo(
    () => sessions.filter(s => s.completed).map(s => s.date),
    [sessions]
  );
  const { current: streakDays } = useMemo(() => calculateStreak(completedDates), [completedDates]);

  const weekStart = useMemo(() => {
    const d = new Date(todayDate);
    d.setDate(d.getDate() - d.getDay()); // Sunday
    d.setHours(0, 0, 0, 0);
    return d;
  }, [todayDate]);

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const workoutsThisWeek = useMemo(
    () => sessions.filter(s => {
      const sd = new Date(s.date);
      return s.completed && sd >= weekStart && sd < weekEnd;
    }).length,
    [sessions, weekStart, weekEnd]
  );

  const totalWorkouts = useMemo(() => sessions.filter(s => s.completed).length, [sessions]);

  const currentWeight = useMemo(() => {
    if (weightLogs.length === 0) return profile?.weightKg ?? null;
    const sorted = [...weightLogs].sort((a, b) => b.date.localeCompare(a.date));
    return sorted[0].weightKg;
  }, [weightLogs, profile]);

  // ── Weekly calendar strip ─────────────────────────────────────────────────
  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      const dow = d.getDay() as 0 | 1 | 2 | 3 | 4 | 5 | 6;
      const sched = schedule?.days.find(sd => sd.day === dow);
      const workout = sched?.workoutId ? workouts.find(w => w.id === sched.workoutId) : null;
      const isWorkoutDay = !!sched?.workoutId && !(workout?.isRestDay);
      const isCompleted = sessions.some(s => s.date === iso && s.completed);
      const isToday = iso === today;
      return { d, iso, dow, isWorkoutDay, isCompleted, isToday, label: ['S', 'M', 'T', 'W', 'T', 'F', 'S'][d.getDay()] };
    });
  }, [weekStart, schedule, workouts, sessions, today]);

  // ── Start workout ──────────────────────────────────────────────────────────
  function handleStartWorkout() {
    navigate('/session');
  }

  // ── Recovery tips ────────────────────────────────────────────────────────
  const recoveryTips = [
    { icon: Wind, text: 'Do 10 min light stretching', color: 'text-blue-400' },
    { icon: Activity, text: 'Go for a 20 min walk', color: 'text-green-400' },
    { icon: Moon, text: 'Aim for 7–9 hours sleep', color: 'text-purple-400' },
    { icon: Droplets, text: 'Drink at least 2.5L water', color: 'text-cyan-400' },
  ];

  const displayWeight = profile?.units === 'imperial' && currentWeight
    ? `${kgToLbs(currentWeight)} lbs`
    : currentWeight
      ? `${currentWeight} kg`
      : '—';

  const targetWeight = profile?.targetWeightKg;
  const weightDiff = currentWeight && targetWeight
    ? parseFloat((currentWeight - targetWeight).toFixed(1))
    : null;

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* ── Active Session Banner ─────────────────────────────────────────── */}
      {activeSession && (
        <button
          onClick={() => navigate('/session')}
          className="w-full bg-[#ef4444] flex items-center justify-between px-4 py-3 sticky top-0 z-50"
        >
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
            <span className="text-white font-semibold text-sm">Session in progress — Resume</span>
          </div>
          <ChevronRight size={18} className="text-white" />
        </button>
      )}

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="px-4 pt-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Dumbbell size={20} className="text-[#ef4444]" />
              <span className="text-[#ef4444] font-bold text-lg tracking-tight">IronTrack</span>
            </div>
            <h1 className="text-[#f5f5f5] text-2xl font-bold leading-tight">
              {getGreeting()}{profile?.name ? `, ${profile.name.split(' ')[0]}` : ''}!
            </h1>
            <p className="text-[#888888] text-sm mt-0.5">{formatDate(todayDate)}</p>
          </div>
          <button
            onClick={() => navigate('/profile')}
            className="w-11 h-11 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center"
          >
            <span className="text-[#f5f5f5] text-lg font-bold">
              {profile?.name ? profile.name.charAt(0).toUpperCase() : '?'}
            </span>
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4">

        {/* ── Today's Workout / Recovery ──────────────────────────────────────── */}
        {isRestDay ? (
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
                <Heart size={20} className="text-green-400" />
              </div>
              <div>
                <p className="text-[#888888] text-xs uppercase tracking-wider">Today</p>
                <h2 className="text-[#f5f5f5] font-bold text-lg">Rest & Recovery Day</h2>
              </div>
            </div>
            <p className="text-[#888888] text-sm mb-4">Your body grows during rest. Make the most of today:</p>
            <div className="space-y-2.5">
              {recoveryTips.map((tip, i) => (
                <div key={i} className="flex items-center gap-3">
                  <tip.icon size={16} className={tip.color} />
                  <span className="text-[#f5f5f5] text-sm">{tip.text}</span>
                </div>
              ))}
            </div>
          </div>
        ) : todayWorkout ? (
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl overflow-hidden">
            {/* Card header */}
            <div className="bg-gradient-to-r from-[#ef4444]/20 to-transparent px-5 pt-5 pb-4">
              <p className="text-[#888888] text-xs uppercase tracking-wider mb-1">Today's Workout</p>
              <h2 className="text-[#f5f5f5] font-bold text-xl">{todayWorkout.name}</h2>
              {/* Muscle chips */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {todayWorkout.muscleGroups.map(mg => (
                  <span key={mg} className={`text-xs px-2 py-0.5 rounded-full font-medium ${MUSCLE_COLORS[mg]}`}>
                    {muscleLabel(mg)}
                  </span>
                ))}
              </div>
              {/* Meta */}
              <div className="flex items-center gap-4 mt-3">
                <div className="flex items-center gap-1.5">
                  <Timer size={14} className="text-[#888888]" />
                  <span className="text-[#888888] text-xs">{todayWorkout.estimatedDurationMins} min</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Dumbbell size={14} className="text-[#888888]" />
                  <span className="text-[#888888] text-xs">{todayWorkout.exercises.length} exercises</span>
                </div>
              </div>
            </div>

            {/* Exercise list */}
            <div className="px-5 pb-4 space-y-2">
              {todayWorkout.exercises.slice(0, 4).map((we, idx) => {
                const ex = exerciseMap[we.exerciseId];
                return (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-[#1a1a1a] last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg overflow-hidden bg-[#1a1a1a] border border-[#2a2a2a] flex-shrink-0">
                        <ExerciseImage
                          src={ex?.image || ex?.imageUrl}
                          alt={ex?.name ?? 'Exercise'}
                          aspectRatio="square"
                          fallbackIconSize={14}
                          className="w-full h-full"
                        />
                      </div>
                      <span className="text-[#f5f5f5] text-sm font-medium truncate">{ex?.name ?? 'Unknown'}</span>
                    </div>
                    <span className="text-[#888888] text-xs font-mono">{we.sets}×{we.reps}</span>
                  </div>
                );
              })}
              {todayWorkout.exercises.length > 4 && (
                <p className="text-[#888888] text-xs text-center pt-1">
                  +{todayWorkout.exercises.length - 4} more exercises
                </p>
              )}
            </div>

            {/* Start button */}
            <div className="px-5 pb-5">
              <button
                onClick={handleStartWorkout}
                className="w-full bg-[#ef4444] hover:bg-red-600 active:bg-red-700 text-white font-bold rounded-xl py-4 flex items-center justify-center gap-2 transition-colors"
              >
                <Play size={20} fill="white" />
                Start Workout
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <Calendar size={20} className="text-[#888888]" />
              <h2 className="text-[#f5f5f5] font-semibold">No Workout Scheduled</h2>
            </div>
            <p className="text-[#888888] text-sm mb-4">Set up your weekly schedule in the Library.</p>
            <button
              onClick={() => navigate('/library')}
              className="bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] px-4 py-2.5 rounded-xl text-sm font-medium"
            >
              Set Up Schedule
            </button>
          </div>
        )}

        {/* ── Quick Stats Row ──────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: 'Current Weight',
              value: displayWeight,
              icon: Scale,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
            },
            {
              label: 'Streak',
              value: `${streakDays} days`,
              icon: Flame,
              color: 'text-orange-400',
              bg: 'bg-orange-500/10',
            },
            {
              label: 'This Week',
              value: `${workoutsThisWeek} workouts`,
              icon: Zap,
              color: 'text-yellow-400',
              bg: 'bg-yellow-500/10',
            },
            {
              label: 'Total Workouts',
              value: totalWorkouts.toString(),
              icon: CheckCircle2,
              color: 'text-green-400',
              bg: 'bg-green-500/10',
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4">
              <div className={`w-9 h-9 rounded-xl ${stat.bg} flex items-center justify-center mb-2`}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <p className="text-[#f5f5f5] font-bold text-lg leading-tight">{stat.value}</p>
              <p className="text-[#888888] text-xs mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* ── Weekly Calendar Strip ────────────────────────────────────────────── */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[#f5f5f5] font-semibold text-sm">This Week</h3>
            <Clock size={14} className="text-[#888888]" />
          </div>
          <div className="grid grid-cols-7 gap-1">
            {weekDays.map((day) => {
              let bgClass = 'bg-[#1a1a1a]';
              let textClass = 'text-[#888888]';
              let dotClass = '';

              if (day.isCompleted) {
                bgClass = 'bg-green-500/20';
                textClass = 'text-green-400';
                dotClass = 'bg-green-400';
              } else if (day.isWorkoutDay && new Date(day.iso) <= todayDate) {
                bgClass = 'bg-red-500/10';
                textClass = 'text-[#ef4444]';
                dotClass = 'bg-[#ef4444]';
              } else if (day.isWorkoutDay) {
                bgClass = 'bg-[#1a1a1a]';
                textClass = 'text-[#f5f5f5]';
                dotClass = 'bg-[#888888]';
              }

              if (day.isToday) {
                bgClass = day.isCompleted ? 'bg-green-500/30 ring-2 ring-green-400' : 'bg-[#ef4444]/20 ring-2 ring-[#ef4444]';
                textClass = day.isCompleted ? 'text-green-300 font-bold' : 'text-[#ef4444] font-bold';
              }

              return (
                <div key={day.iso} className={`flex flex-col items-center gap-1 rounded-xl py-2.5 ${bgClass}`}>
                  <span className={`text-xs ${textClass}`}>{day.label}</span>
                  <span className={`text-xs font-bold ${textClass}`}>{day.d.getDate()}</span>
                  {dotClass && (
                    <div className={`w-1.5 h-1.5 rounded-full ${dotClass}`} />
                  )}
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-3">
            {[
              { color: 'bg-green-400', label: 'Completed' },
              { color: 'bg-[#ef4444]', label: 'Workout' },
              { color: 'bg-[#2a2a2a]', label: 'Rest' },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${item.color}`} />
                <span className="text-[#888888] text-xs">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Nutrition Progress ───────────────────────────────────────────────── */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 flex items-center justify-center">
                <Flame size={18} className="text-orange-400" />
              </div>
              <div>
                <h3 className="text-[#f5f5f5] font-semibold text-sm">Nutrition Today</h3>
                <p className="text-[#888888] text-xs">
                  {Math.round(todayNutrition.calories)} / {nutritionTargets?.calories ?? '—'} kcal
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate('/nutrition')}
              className="bg-[#ef4444]/10 border border-[#ef4444]/20 text-[#ef4444] px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
            >
              <Plus size={12} />
              Log Food
            </button>
          </div>

          {/* Calorie progress */}
          <div className="mb-4">
            <ProgressBar
              value={todayNutrition.calories}
              max={nutritionTargets?.calories ?? 2000}
              color="bg-orange-400"
              height="h-3"
            />
            <div className="flex justify-between mt-1">
              <span className="text-[#888888] text-xs">Consumed</span>
              <span className="text-[#888888] text-xs">
                {nutritionTargets ? Math.max(0, nutritionTargets.calories - Math.round(todayNutrition.calories)) : 0} kcal left
              </span>
            </div>
          </div>

          {/* Macros */}
          <div className="space-y-2.5">
            <MacroRow
              label="Protein"
              value={todayNutrition.protein}
              target={nutritionTargets?.proteinG ?? 150}
              color="bg-blue-400"
            />
            <MacroRow
              label="Carbs"
              value={todayNutrition.carbs}
              target={nutritionTargets?.carbsG ?? 200}
              color="bg-yellow-400"
            />
            <MacroRow
              label="Fat"
              value={todayNutrition.fat}
              target={nutritionTargets?.fatG ?? 60}
              color="bg-red-400"
            />
          </div>
        </div>

        {/* ── Weight Progress Mini-card ────────────────────────────────────────── */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <TrendingUp size={18} className="text-blue-400" />
            </div>
            <h3 className="text-[#f5f5f5] font-semibold text-sm">Weight Progress</h3>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="text-center">
              <p className="text-[#f5f5f5] font-bold text-base">
                {currentWeight ? `${currentWeight}kg` : '—'}
              </p>
              <p className="text-[#888888] text-xs mt-0.5">Current</p>
            </div>
            <div className="text-center">
              <p className="text-[#f5f5f5] font-bold text-base">
                {targetWeight ? `${targetWeight}kg` : '—'}
              </p>
              <p className="text-[#888888] text-xs mt-0.5">Target</p>
            </div>
            <div className="text-center">
              {weightDiff !== null ? (
                <>
                  <p className={`font-bold text-base ${weightDiff > 0 ? 'text-red-400' : weightDiff < 0 ? 'text-green-400' : 'text-[#f5f5f5]'}`}>
                    {weightDiff === 0 ? '0 kg' : `${weightDiff > 0 ? '+' : ''}${weightDiff}kg`}
                  </p>
                  <p className="text-[#888888] text-xs mt-0.5">Difference</p>
                </>
              ) : (
                <>
                  <p className="text-[#f5f5f5] font-bold text-base">—</p>
                  <p className="text-[#888888] text-xs mt-0.5">Difference</p>
                </>
              )}
            </div>
          </div>
          <button
            onClick={() => navigate('/progress')}
            className="mt-3 w-full text-center text-[#888888] text-xs flex items-center justify-center gap-1"
          >
            View full progress <ChevronRight size={12} />
          </button>
        </div>

        {/* ── Water Intake (if enabled) ────────────────────────────────────────── */}
        {settings.waterTrackingEnabled && (
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/10 flex items-center justify-center">
                  <Droplets size={18} className="text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-[#f5f5f5] font-semibold text-sm">Water Intake</h3>
                  <p className="text-[#888888] text-xs">{waterMl} / {waterTargetMl} ml</p>
                </div>
              </div>
              <span className="text-cyan-400 font-bold text-sm">
                {Math.round((waterMl / waterTargetMl) * 100)}%
              </span>
            </div>

            {/* Water progress */}
            <ProgressBar value={waterMl} max={waterTargetMl} color="bg-cyan-400" height="h-3" />

            {/* Visual cups */}
            <div className="flex gap-1 mt-3 mb-4">
              {Array.from({ length: 10 }).map((_, i) => {
                const filled = waterMl >= (i + 1) * (waterTargetMl / 10);
                return (
                  <div
                    key={i}
                    className={`flex-1 h-5 rounded ${filled ? 'bg-cyan-400' : 'bg-[#1a1a1a]'} transition-colors`}
                  />
                );
              })}
            </div>

            {/* Quick add buttons */}
            <div className="flex gap-2">
              {[150, 250, 500].map(ml => (
                <button
                  key={ml}
                  onClick={() => addWater(ml)}
                  className="flex-1 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-cyan-500/50 hover:bg-cyan-500/10 text-[#f5f5f5] text-xs font-medium py-2.5 rounded-xl transition-colors"
                >
                  +{ml}ml
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Quick Actions ─────────────────────────────────────────────────────── */}
        <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4">
          <h3 className="text-[#f5f5f5] font-semibold text-sm mb-3">Quick Actions</h3>
          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Update Weight', icon: Scale, color: 'text-blue-400', bg: 'bg-blue-500/10', action: () => navigate('/progress') },
              { label: 'Log Food', icon: Utensils, color: 'text-orange-400', bg: 'bg-orange-500/10', action: () => navigate('/nutrition') },
              { label: 'Edit Routine', icon: RotateCcw, color: 'text-purple-400', bg: 'bg-purple-500/10', action: () => navigate('/library') },
            ].map(item => (
              <button
                key={item.label}
                onClick={item.action}
                className="flex flex-col items-center gap-2 bg-[#1a1a1a] border border-[#2a2a2a] hover:border-[#3a3a3a] rounded-xl py-4 px-2 transition-colors active:scale-95"
              >
                <div className={`w-10 h-10 rounded-xl ${item.bg} flex items-center justify-center`}>
                  <item.icon size={20} className={item.color} />
                </div>
                <span className="text-[#f5f5f5] text-xs font-medium text-center leading-tight">{item.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Target reminder ──────────────────────────────────────────────────── */}
        {profile?.goal && (
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-2xl p-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#ef4444]/10 flex items-center justify-center flex-shrink-0">
                <Target size={18} className="text-[#ef4444]" />
              </div>
              <div>
                <p className="text-[#888888] text-xs">Your Goal</p>
                <p className="text-[#f5f5f5] text-sm font-semibold">
                  {profile.goal === 'muscleGain' ? '💪 Muscle Gain' : profile.goal === 'fatLoss' ? '🔥 Fat Loss' : '⚖️ Maintenance'}
                </p>
              </div>
              {nutritionTargets && (
                <div className="ml-auto text-right">
                  <p className="text-[#f5f5f5] text-sm font-bold">{nutritionTargets.calories} kcal</p>
                  <p className="text-[#888888] text-xs">Daily target</p>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
