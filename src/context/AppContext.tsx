import React, { createContext, useContext, useEffect, useReducer, useCallback } from 'react';
import type {
  UserProfile, WorkoutSchedule, Workout, Exercise, WorkoutSession,
  PersonalRecord, WeightLog, BodyMeasurement, FoodItem, FoodLog,
  WaterLog, AppSettings, Achievement, NutritionTargets, ProgressPhoto
} from '../types';
import {
  profileDB, scheduleDB, workoutsDB, exercisesDB, sessionsDB, prDB,
  weightLogsDB, measurementsDB, photosDB, foodItemsDB, foodLogsDB,
  waterLogsDB, settingsDB, achievementsDB, nutritionTargetsDB
} from '../db';
import {
  DEFAULT_EXERCISES, DEFAULT_WORKOUTS, DEFAULT_SCHEDULE,
  DEFAULT_SETTINGS, DEFAULT_ACHIEVEMENTS, DEFAULT_FOOD_ITEMS
} from '../data/seeds';
import { calculateTargets } from '../utils/fitness';

// ─── State ────────────────────────────────────────────────────────────────────

interface AppState {
  profile: UserProfile | null;
  nutritionTargets: NutritionTargets | null;
  schedule: WorkoutSchedule | null;
  workouts: Workout[];
  exercises: Exercise[];
  sessions: WorkoutSession[];
  personalRecords: PersonalRecord[];
  weightLogs: WeightLog[];
  measurements: BodyMeasurement[];
  progressPhotos: ProgressPhoto[];
  foodItems: FoodItem[];
  foodLogs: FoodLog[];
  waterLogs: WaterLog[];
  settings: AppSettings;
  achievements: Achievement[];
  activeSession: WorkoutSession | null;
  loading: boolean;
  initialized: boolean;
}

type Action =
  | { type: 'INIT'; payload: Partial<AppState> }
  | { type: 'SET_PROFILE'; payload: UserProfile }
  | { type: 'SET_TARGETS'; payload: NutritionTargets }
  | { type: 'SET_SCHEDULE'; payload: WorkoutSchedule }
  | { type: 'SET_WORKOUTS'; payload: Workout[] }
  | { type: 'UPSERT_WORKOUT'; payload: Workout }
  | { type: 'DELETE_WORKOUT'; payload: string }
  | { type: 'SET_EXERCISES'; payload: Exercise[] }
  | { type: 'UPSERT_EXERCISE'; payload: Exercise }
  | { type: 'DELETE_EXERCISE'; payload: string }
  | { type: 'ADD_SESSION'; payload: WorkoutSession }
  | { type: 'UPDATE_SESSION'; payload: WorkoutSession }
  | { type: 'SET_ACTIVE_SESSION'; payload: WorkoutSession | null }
  | { type: 'UPSERT_PR'; payload: PersonalRecord }
  | { type: 'ADD_WEIGHT_LOG'; payload: WeightLog }
  | { type: 'DELETE_WEIGHT_LOG'; payload: string }
  | { type: 'ADD_MEASUREMENT'; payload: BodyMeasurement }
  | { type: 'DELETE_MEASUREMENT'; payload: string }
  | { type: 'ADD_PHOTO'; payload: ProgressPhoto }
  | { type: 'DELETE_PHOTO'; payload: string }
  | { type: 'SET_FOOD_ITEMS'; payload: FoodItem[] }
  | { type: 'UPSERT_FOOD_ITEM'; payload: FoodItem }
  | { type: 'DELETE_FOOD_ITEM'; payload: string }
  | { type: 'ADD_FOOD_LOG'; payload: FoodLog }
  | { type: 'DELETE_FOOD_LOG'; payload: string }
  | { type: 'SET_FOOD_LOGS'; payload: FoodLog[] }
  | { type: 'SET_WATER_LOG'; payload: WaterLog }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'UNLOCK_ACHIEVEMENT'; payload: string }
  | { type: 'RESET' };

