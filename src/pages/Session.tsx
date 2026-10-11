import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Play, Pause, CheckCircle2, Circle, Plus, Trash2,
  ChevronLeft, Trophy, Flame, AlertCircle, Volume2,
  VolumeX, Star, ArrowUpRight, Dumbbell, Sparkles
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { estimate1RM, calculateVolume, kgToLbs, lbsToKg } from '../utils/fitness';
import type { WorkoutSession, ExerciseLog, SetLog, Exercise, PersonalRecord } from '../types';
import ExerciseImage from '../components/ExerciseImage';

function playBeep() {
  try {
    const ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch {
    // audio context might be blocked or unsupported
  }
}

export default function Session() {
  const navigate = useNavigate();
  const { state, updateActiveSession, finishSession } = useApp();
  const { activeSession, exercises, sessions, personalRecords, settings } = state;

  // Session elapsed timer
  const [elapsedSecs, setElapsedSecs] = useState(0);
  const [isPaused, setIsPaused] = useState(false);

  // Rest Timer state
  const [restRemaining, setRestRemaining] = useState<number | null>(null);
  const [restTotal, setRestTotal] = useState(settings.defaultRestSeconds || 90);
  const [soundEnabled, setSoundEnabled] = useState(settings.restTimerSound);

  // Finishing state
  const [showFinishModal, setShowFinishModal] = useState(false);
  const [effortRating, setEffortRating] = useState<number>(4);
  const [finishNotes, setFinishNotes] = useState('');

  // PR Celebrations
  const [celebrationPR, setCelebrationPR] = useState<string | null>(null);

  // Exercise picker modal to add on the fly
  const [showAddExerciseModal, setShowAddExerciseModal] = useState(false);
  const [searchEx, setSearchEx] = useState('');

  const timerRef = useRef<number | null>(null);
  const restTimerRef = useRef<number | null>(null);

  // If no active session, redirect to workouts
  useEffect(() => {
    if (!activeSession) {
      navigate('/workouts', { replace: true });
    }
  }, [activeSession, navigate]);

  // Session elapsed timer ticker
  useEffect(() => {
    if (!activeSession || isPaused) return;

    // Calculate initial elapsed based on startTime
    const startMs = new Date(activeSession.startTime).getTime();
    setElapsedSecs(Math.max(0, Math.floor((Date.now() - startMs) / 1000)));

    timerRef.current = window.setInterval(() => {
      setElapsedSecs(s => s + 1);
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeSession, isPaused]);

  // Rest countdown ticker
  useEffect(() => {
    if (restRemaining === null || restRemaining <= 0) return;

    restTimerRef.current = window.setInterval(() => {
      setRestRemaining(r => {
        if (r === null || r <= 1) {
          if (soundEnabled) playBeep();
          if (navigator.vibrate && settings.restTimerVibration) navigator.vibrate([200, 100, 200]);
          return null;
        }
        return r - 1;
      });
    }, 1000);

    return () => {
      if (restTimerRef.current) clearInterval(restTimerRef.current);
    };
  }, [restRemaining, soundEnabled, settings.restTimerVibration]);

  // Map of exercise lookup
  const exerciseMap = useMemo(() => {
    return new Map(exercises.map(e => [e.id, e]));
  }, [exercises]);

  // Find previous session logs for each exercise to show ghost numbers
  const prevSessionMap = useMemo(() => {
    const map = new Map<string, ExerciseLog>();
    const finishedSessions = sessions
      .filter(s => s.completed && s.id !== activeSession?.id)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    for (const s of finishedSessions) {
      for (const log of s.exerciseLogs) {
        if (!map.has(log.exerciseId) && log.sets.some(st => st.completed)) {
          map.set(log.exerciseId, log);
        }
      }
    }
    return map;
  }, [sessions, activeSession]);

  // Check personal records
  const prMap = useMemo(() => {
    return new Map<string, PersonalRecord>(personalRecords.map(p => [p.exerciseId, p]));
  }, [personalRecords]);

  // Format time MM:SS
  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (!activeSession) return null;

  // Handlers for modifying session sets
  const updateSet = (exerciseIdx: number, setIdx: number, patch: Partial<SetLog>) => {
    const updatedLogs = [...activeSession.exerciseLogs];
    const targetEx = { ...updatedLogs[exerciseIdx] };
    const targetSets = [...targetEx.sets];
    targetSets[setIdx] = { ...targetSets[setIdx], ...patch };
    targetEx.sets = targetSets;
    updatedLogs[exerciseIdx] = targetEx;

    const newSession: WorkoutSession = {
      ...activeSession,
      exerciseLogs: updatedLogs
    };
    updateActiveSession(newSession);
  };

  const toggleSetComplete = (exerciseIdx: number, setIdx: number) => {
    const currentSet = activeSession.exerciseLogs[exerciseIdx].sets[setIdx];
    const willBeComplete = !currentSet.completed;

    // Default weight/reps if left blank
    const defaultReps = currentSet.actualReps !== null ? currentSet.actualReps : parseInt(currentSet.targetReps.split('-')[0]) || 10;
    const defaultWeight = currentSet.weightKg !== null ? currentSet.weightKg : 20;

    const updatedPatch: Partial<SetLog> = {
      completed: willBeComplete,
      actualReps: currentSet.actualReps !== null ? currentSet.actualReps : defaultReps,
      weightKg: currentSet.weightKg !== null ? currentSet.weightKg : defaultWeight,
    };

    updateSet(exerciseIdx, setIdx, updatedPatch);

    // If marked complete, start rest timer
    if (willBeComplete) {
      const exId = activeSession.exerciseLogs[exerciseIdx].exerciseId;
      const exInfo = exerciseMap.get(exId);
      const restSec = exInfo?.defaultRestSeconds || settings.defaultRestSeconds || 90;
      setRestTotal(restSec);
      setRestRemaining(restSec);

      // Check if PR beaten on this set
      const currentPR = prMap.get(exId);
      const curWeight = updatedPatch.weightKg ?? 0;
      if (curWeight > 0 && (!currentPR || curWeight > currentPR.heaviestWeightKg)) {
        setCelebrationPR(`New Heaviest Weight on ${exInfo?.name || 'Exercise'}! ${curWeight} kg 🏆`);
        setTimeout(() => setCelebrationPR(null), 4000);
      }
    }
  };

  const addSet = (exerciseIdx: number) => {
    const updatedLogs = [...activeSession.exerciseLogs];
    const targetEx = { ...updatedLogs[exerciseIdx] };
    const prevSet = targetEx.sets[targetEx.sets.length - 1];

    const newSet: SetLog = {
      setNumber: targetEx.sets.length + 1,
      targetReps: prevSet?.targetReps || '8-12',
      actualReps: prevSet?.actualReps || null,
      weightKg: prevSet?.weightKg || null,
      completed: false,
      isWarmup: false,
    };

    targetEx.sets = [...targetEx.sets, newSet];
    updatedLogs[exerciseIdx] = targetEx;

    updateActiveSession({ ...activeSession, exerciseLogs: updatedLogs });
  };

  const removeSet = (exerciseIdx: number, setIdx: number) => {
    const updatedLogs = [...activeSession.exerciseLogs];
    const targetEx = { ...updatedLogs[exerciseIdx] };
    if (targetEx.sets.length <= 1) return; // keep at least 1 set

    targetEx.sets = targetEx.sets
      .filter((_, idx) => idx !== setIdx)
      .map((st, idx) => ({ ...st, setNumber: idx + 1 }));

    updatedLogs[exerciseIdx] = targetEx;
    updateActiveSession({ ...activeSession, exerciseLogs: updatedLogs });
  };

  const removeExercise = (exerciseIdx: number) => {
    const updatedLogs = activeSession.exerciseLogs.filter((_, idx) => idx !== exerciseIdx);
    updateActiveSession({ ...activeSession, exerciseLogs: updatedLogs });
  };

  const addExerciseOnTheFly = (ex: Exercise) => {
    const newLog: ExerciseLog = {
      exerciseId: ex.id,
      sets: Array.from({ length: ex.defaultSets || 3 }).map((_, i) => ({
        setNumber: i + 1,
        targetReps: ex.defaultReps || '8-12',
        actualReps: null,
        weightKg: null,
        completed: false,
        isWarmup: false,
      })),
      prBeaten: false,
    };

    updateActiveSession({
      ...activeSession,
      exerciseLogs: [...activeSession.exerciseLogs, newLog]
    });
    setShowAddExerciseModal(false);
  };

  const handleFinishWorkout = async () => {
    const totalDuration = elapsedSecs;
    const finalSession: WorkoutSession = {
      ...activeSession,
      completed: true,
      inProgress: false,
      endTime: new Date().toISOString(),
      durationSeconds: totalDuration,
      effortRating,
      notes: finishNotes,
    };

    await finishSession(finalSession);
    navigate('/progress', { replace: true });
  };

  const totalSets = activeSession.exerciseLogs.reduce((acc, el) => acc + el.sets.length, 0);
  const completedSets = activeSession.exerciseLogs.reduce(
    (acc, el) => acc + el.sets.filter(s => s.completed).length,
    0
  );
  const progressPct = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-[#f5f5f5] pb-24 selection:bg-[#ef4444] selection:text-white">
      {/* PR Celebration Alert */}
      {celebrationPR && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-gradient-to-r from-amber-500 to-yellow-600 text-black px-5 py-3 rounded-2xl font-bold shadow-2xl flex items-center gap-3 animate-bounce">
          <Trophy className="w-6 h-6 animate-spin" />
          <span>{celebrationPR}</span>
        </div>
      )}

      {/* Top Floating Control Bar */}
      <header className="sticky top-0 z-30 bg-[#111111]/90 backdrop-blur-md border-b border-[#2a2a2a] px-4 py-3">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-3">
          <button
            onClick={() => navigate('/workouts')}
            className="p-2 rounded-xl bg-[#1a1a1a] hover:bg-[#222222] transition-colors border border-[#2a2a2a]"
          >
            <ChevronLeft className="w-5 h-5 text-[#888888]" />
          </button>

          <div className="flex-1 text-center">
            <h1 className="text-base font-bold truncate">{activeSession.workoutName}</h1>
            <div className="flex items-center justify-center gap-2 text-xs text-[#888888]">
              <span className="font-mono text-white text-sm font-semibold">{formatTime(elapsedSecs)}</span>
              <span>•</span>
              <span className="text-[#22c55e]">{completedSets}/{totalSets} sets ({progressPct}%)</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsPaused(!isPaused)}
              className="p-2 rounded-xl bg-[#1a1a1a] hover:bg-[#222222] transition-colors border border-[#2a2a2a]"
              title={isPaused ? "Resume" : "Pause"}
            >
              {isPaused ? <Play className="w-5 h-5 text-[#22c55e]" /> : <Pause className="w-5 h-5 text-[#f59e0b]" />}
            </button>
            <button
              onClick={() => setShowFinishModal(true)}
              className="px-3.5 py-2 bg-[#ef4444] hover:bg-[#dc2626] text-white text-xs font-bold rounded-xl shadow-lg shadow-[#ef4444]/20 transition-all flex items-center gap-1.5"
            >
              <span>Finish</span>
            </button>
          </div>
        </div>

        {/* Progress bar line */}
        <div className="w-full bg-[#1a1a1a] h-1.5 mt-3 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-[#ef4444] to-[#f59e0b] h-full transition-all duration-300"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </header>

      {/* Floating Rest Timer Widget */}
      {restRemaining !== null && (
        <div className="sticky top-20 z-20 px-4 mb-4">
          <div className="max-w-2xl mx-auto bg-gradient-to-r from-[#1a1a1a] to-[#222222] border border-[#ef4444]/40 rounded-2xl p-3 shadow-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#ef4444]/20 border border-[#ef4444]/30 flex items-center justify-center font-bold text-[#ef4444]">
                ⏳
              </div>
              <div>
                <p className="text-xs text-[#888888] font-medium">Resting</p>
                <p className="text-xl font-mono font-extrabold text-[#f5f5f5]">{formatTime(restRemaining)}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className="p-2 rounded-xl bg-[#111111] text-[#888888] hover:text-white transition-colors"
              >
                {soundEnabled ? <Volume2 className="w-4 h-4 text-[#22c55e]" /> : <VolumeX className="w-4 h-4 text-[#888888]" />}
              </button>
              <button
                onClick={() => setRestRemaining(r => (r !== null ? r + 30 : 30))}
                className="px-2.5 py-1.5 rounded-xl bg-[#111111] text-xs font-semibold text-[#888888] hover:text-white"
              >
                +30s
              </button>
              <button
                onClick={() => setRestRemaining(null)}
                className="px-3 py-1.5 rounded-xl bg-[#ef4444]/20 text-[#ef4444] hover:bg-[#ef4444]/30 text-xs font-bold transition-colors"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exercise Cards */}
      <main className="max-w-2xl mx-auto px-4 mt-4 space-y-6">
        {activeSession.exerciseLogs.map((log, exIdx) => {
          const exInfo = exerciseMap.get(log.exerciseId);
          const prevLog = prevSessionMap.get(log.exerciseId);
          const pr = prMap.get(log.exerciseId);

          return (
            <div
              key={log.exerciseId + '-' + exIdx}
              className="bg-[#111111] border border-[#2a2a2a] rounded-3xl p-4 shadow-lg space-y-4"
            >
              {/* Exercise Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-[#1a1a1a] border border-[#2a2a2a] flex-shrink-0">
                    <ExerciseImage
                      src={exInfo?.image || exInfo?.imageUrl}
                      alt={exInfo?.name || 'Exercise'}
                      aspectRatio="square"
                      fallbackIconSize={20}
                      className="w-full h-full"
                    />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-white leading-snug">{exInfo?.name || 'Custom Exercise'}</h2>
                    <p className="text-xs text-[#888888] capitalize">
                      {exInfo?.primaryMuscle || 'General'} • {exInfo?.equipment || 'Freeweights'}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => removeExercise(exIdx)}
                  className="p-2 text-[#666666] hover:text-red-400 transition-colors"
                  title="Remove exercise"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Progressive Overload & PR Badge row */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {pr && (
                  <span className="px-2 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center gap-1 font-medium">
                    <Trophy className="w-3.5 h-3.5" /> Best: {pr.heaviestWeightKg}kg × {pr.bestReps} reps
                  </span>
                )}
                <span className="px-2 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center gap-1 font-medium">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Overload: +1 rep or +2.5kg
                </span>
              </div>

              {/* Sets Table */}
              <div className="space-y-2">
                <div className="grid grid-cols-12 gap-2 text-[11px] font-bold text-[#666666] uppercase px-2">
                  <span className="col-span-2">Set</span>
                  <span className="col-span-3 text-center">Previous</span>
                  <span className="col-span-3 text-center">Kg</span>
                  <span className="col-span-3 text-center">Reps</span>
                  <span className="col-span-1 text-right">✓</span>
                </div>

                {log.sets.map((st, setIdx) => {
                  const prevSet = prevLog?.sets[setIdx];

                  return (
                    <div
                      key={st.setNumber}
                      className={`grid grid-cols-12 gap-2 items-center p-2 rounded-2xl transition-colors ${
                        st.completed
                          ? 'bg-emerald-950/20 border border-emerald-500/30'
                          : 'bg-[#181818] border border-[#2a2a2a]'
                      }`}
                    >
                      {/* Set Number */}
                      <div className="col-span-2 flex items-center gap-1">
                        <span className="w-6 h-6 rounded-lg bg-[#222222] text-xs font-bold text-center leading-6 text-white">
                          {st.setNumber}
                        </span>
                      </div>

                      {/* Ghost/Previous data */}
                      <div className="col-span-3 text-center text-xs text-[#666666] truncate font-mono">
                        {prevSet && prevSet.completed && prevSet.weightKg !== null && prevSet.actualReps !== null
                          ? `${prevSet.weightKg}k × ${prevSet.actualReps}`
                          : '—'}
                      </div>

                      {/* Weight Input */}
                      <div className="col-span-3">
                        <input
                          type="number"
                          step="0.5"
                          placeholder="20"
                          value={st.weightKg !== null ? st.weightKg : ''}
                          onChange={e => {
                            const val = e.target.value === '' ? null : parseFloat(e.target.value);
                            updateSet(exIdx, setIdx, { weightKg: val });
                          }}
                          className="w-full text-center bg-[#111111] border border-[#333333] focus:border-[#ef4444] rounded-xl py-1.5 text-sm font-mono font-bold text-white focus:outline-none"
                        />
                      </div>

                      {/* Reps Input */}
                      <div className="col-span-3">
                        <input
                          type="number"
                          placeholder={st.targetReps || '10'}
                          value={st.actualReps !== null ? st.actualReps : ''}
                          onChange={e => {
                            const val = e.target.value === '' ? null : parseInt(e.target.value);
                            updateSet(exIdx, setIdx, { actualReps: val });
                          }}
                          className="w-full text-center bg-[#111111] border border-[#333333] focus:border-[#ef4444] rounded-xl py-1.5 text-sm font-mono font-bold text-white focus:outline-none"
                        />
                      </div>

                      {/* Complete Checkbox */}
                      <div className="col-span-1 flex justify-end">
                        <button
                          onClick={() => toggleSetComplete(exIdx, setIdx)}
                          className={`p-1 rounded-lg transition-transform active:scale-90 ${
                            st.completed ? 'text-[#22c55e]' : 'text-[#555555] hover:text-[#888888]'
                          }`}
                        >
                          {st.completed ? (
                            <CheckCircle2 className="w-6 h-6 fill-[#22c55e]/20" />
                          ) : (
                            <Circle className="w-6 h-6" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Set Button */}
              <div className="flex items-center justify-between pt-1">
                <button
                  onClick={() => addSet(exIdx)}
                  className="px-3 py-1.5 rounded-xl bg-[#1a1a1a] hover:bg-[#222222] border border-[#2a2a2a] text-xs font-semibold text-[#888888] hover:text-white transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Set
                </button>
                {log.sets.length > 1 && (
                  <button
                    onClick={() => removeSet(exIdx, log.sets.length - 1)}
                    className="text-xs text-[#666666] hover:text-red-400 transition-colors"
                  >
                    Remove Last Set
                  </button>
                )}
              </div>
            </div>
          );
        })}

        {/* Add Exercise Floating Button */}
        <button
          onClick={() => setShowAddExerciseModal(true)}
          className="w-full py-4 rounded-3xl border-2 border-dashed border-[#2a2a2a] hover:border-[#ef4444]/50 bg-[#111111]/40 text-[#888888] hover:text-white flex items-center justify-center gap-2 text-sm font-bold transition-all"
        >
          <Plus className="w-5 h-5 text-[#ef4444]" />
          <span>Add Exercise on the fly</span>
        </button>
      </main>

      {/* Exercise Picker Modal */}
      {showAddExerciseModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[80vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-[#2a2a2a] flex items-center justify-between">
              <h3 className="font-bold text-lg text-white">Add Exercise</h3>
              <button
                onClick={() => setShowAddExerciseModal(false)}
                className="text-xs text-[#888888] hover:text-white font-semibold"
              >
                Close
              </button>
            </div>
            <div className="p-4 border-b border-[#2a2a2a]">
              <input
                type="text"
                placeholder="Search exercise..."
                value={searchEx}
                onChange={e => setSearchEx(e.target.value)}
                className="w-full bg-[#181818] border border-[#333333] rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-[#ef4444]"
              />
            </div>
            <div className="overflow-y-auto p-4 space-y-2 flex-1">
              {exercises
                .filter(e => e.name.toLowerCase().includes(searchEx.toLowerCase()))
                .map(e => (
                  <button
                    key={e.id}
                    onClick={() => addExerciseOnTheFly(e)}
                    className="w-full p-3 bg-[#181818] hover:bg-[#222222] border border-[#2a2a2a] rounded-2xl flex items-center justify-between transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl overflow-hidden bg-[#222222] border border-[#2a2a2a] flex-shrink-0">
                        <ExerciseImage
                          src={e.image || e.imageUrl}
                          alt={e.name}
                          aspectRatio="square"
                          fallbackIconSize={16}
                          className="w-full h-full"
                        />
                      </div>
                      <div>
                        <p className="font-bold text-sm text-white">{e.name}</p>
                        <p className="text-xs text-[#888888] capitalize">{e.primaryMuscle} • {e.equipment}</p>
                      </div>
                    </div>
                    <Plus className="w-5 h-5 text-[#ef4444]" />
                  </button>
                ))}
            </div>
          </div>
        </div>
      )}

      {/* Finish Session Confirmation Modal */}
      {showFinishModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#111111] border border-[#2a2a2a] rounded-3xl w-full max-w-md p-6 space-y-5 shadow-2xl">
            <div className="text-center space-y-1">
              <div className="w-14 h-14 rounded-2xl bg-[#ef4444]/20 border border-[#ef4444]/30 text-[#ef4444] mx-auto flex items-center justify-center text-2xl font-bold">
                🏆
              </div>
              <h3 className="font-bold text-xl text-white">Workout Complete!</h3>
              <p className="text-xs text-[#888888]">
                {formatTime(elapsedSecs)} duration • {completedSets} completed sets
              </p>
            </div>

            {/* Effort Rating */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-[#888888] uppercase block text-center">
                Effort Rating (RPE 1-5)
              </label>
              <div className="flex justify-center gap-2">
                {[1, 2, 3, 4, 5].map(star => (
                  <button
                    key={star}
                    onClick={() => setEffortRating(star)}
                    className={`p-2 rounded-xl transition-all ${
                      effortRating >= star
                        ? 'text-yellow-400 scale-110'
                        : 'text-[#444444] hover:text-[#888888]'
                    }`}
                  >
                    <Star className="w-7 h-7 fill-current" />
                  </button>
                ))}
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#888888] uppercase">Workout Notes</label>
              <textarea
                placeholder="How did it feel? Any shoulder tweaks or great pumps?"
                value={finishNotes}
                onChange={e => setFinishNotes(e.target.value)}
                rows={3}
                className="w-full bg-[#181818] border border-[#333333] rounded-2xl p-3 text-sm text-white focus:outline-none focus:border-[#ef4444] resize-none"
              />
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setShowFinishModal(false)}
                className="flex-1 py-3 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] text-sm font-semibold text-[#888888] hover:text-white"
              >
                Keep Going
              </button>
              <button
                onClick={handleFinishWorkout}
                className="flex-1 py-3 rounded-2xl bg-[#ef4444] hover:bg-[#dc2626] text-white text-sm font-bold shadow-lg shadow-[#ef4444]/25 transition-all"
              >
                Save Workout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
