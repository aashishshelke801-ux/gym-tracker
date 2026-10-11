import React, { useState, useMemo } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
  CartesianGrid, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import {
  Trophy, TrendingUp, Zap, Calendar, Lock, Star,
  Activity, Weight, Ruler, ChevronDown, Target, Flame,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { calculateStreak, movingAverage, estimate1RM } from '../utils/fitness';
import type { MuscleGroup, BodyMeasurement } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

type TimeFilter = '1W' | '1M' | '3M' | 'All';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getFilterDate(filter: TimeFilter): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  if (filter === '1W') d.setDate(d.getDate() - 7);
  else if (filter === '1M') d.setMonth(d.getMonth() - 1);
  else if (filter === '3M') d.setMonth(d.getMonth() - 3);
  else d.setFullYear(2000); // effectively "all"
  return d;
}

function formatDate(dateStr: string, short = false): string {
  const d = new Date(dateStr);
  if (short) return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
}

function getWeekLabel(date: Date): string {
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
      <div className="flex items-center gap-2 mb-4">
        <span style={{ color: '#ef4444' }}>{icon}</span>
        <h2 className="font-bold text-base" style={{ color: '#f5f5f5' }}>{title}</h2>
      </div>
      {children}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-2">
      <Activity size={32} style={{ color: '#2a2a2a' }} />
      <p className="text-sm text-center" style={{ color: '#888888' }}>{message}</p>
    </div>
  );
}

const MUSCLE_COLORS: Record<MuscleGroup, string> = {
  chest: '#ef4444',
  shoulders: '#f97316',
  back: '#eab308',
  biceps: '#22c55e',
  triceps: '#06b6d4',
  legs: '#3b82f6',
  hamstrings: '#8b5cf6',
  glutes: '#ec4899',
  calves: '#14b8a6',
  core: '#f59e0b',
  forearms: '#84cc16',
  fullBody: '#a78bfa',
};

type MeasurementKey = keyof Omit<BodyMeasurement, 'id' | 'date'>;
const MEASUREMENT_OPTIONS: { key: MeasurementKey; label: string }[] = [
  { key: 'chestCm', label: 'Chest' },
  { key: 'waistCm', label: 'Waist' },
  { key: 'hipsCm', label: 'Hips' },
  { key: 'shouldersCm', label: 'Shoulders' },
  { key: 'bicepsCm', label: 'Biceps' },
  { key: 'thighsCm', label: 'Thighs' },
  { key: 'calvesCm', label: 'Calves' },
];