const DEFAULT_APP_STATE: AppState = {
  profile: null,
  nutritionTargets: null,
  schedule: null,
  workouts: [],
  exercises: [],
  sessions: [],
  personalRecords: [],
  weightLogs: [],
  measurements: [],
  progressPhotos: [],
  foodItems: [],
  foodLogs: [],
  waterLogs: [],
  settings: DEFAULT_SETTINGS,
  achievements: DEFAULT_ACHIEVEMENTS,
  activeSession: null,
  loading: true,
  initialized: false,
};

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'INIT': return { ...state, ...action.payload, loading: false, initialized: true };
    case 'SET_PROFILE': return { ...state, profile: action.payload };
    case 'SET_TARGETS': return { ...state, nutritionTargets: action.payload };
    case 'SET_SCHEDULE': return { ...state, schedule: action.payload };
    case 'SET_WORKOUTS': return { ...state, workouts: action.payload };
    case 'UPSERT_WORKOUT': return {
      ...state,
      workouts: state.workouts.find(w => w.id === action.payload.id)
        ? state.workouts.map(w => w.id === action.payload.id ? action.payload : w)
        : [...state.workouts, action.payload]
    };
    case 'DELETE_WORKOUT': return { ...state, workouts: state.workouts.filter(w => w.id !== action.payload) };
    case 'SET_EXERCISES': return { ...state, exercises: action.payload };
    case 'UPSERT_EXERCISE': return {
      ...state,
      exercises: state.exercises.find(e => e.id === action.payload.id)
        ? state.exercises.map(e => e.id === action.payload.id ? action.payload : e)
        : [...state.exercises, action.payload]
    };
    case 'DELETE_EXERCISE': return { ...state, exercises: state.exercises.filter(e => e.id !== action.payload) };
    case 'ADD_SESSION': return { ...state, sessions: [...state.sessions, action.payload] };
    case 'UPDATE_SESSION': return { ...state, sessions: state.sessions.map(s => s.id === action.payload.id ? action.payload : s) };
    case 'SET_ACTIVE_SESSION': return { ...state, activeSession: action.payload };
    case 'UPSERT_PR': return {
      ...state,
      personalRecords: state.personalRecords.find(p => p.exerciseId === action.payload.exerciseId)
        ? state.personalRecords.map(p => p.exerciseId === action.payload.exerciseId ? action.payload : p)
        : [...state.personalRecords, action.payload]
    };
    case 'ADD_WEIGHT_LOG': return { ...state, weightLogs: [...state.weightLogs, action.payload].sort((a, b) => a.date.localeCompare(b.date)) };
    case 'DELETE_WEIGHT_LOG': return { ...state, weightLogs: state.weightLogs.filter(w => w.id !== action.payload) };
    case 'ADD_MEASUREMENT': return { ...state, measurements: [...state.measurements, action.payload] };
    case 'DELETE_MEASUREMENT': return { ...state, measurements: state.measurements.filter(m => m.id !== action.payload) };
    case 'ADD_PHOTO': return { ...state, progressPhotos: [...state.progressPhotos, action.payload] };
    case 'DELETE_PHOTO': return { ...state, progressPhotos: state.progressPhotos.filter(p => p.id !== action.payload) };
    case 'SET_FOOD_ITEMS': return { ...state, foodItems: action.payload };
    case 'UPSERT_FOOD_ITEM': return {
      ...state,
      foodItems: state.foodItems.find(f => f.id === action.payload.id)
        ? state.foodItems.map(f => f.id === action.payload.id ? action.payload : f)
        : [...state.foodItems, action.payload]
    };
    case 'DELETE_FOOD_ITEM': return { ...state, foodItems: state.foodItems.filter(f => f.id !== action.payload) };
    case 'ADD_FOOD_LOG': return { ...state, foodLogs: [...state.foodLogs, action.payload] };
    case 'DELETE_FOOD_LOG': return { ...state, foodLogs: state.foodLogs.filter(f => f.id !== action.payload) };
    case 'SET_FOOD_LOGS': return { ...state, foodLogs: action.payload };
    case 'SET_WATER_LOG': return {
      ...state,
      waterLogs: state.waterLogs.find(w => w.date === action.payload.date)
        ? state.waterLogs.map(w => w.date === action.payload.date ? action.payload : w)
        : [...state.waterLogs, action.payload]
    };
    case 'UPDATE_SETTINGS': return { ...state, settings: { ...state.settings, ...action.payload } };
    case 'UNLOCK_ACHIEVEMENT': return {
      ...state,
      achievements: state.achievements.map(a =>
        a.id === action.payload ? { ...a, unlocked: true, unlockedAt: new Date().toISOString() } : a
      )
    };
    case 'RESET': return { ...DEFAULT_APP_STATE, loading: false, initialized: false };
    default: return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  dispatch: React.Dispatch<Action>;
  // Convenience methods
  saveProfile: (p: UserProfile) => Promise<void>;
  saveSchedule: (s: WorkoutSchedule) => Promise<void>;
  saveWorkout: (w: Workout) => Promise<void>;
  deleteWorkout: (id: string) => Promise<void>;
  saveExercise: (e: Exercise) => Promise<void>;
  deleteExercise: (id: string) => Promise<void>;
  startSession: (session: WorkoutSession) => Promise<void>;
  updateActiveSession: (session: WorkoutSession) => Promise<void>;
  finishSession: (session: WorkoutSession) => Promise<void>;
  addWeightLog: (log: WeightLog) => Promise<void>;
  deleteWeightLog: (id: string) => Promise<void>;
  addMeasurement: (m: BodyMeasurement) => Promise<void>;
  deleteMeasurement: (id: string) => Promise<void>;
  addPhoto: (p: ProgressPhoto) => Promise<void>;
  deletePhoto: (id: string) => Promise<void>;
  saveFoodItem: (f: FoodItem) => Promise<void>;
  deleteFoodItem: (id: string) => Promise<void>;
  addFoodLog: (f: FoodLog) => Promise<void>;
  deleteFoodLog: (id: string) => Promise<void>;
  updateWaterLog: (w: WaterLog) => Promise<void>;
  updateSettings: (s: Partial<AppSettings>) => Promise<void>;
  unlockAchievement: (id: string) => Promise<void>;
  saveNutritionTargets: (t: NutritionTargets) => Promise<void>;
  resetAll: () => Promise<void>;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, DEFAULT_APP_STATE);

  // Initialize from DB on mount
  useEffect(() => {
    async function init() {
      try {
        const [
          profile, schedule, workouts, exercises, sessions,
          personalRecords, weightLogs, measurements, progressPhotos,
          foodItems, foodLogs, settings, achievements, nutritionTargets
        ] = await Promise.all([
          profileDB.get(),
          scheduleDB.get(),
          workoutsDB.getAll(),
          exercisesDB.getAll(),
          sessionsDB.getAll(),
          prDB.getAll(),
          weightLogsDB.getAll(),
          measurementsDB.getAll(),
          photosDB.getAll(),
          foodItemsDB.getAll(),
          foodLogsDB.getAll(),
          settingsDB.get(),
          achievementsDB.getAll(),
          nutritionTargetsDB.get(),
        ]);

        // Seed if first launch
        const isFirstLaunch = exercises.length === 0;
        if (isFirstLaunch) {
          for (const ex of DEFAULT_EXERCISES) await exercisesDB.save(ex);
          for (const wk of DEFAULT_WORKOUTS) await workoutsDB.save(wk);
          await scheduleDB.save(DEFAULT_SCHEDULE);
          await settingsDB.save(DEFAULT_SETTINGS);
          for (const ach of DEFAULT_ACHIEVEMENTS) await achievementsDB.save(ach);
          for (const fi of DEFAULT_FOOD_ITEMS) await foodItemsDB.save(fi);
        }

        // Ensure all exercises have valid local images
        let finalExercises = isFirstLaunch ? DEFAULT_EXERCISES : (exercises.length ? exercises : DEFAULT_EXERCISES);
        finalExercises = await Promise.all(
          finalExercises.map(async (ex) => {
            const seed = DEFAULT_EXERCISES.find(s => s.id === ex.id);
            const needsUpgrade = !ex.image || !ex.image.startsWith('/') || ex.imageUrl?.length! <= 4;
            if (seed && needsUpgrade) {
              const updated = {
                ...ex,
                image: seed.image || `/exercises/${seed.id}.jpg`,
                imageUrl: seed.imageUrl || seed.image || `/exercises/${seed.id}.jpg`,
              };
              await exercisesDB.save(updated);
              return updated;
            }
            return ex;
          })
        );

        // Check for in-progress session
        const inProgressSession = sessions.find(s => s.inProgress);

        dispatch({
          type: 'INIT',
          payload: {
            profile: profile ?? null,
            nutritionTargets: nutritionTargets ?? null,
            schedule: isFirstLaunch ? DEFAULT_SCHEDULE : (schedule ?? DEFAULT_SCHEDULE),
            workouts: isFirstLaunch ? DEFAULT_WORKOUTS : (workouts.length ? workouts : DEFAULT_WORKOUTS),
            exercises: finalExercises,
            sessions: sessions ?? [],
            personalRecords: personalRecords ?? [],
            weightLogs: (weightLogs ?? []).sort((a, b) => a.date.localeCompare(b.date)),
            measurements: measurements ?? [],
            progressPhotos: progressPhotos ?? [],
            foodItems: isFirstLaunch ? DEFAULT_FOOD_ITEMS : (foodItems.length ? foodItems : DEFAULT_FOOD_ITEMS),
            foodLogs: foodLogs ?? [],
            waterLogs: [],
            settings: settings ?? DEFAULT_SETTINGS,
            achievements: isFirstLaunch ? DEFAULT_ACHIEVEMENTS : (achievements.length ? achievements : DEFAULT_ACHIEVEMENTS),
            activeSession: inProgressSession ?? null,
          },
        });
      } catch (err) {
        console.error('Failed to initialize app state:', err);
        dispatch({ type: 'INIT', payload: { loading: false } });
      }
    }
    init();
  }, []);

  // ─── Convenience actions ─────────────────────────────────────────────────

  const saveProfile = useCallback(async (p: UserProfile) => {
    await profileDB.save(p);
    dispatch({ type: 'SET_PROFILE', payload: p });
    // Recalculate targets
    const targets = calculateTargets(p);
    await nutritionTargetsDB.save({ ...targets, overridden: false });
    dispatch({ type: 'SET_TARGETS', payload: { ...targets, overridden: false } });
  }, []);

  const saveNutritionTargets = useCallback(async (t: NutritionTargets) => {
    await nutritionTargetsDB.save(t);
    dispatch({ type: 'SET_TARGETS', payload: t });
  }, []);

  const saveSchedule = useCallback(async (s: WorkoutSchedule) => {
    await scheduleDB.save(s);
    dispatch({ type: 'SET_SCHEDULE', payload: s });
  }, []);

  const saveWorkout = useCallback(async (w: Workout) => {
    await workoutsDB.save(w);
    dispatch({ type: 'UPSERT_WORKOUT', payload: w });
  }, []);

  const deleteWorkout = useCallback(async (id: string) => {
    await workoutsDB.delete(id);
    dispatch({ type: 'DELETE_WORKOUT', payload: id });
  }, []);

  const saveExercise = useCallback(async (e: Exercise) => {
    await exercisesDB.save(e);
    dispatch({ type: 'UPSERT_EXERCISE', payload: e });
  }, []);

  const deleteExercise = useCallback(async (id: string) => {
    await exercisesDB.delete(id);
    dispatch({ type: 'DELETE_EXERCISE', payload: id });
  }, []);

  const startSession = useCallback(async (session: WorkoutSession) => {
    await sessionsDB.save(session);
    dispatch({ type: 'ADD_SESSION', payload: session });
    dispatch({ type: 'SET_ACTIVE_SESSION', payload: session });
  }, []);

  const updateActiveSession = useCallback(async (session: WorkoutSession) => {
    await sessionsDB.save(session);
    dispatch({ type: 'UPDATE_SESSION', payload: session });
    dispatch({ type: 'SET_ACTIVE_SESSION', payload: session });
  }, []);

  const finishSession = useCallback(async (session: WorkoutSession) => {
    await sessionsDB.save(session);
    dispatch({ type: 'UPDATE_SESSION', payload: session });
    dispatch({ type: 'SET_ACTIVE_SESSION', payload: null });
  }, []);

  const addWeightLog = useCallback(async (log: WeightLog) => {
    await weightLogsDB.save(log);
    dispatch({ type: 'ADD_WEIGHT_LOG', payload: log });
  }, []);

  const deleteWeightLog = useCallback(async (id: string) => {
    await weightLogsDB.delete(id);
    dispatch({ type: 'DELETE_WEIGHT_LOG', payload: id });
  }, []);

  const addMeasurement = useCallback(async (m: BodyMeasurement) => {
    await measurementsDB.save(m);
    dispatch({ type: 'ADD_MEASUREMENT', payload: m });
  }, []);

  const deleteMeasurement = useCallback(async (id: string) => {
    await measurementsDB.delete(id);
    dispatch({ type: 'DELETE_MEASUREMENT', payload: id });
  }, []);

  const addPhoto = useCallback(async (p: ProgressPhoto) => {
    await photosDB.save(p);
    dispatch({ type: 'ADD_PHOTO', payload: p });
  }, []);

  const deletePhoto = useCallback(async (id: string) => {
    await photosDB.delete(id);
    dispatch({ type: 'DELETE_PHOTO', payload: id });
  }, []);

  const saveFoodItem = useCallback(async (f: FoodItem) => {
    await foodItemsDB.save(f);
    dispatch({ type: 'UPSERT_FOOD_ITEM', payload: f });
  }, []);

  const deleteFoodItem = useCallback(async (id: string) => {
    await foodItemsDB.delete(id);
    dispatch({ type: 'DELETE_FOOD_ITEM', payload: id });
  }, []);

  const addFoodLog = useCallback(async (f: FoodLog) => {
    await foodLogsDB.save(f);
    dispatch({ type: 'ADD_FOOD_LOG', payload: f });
  }, []);

  const deleteFoodLog = useCallback(async (id: string) => {
    await foodLogsDB.delete(id);
    dispatch({ type: 'DELETE_FOOD_LOG', payload: id });
  }, []);

  const updateWaterLog = useCallback(async (w: WaterLog) => {
    await waterLogsDB.save(w);
    dispatch({ type: 'SET_WATER_LOG', payload: w });
  }, []);

  const updateSettings = useCallback(async (s: Partial<AppSettings>) => {
    const newSettings = { ...state.settings, ...s };
    await settingsDB.save(newSettings);
    dispatch({ type: 'UPDATE_SETTINGS', payload: s });
  }, [state.settings]);

  const unlockAchievement = useCallback(async (id: string) => {
    const ach = state.achievements.find(a => a.id === id);
    if (!ach || ach.unlocked) return;
    const updated = { ...ach, unlocked: true, unlockedAt: new Date().toISOString() };
    await achievementsDB.save(updated);
    dispatch({ type: 'UNLOCK_ACHIEVEMENT', payload: id });
  }, [state.achievements]);

  const resetAll = useCallback(async () => {
    const { resetAllData } = await import('../db');
    await resetAllData();
    dispatch({ type: 'RESET' });
    window.location.reload();
  }, []);

  return (
    <AppContext.Provider value={{
      state, dispatch,
      saveProfile, saveSchedule, saveWorkout, deleteWorkout,
      saveExercise, deleteExercise, startSession, updateActiveSession, finishSession,
      addWeightLog, deleteWeightLog, addMeasurement, deleteMeasurement,
      addPhoto, deletePhoto, saveFoodItem, deleteFoodItem,
      addFoodLog, deleteFoodLog, updateWaterLog, updateSettings,
      unlockAchievement, saveNutritionTargets, resetAll,
    }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