// Custom tooltip for recharts
function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string; dataKey: string }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl p-3 text-sm shadow-xl" style={{ background: '#1a1a1a', border: '1px solid #2a2a2a' }}>
      <p className="mb-1 font-semibold" style={{ color: '#f5f5f5' }}>{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} style={{ color: p.color }}>
          {p.name}: <span className="font-bold">{p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Progress() {
  const { state } = useApp();
  const { weightLogs, sessions, exercises, measurements, achievements, foodLogs, profile } = state;

  const [timeFilter, setTimeFilter] = useState<TimeFilter>('1M');
  const [selectedExerciseId, setSelectedExerciseId] = useState<string>('');
  const [selectedMeasurement, setSelectedMeasurement] = useState<MeasurementKey>('waistCm');
  const [exerciseDropdownOpen, setExerciseDropdownOpen] = useState(false);
  const [measureDropdownOpen, setMeasureDropdownOpen] = useState(false);

  const filterDate = useMemo(() => getFilterDate(timeFilter), [timeFilter]);

  // ── Filtered data ──────────────────────────────────────────────────────────
  const filteredWeightLogs = useMemo(
    () => weightLogs.filter(l => new Date(l.date) >= filterDate),
    [weightLogs, filterDate],
  );

  const filteredSessions = useMemo(
    () => sessions.filter(s => s.completed && new Date(s.date) >= filterDate),
    [sessions, filterDate],
  );

  const allCompletedDates = useMemo(
    () => sessions.filter(s => s.completed).map(s => s.date),
    [sessions],
  );

  // ── Weight chart data ──────────────────────────────────────────────────────
  const weightChartData = useMemo(() => {
    const sorted = [...filteredWeightLogs].sort((a, b) => a.date.localeCompare(b.date));
    const ma = movingAverage(sorted.map(l => ({ date: l.date, value: l.weightKg })));
    return sorted.map((l, i) => ({
      date: formatDate(l.date, true),
      weight: l.weightKg,
      movingAvg: ma[i].avg,
    }));
  }, [filteredWeightLogs]);

  // ── Streak & stats ─────────────────────────────────────────────────────────
  const { current: currentStreak, longest: longestStreak } = useMemo(
    () => calculateStreak(allCompletedDates),
    [allCompletedDates],
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const thisWeekCount = useMemo(
    () => sessions.filter(s => s.completed && new Date(s.date) >= weekStart).length,
    [sessions, weekStart],
  );

  // ── Heatmap (last 12 weeks) ────────────────────────────────────────────────
  const heatmapData = useMemo(() => {
    const cells: { date: string; effort: number | null; hasSession: boolean }[] = [];
    const end = new Date(today);
    const start = new Date(today);
    start.setDate(start.getDate() - 83); // 12 weeks = 84 days
    // Go to Sunday
    start.setDate(start.getDate() - start.getDay());

    const sessionMap: Record<string, number> = {};
    sessions.filter(s => s.completed).forEach(s => {
      sessionMap[s.date] = s.effortRating ?? 3;
    });

    const cur = new Date(start);
    while (cur <= end) {
      const dateStr = cur.toISOString().split('T')[0];
      const effort = sessionMap[dateStr] ?? null;
      cells.push({ date: dateStr, effort, hasSession: effort !== null });
      cur.setDate(cur.getDate() + 1);
    }
    return cells;
  }, [sessions, today]);

  const heatmapWeeks = useMemo(() => {
    const weeks: typeof heatmapData[] = [];
    for (let i = 0; i < heatmapData.length; i += 7) {
      weeks.push(heatmapData.slice(i, i + 7));
    }
    return weeks;
  }, [heatmapData]);

  function effortColor(effort: number | null): string {
    if (!effort) return '#1a1a1a';
    if (effort <= 1) return '#7f1d1d';
    if (effort <= 2) return '#b91c1c';
    if (effort <= 3) return '#dc2626';
    if (effort <= 4) return '#ef4444';
    return '#f87171';
  }

  // ── Strength progress ──────────────────────────────────────────────────────
  const exercisesWithData = useMemo(() => {
    const ids = new Set<string>();
    sessions.forEach(s => s.exerciseLogs.forEach(l => ids.add(l.exerciseId)));
    return exercises.filter(e => ids.has(e.id));
  }, [exercises, sessions]);

  const selectedExercise = useMemo(
    () => exercises.find(e => e.id === selectedExerciseId) ?? exercisesWithData[0] ?? null,
    [selectedExerciseId, exercises, exercisesWithData],
  );

  const strengthChartData = useMemo(() => {
    if (!selectedExercise) return [];
    const exId = selectedExercise.id;
    const points: { date: string; maxWeight: number; oneRM: number }[] = [];

    const relevantSessions = [...sessions]
      .filter(s => s.completed && s.exerciseLogs.some(l => l.exerciseId === exId))
      .sort((a, b) => a.date.localeCompare(b.date));

    for (const sess of relevantSessions) {
      const log = sess.exerciseLogs.find(l => l.exerciseId === exId);
      if (!log) continue;
      let maxWeight = 0;
      let bestReps = 0;
      for (const set of log.sets) {
        if (set.completed && set.weightKg && (set.weightKg > maxWeight)) {
          maxWeight = set.weightKg;
          bestReps = set.actualReps ?? 1;
        }
      }
      if (maxWeight > 0) {
        points.push({
          date: formatDate(sess.date, true),
          maxWeight,
          oneRM: estimate1RM(maxWeight, bestReps),
        });
      }
    }
    return points;
  }, [selectedExercise, sessions]);

  // ── Weekly volume chart (last 8 weeks) ────────────────────────────────────
  const weeklyVolumeData = useMemo(() => {
    const weeks: { label: string; start: Date; end: Date }[] = [];
    for (let i = 7; i >= 0; i--) {
      const end = new Date(today);
      end.setDate(today.getDate() - i * 7);
      end.setHours(23, 59, 59, 999);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      start.setHours(0, 0, 0, 0);
      weeks.push({ label: getWeekLabel(start), start, end });
    }

    const muscleGroups: MuscleGroup[] = ['chest', 'back', 'shoulders', 'legs', 'biceps', 'triceps', 'core'];

    return weeks.map(week => {
      const weekSessions = sessions.filter(s => {
        const d = new Date(s.date);
        return s.completed && d >= week.start && d <= week.end;
      });

      const row: Record<string, string | number> = { label: week.label };
      for (const mg of muscleGroups) {
        let vol = 0;
        for (const sess of weekSessions) {
          for (const exLog of sess.exerciseLogs) {
            const ex = exercises.find(e => e.id === exLog.exerciseId);
            if (!ex || (ex.primaryMuscle !== mg && !ex.secondaryMuscles.includes(mg))) continue;
            for (const set of exLog.sets) {
              if (set.completed && set.weightKg && set.actualReps) {
                vol += set.weightKg * set.actualReps;
              }
            }
          }
        }
        row[mg] = Math.round(vol);
      }
      return row;
    });
  }, [sessions, exercises, today]);

  // ── Body measurements chart ────────────────────────────────────────────────
  const measurementChartData = useMemo(() => {
    return [...measurements]
      .filter(m => m[selectedMeasurement] !== undefined && m[selectedMeasurement] !== null)
      .sort((a, b) => a.date.localeCompare(b.date))
      .map(m => ({
        date: formatDate(m.date, true),
        value: m[selectedMeasurement] as number,
      }));
  }, [measurements, selectedMeasurement]);

  // ── Weekly summary ─────────────────────────────────────────────────────────
  const weeklySummary = useMemo(() => {
    const weekSessions = sessions.filter(s => s.completed && new Date(s.date) >= weekStart);
    let totalVolume = 0;
    for (const sess of weekSessions) {
      for (const exLog of sess.exerciseLogs) {
        for (const set of exLog.sets) {
          if (set.completed && set.weightKg && set.actualReps) {
            totalVolume += set.weightKg * set.actualReps;
          }
        }
      }
    }

    const weekFoodLogs = foodLogs.filter(f => {
      const d = new Date(f.date);
      return d >= weekStart;
    });

    const dayProteinMap: Record<string, number> = {};
    weekFoodLogs.forEach(f => {
      dayProteinMap[f.date] = (dayProteinMap[f.date] ?? 0) + f.proteinG;
    });
    const proteinDays = Object.values(dayProteinMap);
    const avgProtein = proteinDays.length
      ? Math.round(proteinDays.reduce((a, b) => a + b, 0) / proteinDays.length)
      : 0;

    const weekWeightLogs = weightLogs.filter(l => new Date(l.date) >= weekStart);
    let weightChange = 0;
    if (weekWeightLogs.length >= 2) {
      const sorted = [...weekWeightLogs].sort((a, b) => a.date.localeCompare(b.date));
      weightChange = Math.round((sorted[sorted.length - 1].weightKg - sorted[0].weightKg) * 10) / 10;
    }

    return { workouts: weekSessions.length, totalVolume: Math.round(totalVolume), avgProtein, weightChange };
  }, [sessions, foodLogs, weightLogs, weekStart]);

  // ── Render ─────────────────────────────────────────────────────────────────

  const timeFilters: TimeFilter[] = ['1W', '1M', '3M', 'All'];

  return (
    <div className="min-h-screen pb-24" style={{ background: '#0a0a0a' }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-12 pb-3" style={{ background: '#0a0a0a', borderBottom: '1px solid #2a2a2a' }}>
        <h1 className="text-2xl font-bold mb-3" style={{ color: '#f5f5f5' }}>Progress</h1>
        {/* Time filter tabs */}
        <div className="flex gap-2">
          {timeFilters.map(f => (
            <button
              key={f}
              onClick={() => setTimeFilter(f)}
              className="flex-1 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: timeFilter === f ? '#ef4444' : '#1a1a1a',
                color: timeFilter === f ? '#fff' : '#888888',
                border: `1px solid ${timeFilter === f ? '#ef4444' : '#2a2a2a'}`,
                minHeight: 44,
              }}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 pt-4 flex flex-col gap-4">

        {/* ── Weekly Summary Card ─────────────────────────────────────── */}
        <div className="rounded-2xl p-4" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
          <div className="flex items-center gap-2 mb-3">
            <Flame size={18} style={{ color: '#ef4444' }} />
            <h2 className="font-bold text-base" style={{ color: '#f5f5f5' }}>This Week</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Workouts', value: weeklySummary.workouts, unit: '' },
              { label: 'Total Volume', value: `${weeklySummary.totalVolume.toLocaleString()}`, unit: 'kg' },
              { label: 'Avg Protein', value: weeklySummary.avgProtein, unit: 'g' },
              {
                label: 'Weight Change',
                value: weeklySummary.weightChange >= 0 ? `+${weeklySummary.weightChange}` : `${weeklySummary.weightChange}`,
                unit: 'kg',
                color: weeklySummary.weightChange < 0 ? '#22c55e' : weeklySummary.weightChange > 0 ? '#ef4444' : '#888888',
              },
            ].map(item => (
              <div key={item.label} className="rounded-xl p-3" style={{ background: '#1a1a1a' }}>
                <p className="text-xs mb-1" style={{ color: '#888888' }}>{item.label}</p>
                <p className="text-xl font-bold" style={{ color: item.color ?? '#f5f5f5' }}>
                  {item.value}
                  {item.unit && <span className="text-sm font-normal ml-1" style={{ color: '#888888' }}>{item.unit}</span>}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Workout Stats Row ───────────────────────────────────────── */}
        <div className="grid grid-cols-4 gap-2">
          {[
            { icon: <Activity size={16} />, label: 'Total', value: sessions.filter(s => s.completed).length },
            { icon: <Flame size={16} />, label: 'Streak', value: `${currentStreak}🔥` },
            { icon: <Star size={16} />, label: 'Best', value: longestStreak },
            { icon: <Calendar size={16} />, label: 'This Wk', value: thisWeekCount },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: '#111111', border: '1px solid #2a2a2a' }}>
              <div className="flex justify-center mb-1" style={{ color: '#ef4444' }}>{item.icon}</div>
              <p className="text-lg font-bold" style={{ color: '#f5f5f5' }}>{item.value}</p>
              <p className="text-xs" style={{ color: '#888888' }}>{item.label}</p>
            </div>
          ))}
        </div>

        {/* ── Weight Chart ────────────────────────────────────────────── */}
        <SectionCard title="Weight" icon={<Weight size={18} />}>
          {weightChartData.length < 2 ? (
            <EmptyState message="Log at least 2 weight entries to see your trend." />
          ) : (
            <>
              {profile?.targetWeightKg && (
                <p className="text-xs mb-2" style={{ color: '#888888' }}>
                  Target: <span style={{ color: '#22c55e' }}>{profile.targetWeightKg} kg</span>
                </p>
              )}
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={weightChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="date" tick={{ fill: '#888888', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#888888', fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                  <Tooltip content={<ChartTooltip />} />
                  {profile?.targetWeightKg && (
                    <ReferenceLine y={profile.targetWeightKg} stroke="#22c55e" strokeDasharray="6 3" label={{ value: 'Target', fill: '#22c55e', fontSize: 10 }} />
                  )}
                  <Line type="monotone" dataKey="weight" name="Weight (kg)" stroke="#3b82f6" strokeWidth={2} dot={{ fill: '#3b82f6', r: 3 }} />
                  <Line type="monotone" dataKey="movingAvg" name="7d Avg" stroke="#f97316" strokeWidth={2} strokeDasharray="5 3" dot={false} />
                </LineChart>
              </ResponsiveContainer>
              <div className="flex gap-4 mt-2">
                {[{ color: '#3b82f6', label: 'Actual' }, { color: '#f97316', label: '7d Avg' }, { color: '#22c55e', label: 'Target' }].map(l => (
                  <div key={l.label} className="flex items-center gap-1">
                    <div className="w-4 h-0.5" style={{ background: l.color }} />
                    <span className="text-xs" style={{ color: '#888888' }}>{l.label}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        {/* ── Workout Calendar Heatmap ─────────────────────────────────── */}
        <SectionCard title="Workout Heatmap" icon={<Calendar size={18} />}>
          <div className="overflow-x-auto">
            <div className="flex gap-1" style={{ minWidth: 0 }}>
              {heatmapWeeks.map((week, wi) => (
                <div key={wi} className="flex flex-col gap-1">
                  {week.map((cell, di) => (
                    <div
                      key={di}
                      className="rounded-sm flex-shrink-0"
                      style={{
                        width: 20,
                        height: 20,
                        background: effortColor(cell.effort),
                        border: '1px solid #2a2a2a',
                        opacity: new Date(cell.date) > today ? 0.3 : 1,
                      }}
                      title={`${cell.date}${cell.hasSession ? ` — Effort: ${cell.effort}/5` : ''}`}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs" style={{ color: '#888888' }}>Less</span>
            {[null, 1, 2, 3, 4, 5].map((v, i) => (
              <div key={i} className="rounded-sm" style={{ width: 14, height: 14, background: effortColor(v) }} />
            ))}
            <span className="text-xs" style={{ color: '#888888' }}>More</span>
          </div>
        </SectionCard>

        {/* ── Strength Progress ────────────────────────────────────────── */}
        <SectionCard title="Strength Progress" icon={<TrendingUp size={18} />}>
          {/* Exercise dropdown */}
          <div className="relative mb-4">
            <button
              onClick={() => setExerciseDropdownOpen(o => !o)}
              className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm"
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f5f5f5', minHeight: 44 }}
            >
              <span>{selectedExercise?.name ?? 'Select exercise'}</span>
              <ChevronDown size={16} style={{ color: '#888888', transform: exerciseDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {exerciseDropdownOpen && (
              <div
                className="absolute left-0 right-0 z-20 rounded-xl overflow-y-auto shadow-2xl"
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', top: '100%', marginTop: 4, maxHeight: 200 }}
              >
                {exercisesWithData.length === 0 && (
                  <p className="px-4 py-3 text-sm" style={{ color: '#888888' }}>No exercise data yet</p>
                )}
                {exercisesWithData.map(ex => (
                  <button
                    key={ex.id}
                    onClick={() => { setSelectedExerciseId(ex.id); setExerciseDropdownOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm"
                    style={{
                      color: selectedExercise?.id === ex.id ? '#ef4444' : '#f5f5f5',
                      background: selectedExercise?.id === ex.id ? '#2a2a2a' : 'transparent',
                    }}
                  >
                    {ex.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          {strengthChartData.length < 2 ? (
            <EmptyState message={selectedExercise ? 'Not enough data. Complete more sessions with this exercise.' : 'Select an exercise above.'} />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={strengthChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="date" tick={{ fill: '#888888', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#888888', fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="maxWeight" name="Max Weight (kg)" stroke="#ef4444" strokeWidth={2} dot={{ fill: '#ef4444', r: 3 }} />
                <Line type="monotone" dataKey="oneRM" name="Est. 1RM (kg)" stroke="#f97316" strokeWidth={2} strokeDasharray="5 3" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* ── Weekly Volume Chart ──────────────────────────────────────── */}
        <SectionCard title="Weekly Volume" icon={<Zap size={18} />}>
          {sessions.filter(s => s.completed).length === 0 ? (
            <EmptyState message="Complete workouts to see weekly volume breakdown." />
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={weeklyVolumeData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                  <XAxis dataKey="label" tick={{ fill: '#888888', fontSize: 9 }} tickLine={false} axisLine={false} />
                  <YAxis tick={{ fill: '#888888', fontSize: 10 }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} />
                  {(['chest', 'back', 'shoulders', 'legs', 'biceps', 'triceps', 'core'] as MuscleGroup[]).map(mg => (
                    <Bar key={mg} dataKey={mg} name={mg.charAt(0).toUpperCase() + mg.slice(1)} stackId="vol" fill={MUSCLE_COLORS[mg]} radius={[0, 0, 0, 0]} />
                  ))}
                </BarChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2">
                {(['chest', 'back', 'shoulders', 'legs', 'biceps', 'triceps', 'core'] as MuscleGroup[]).map(mg => (
                  <div key={mg} className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full" style={{ background: MUSCLE_COLORS[mg] }} />
                    <span className="text-xs" style={{ color: '#888888' }}>{mg.charAt(0).toUpperCase() + mg.slice(1)}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </SectionCard>

        {/* ── Body Measurements Chart ──────────────────────────────────── */}
        <SectionCard title="Body Measurements" icon={<Ruler size={18} />}>
          {/* Measurement dropdown */}
          <div className="relative mb-4">
            <button
              onClick={() => setMeasureDropdownOpen(o => !o)}
              className="w-full flex items-center justify-between rounded-xl px-4 py-3 text-sm"
              style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', color: '#f5f5f5', minHeight: 44 }}
            >
              <span>{MEASUREMENT_OPTIONS.find(o => o.key === selectedMeasurement)?.label ?? 'Waist'}</span>
              <ChevronDown size={16} style={{ color: '#888888', transform: measureDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
            </button>
            {measureDropdownOpen && (
              <div
                className="absolute left-0 right-0 z-20 rounded-xl overflow-hidden shadow-2xl"
                style={{ background: '#1a1a1a', border: '1px solid #2a2a2a', top: '100%', marginTop: 4 }}
              >
                {MEASUREMENT_OPTIONS.map(opt => (
                  <button
                    key={opt.key}
                    onClick={() => { setSelectedMeasurement(opt.key); setMeasureDropdownOpen(false); }}
                    className="w-full text-left px-4 py-3 text-sm"
                    style={{
                      color: selectedMeasurement === opt.key ? '#ef4444' : '#f5f5f5',
                      background: selectedMeasurement === opt.key ? '#2a2a2a' : 'transparent',
                    }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {measurementChartData.length < 2 ? (
            <EmptyState message="Log at least 2 body measurements to see your trend." />
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={measurementChartData} margin={{ top: 5, right: 10, bottom: 5, left: -10 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a2a" />
                <XAxis dataKey="date" tick={{ fill: '#888888', fontSize: 10 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fill: '#888888', fontSize: 10 }} tickLine={false} axisLine={false} domain={['auto', 'auto']} unit=" cm" />
                <Tooltip content={<ChartTooltip />} />
                <Line type="monotone" dataKey="value" name={`${MEASUREMENT_OPTIONS.find(o => o.key === selectedMeasurement)?.label ?? ''} (cm)`} stroke="#8b5cf6" strokeWidth={2} dot={{ fill: '#8b5cf6', r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </SectionCard>

        {/* ── Achievements ─────────────────────────────────────────────── */}
        <SectionCard title="Achievements" icon={<Trophy size={18} />}>
          {achievements.length === 0 ? (
            <EmptyState message="No achievements yet. Keep working out!" />
          ) : (
            <div className="grid grid-cols-3 gap-3">
              {achievements.map(ach => (
                <div
                  key={ach.id}
                  className="rounded-xl p-3 flex flex-col items-center text-center gap-1"
                  style={{
                    background: '#1a1a1a',
                    border: `1px solid ${ach.unlocked ? '#ef4444' : '#2a2a2a'}`,
                    opacity: ach.unlocked ? 1 : 0.45,
                  }}
                >
                  <div className="relative">
                    <span className="text-2xl">{ach.icon}</span>
                    {!ach.unlocked && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-full" style={{ background: 'rgba(0,0,0,0.6)' }}>
                        <Lock size={12} style={{ color: '#888888' }} />
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-semibold leading-tight" style={{ color: ach.unlocked ? '#f5f5f5' : '#888888' }}>{ach.title}</p>
                  {ach.unlocked && ach.unlockedAt && (
                    <p className="text-xs" style={{ color: '#888888' }}>
                      {formatDate(ach.unlockedAt.split('T')[0], true)}
                    </p>
                  )}
                  {!ach.unlocked && (
                    <p className="text-xs leading-tight" style={{ color: '#555' }}>{ach.description}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        {/* ── Personal Records ──────────────────────────────────────────── */}
        <SectionCard title="Personal Records" icon={<Target size={18} />}>
          {state.personalRecords.length === 0 ? (
            <EmptyState message="No PRs yet. Keep lifting heavy!" />
          ) : (
            <div className="flex flex-col gap-2">
              {state.personalRecords.slice(0, 10).map(pr => {
                const ex = exercises.find(e => e.id === pr.exerciseId);
                return (
                  <div key={pr.exerciseId} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ background: '#1a1a1a' }}>
                    <div>
                      <p className="text-sm font-semibold" style={{ color: '#f5f5f5' }}>{ex?.name ?? pr.exerciseId}</p>
                      <p className="text-xs" style={{ color: '#888888' }}>{formatDate(pr.achievedAt.split('T')[0], true)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-base font-bold" style={{ color: '#ef4444' }}>{pr.heaviestWeightKg} kg</p>
                      <p className="text-xs" style={{ color: '#888888' }}>Est 1RM: {pr.estimated1RM} kg</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </SectionCard>

      </div>
    </div>
  );
}
