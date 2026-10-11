import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type {
  UserProfile, WorkoutSchedule, Workout, Exercise, WorkoutSession,
  PersonalRecord, WeightLog, BodyMeasurement, ProgressPhoto,
  FoodItem, FoodLog, WaterLog, AppSettings, Achievement, NutritionTargets
} from '../types';

const DB_NAME = 'gymTrackerDB';
const DB_VERSION = 1;

interface GymDB extends DBSchema {
  profile: { key: string; value: UserProfile };
  nutritionTargets: { key: string; value: NutritionTargets };
  schedule: { key: string; value: WorkoutSchedule };
  workouts: { key: string; value: Workout; indexes: { 'by-name': string } };
  exercises: { key: string; value: Exercise; indexes: { 'by-muscle': string; 'by-name': string } };
  sessions: { key: string; value: WorkoutSession; indexes: { 'by-date': string; 'by-workout': string } };
  personalRecords: { key: string; value: PersonalRecord };
  weightLogs: { key: string; value: WeightLog; indexes: { 'by-date': string } };
  measurements: { key: string; value: BodyMeasurement; indexes: { 'by-date': string } };
  progressPhotos: { key: string; value: ProgressPhoto; indexes: { 'by-date': string } };
  foodItems: { key: string; value: FoodItem; indexes: { 'by-name': string } };
  foodLogs: { key: string; value: FoodLog; indexes: { 'by-date': string } };
  waterLogs: { key: string; value: WaterLog };
  settings: { key: string; value: AppSettings };
  achievements: { key: string; value: Achievement };
}

let dbPromise: Promise<IDBPDatabase<GymDB>> | null = null;

export function getDB(): Promise<IDBPDatabase<GymDB>> {
  if (!dbPromise) {
    dbPromise = openDB<GymDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        // Profile
        if (!db.objectStoreNames.contains('profile')) db.createObjectStore('profile', { keyPath: 'id' });
        // Nutrition targets
        if (!db.objectStoreNames.contains('nutritionTargets')) db.createObjectStore('nutritionTargets', { keyPath: 'id' });
        // Schedule
        if (!db.objectStoreNames.contains('schedule')) db.createObjectStore('schedule', { keyPath: 'id' });
        // Workouts
        if (!db.objectStoreNames.contains('workouts')) {
          const ws = db.createObjectStore('workouts', { keyPath: 'id' });
          ws.createIndex('by-name', 'name');
        }
        // Exercises
        if (!db.objectStoreNames.contains('exercises')) {
          const es = db.createObjectStore('exercises', { keyPath: 'id' });
          es.createIndex('by-muscle', 'primaryMuscle');
          es.createIndex('by-name', 'name');
        }
        // Sessions
        if (!db.objectStoreNames.contains('sessions')) {
          const ss = db.createObjectStore('sessions', { keyPath: 'id' });
          ss.createIndex('by-date', 'date');
          ss.createIndex('by-workout', 'workoutId');
        }
        // PRs
        if (!db.objectStoreNames.contains('personalRecords')) db.createObjectStore('personalRecords', { keyPath: 'exerciseId' });
        // Weight logs
        if (!db.objectStoreNames.contains('weightLogs')) {
          const wl = db.createObjectStore('weightLogs', { keyPath: 'id' });
          wl.createIndex('by-date', 'date');
        }
        // Body measurements
        if (!db.objectStoreNames.contains('measurements')) {
          const ms = db.createObjectStore('measurements', { keyPath: 'id' });
          ms.createIndex('by-date', 'date');
        }
        // Progress photos
        if (!db.objectStoreNames.contains('progressPhotos')) {
          const pp = db.createObjectStore('progressPhotos', { keyPath: 'id' });
          pp.createIndex('by-date', 'date');
        }
        // Food items
        if (!db.objectStoreNames.contains('foodItems')) {
          const fi = db.createObjectStore('foodItems', { keyPath: 'id' });
          fi.createIndex('by-name', 'name');
        }
        // Food logs
        if (!db.objectStoreNames.contains('foodLogs')) {
          const fl = db.createObjectStore('foodLogs', { keyPath: 'id' });
          fl.createIndex('by-date', 'date');
        }
        // Water logs
        if (!db.objectStoreNames.contains('waterLogs')) db.createObjectStore('waterLogs', { keyPath: 'date' });
        // Settings
        if (!db.objectStoreNames.contains('settings')) db.createObjectStore('settings', { keyPath: 'id' });
        // Achievements
        if (!db.objectStoreNames.contains('achievements')) db.createObjectStore('achievements', { keyPath: 'id' });
      },
    });
  }
  return dbPromise;
}

// ─── Generic CRUD helpers ────────────────────────────────────────────────────

async function safeGet<T>(store: string, key: string): Promise<T | undefined> {
  try {
    const db = await getDB();
    return (db as any).get(store, key);
  } catch (e) {
    console.error(`DB get error [${store}]:`, e);
    return undefined;
  }
}

async function safeGetAll<T>(store: string, index?: string, query?: IDBKeyRange | string): Promise<T[]> {
  try {
    const db = await getDB();
    if (index && query !== undefined) return (db as any).getAllFromIndex(store, index, query);
    if (index) return (db as any).getAllFromIndex(store, index);
    return (db as any).getAll(store);
  } catch (e) {
    console.error(`DB getAll error [${store}]:`, e);
    return [];
  }
}

async function safePut<T>(store: string, value: T): Promise<void> {
  try {
    const db = await getDB();
    await (db as any).put(store, value);
  } catch (e) {
    console.error(`DB put error [${store}]:`, e);
  }
}

async function safeDelete(store: string, key: string): Promise<void> {
  try {
    const db = await getDB();
    await (db as any).delete(store, key);
  } catch (e) {
    console.error(`DB delete error [${store}]:`, e);
  }
}

// ─── Profile ─────────────────────────────────────────────────────────────────
export const profileDB = {
  get: () => safeGet<UserProfile>('profile', 'user'),
  save: (p: UserProfile) => safePut('profile', { ...p, id: 'user' }),
};

// ─── Nutrition Targets ────────────────────────────────────────────────────────
export const nutritionTargetsDB = {
  get: () => safeGet<NutritionTargets & { id: string }>('nutritionTargets', 'targets'),
  save: (t: NutritionTargets) => safePut('nutritionTargets', { ...t, id: 'targets' }),
};

// ─── Schedule ─────────────────────────────────────────────────────────────────
export const scheduleDB = {
  get: () => safeGet<WorkoutSchedule & { id: string }>('schedule', 'schedule'),
  save: (s: WorkoutSchedule) => safePut('schedule', { ...s, id: 'schedule' }),
};

// ─── Workouts ─────────────────────────────────────────────────────────────────
export const workoutsDB = {
  getAll: () => safeGetAll<Workout>('workouts'),
  get: (id: string) => safeGet<Workout>('workouts', id),
  save: (w: Workout) => safePut('workouts', w),
  delete: (id: string) => safeDelete('workouts', id),
};

// ─── Exercises ────────────────────────────────────────────────────────────────
export const exercisesDB = {
  getAll: () => safeGetAll<Exercise>('exercises'),
  get: (id: string) => safeGet<Exercise>('exercises', id),
  getByMuscle: (muscle: string) => safeGetAll<Exercise>('exercises', 'by-muscle', muscle),
  save: (e: Exercise) => safePut('exercises', e),
  delete: (id: string) => safeDelete('exercises', id),
};

// ─── Sessions ─────────────────────────────────────────────────────────────────
export const sessionsDB = {
  getAll: () => safeGetAll<WorkoutSession>('sessions'),
  get: (id: string) => safeGet<WorkoutSession>('sessions', id),
  getByDate: (date: string) => safeGetAll<WorkoutSession>('sessions', 'by-date', date),
  save: (s: WorkoutSession) => safePut('sessions', s),
  delete: (id: string) => safeDelete('sessions', id),
};

// ─── Personal Records ─────────────────────────────────────────────────────────
export const prDB = {
  get: (exerciseId: string) => safeGet<PersonalRecord>('personalRecords', exerciseId),
  getAll: () => safeGetAll<PersonalRecord>('personalRecords'),
  save: (pr: PersonalRecord) => safePut('personalRecords', pr),
};

// ─── Weight Logs ──────────────────────────────────────────────────────────────
export const weightLogsDB = {
  getAll: () => safeGetAll<WeightLog>('weightLogs'),
  save: (w: WeightLog) => safePut('weightLogs', w),
  delete: (id: string) => safeDelete('weightLogs', id),
};

// ─── Body Measurements ────────────────────────────────────────────────────────
export const measurementsDB = {
  getAll: () => safeGetAll<BodyMeasurement>('measurements'),
  save: (m: BodyMeasurement) => safePut('measurements', m),
  delete: (id: string) => safeDelete('measurements', id),
};

// ─── Progress Photos ──────────────────────────────────────────────────────────
export const photosDB = {
  getAll: () => safeGetAll<ProgressPhoto>('progressPhotos'),
  save: (p: ProgressPhoto) => safePut('progressPhotos', p),
  delete: (id: string) => safeDelete('progressPhotos', id),
};

// ─── Food Items ───────────────────────────────────────────────────────────────
export const foodItemsDB = {
  getAll: () => safeGetAll<FoodItem>('foodItems'),
  get: (id: string) => safeGet<FoodItem>('foodItems', id),
  save: (f: FoodItem) => safePut('foodItems', f),
  delete: (id: string) => safeDelete('foodItems', id),
};

// ─── Food Logs ────────────────────────────────────────────────────────────────
export const foodLogsDB = {
  getAll: () => safeGetAll<FoodLog>('foodLogs'),
  getByDate: (date: string) => safeGetAll<FoodLog>('foodLogs', 'by-date', date),
  save: (f: FoodLog) => safePut('foodLogs', f),
  delete: (id: string) => safeDelete('foodLogs', id),
};

// ─── Water Logs ───────────────────────────────────────────────────────────────
export const waterLogsDB = {
  get: (date: string) => safeGet<WaterLog>('waterLogs', date),
  save: (w: WaterLog) => safePut('waterLogs', w),
};

// ─── Settings ─────────────────────────────────────────────────────────────────
export const settingsDB = {
  get: () => safeGet<AppSettings & { id: string }>('settings', 'settings'),
  save: (s: AppSettings) => safePut('settings', { ...s, id: 'settings' }),
};

// ─── Achievements ─────────────────────────────────────────────────────────────
export const achievementsDB = {
  getAll: () => safeGetAll<Achievement>('achievements'),
  get: (id: string) => safeGet<Achievement>('achievements', id),
  save: (a: Achievement) => safePut('achievements', a),
};

// ─── Export / Import ──────────────────────────────────────────────────────────

export async function exportAllData(): Promise<string> {
  const [
    profile, schedule, workouts, exercises, sessions,
    personalRecords, weightLogs, measurements, foodItems, foodLogs,
    settings, achievements
  ] = await Promise.all([
    profileDB.get(),
    scheduleDB.get(),
    workoutsDB.getAll(),
    exercisesDB.getAll(),
    sessionsDB.getAll(),
    prDB.getAll(),
    weightLogsDB.getAll(),
    measurementsDB.getAll(),
    foodItemsDB.getAll(),
    foodLogsDB.getAll(),
    settingsDB.get(),
    achievementsDB.getAll(),
  ]);
  return JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    profile, schedule, workouts, exercises, sessions,
    personalRecords, weightLogs, measurements, foodItems, foodLogs,
    settings, achievements,
  }, null, 2);
}

export async function importAllData(json: string): Promise<void> {
  const data = JSON.parse(json);
  if (data.profile) await profileDB.save(data.profile);
  if (data.schedule) await scheduleDB.save(data.schedule);
  if (data.workouts) for (const w of data.workouts) await workoutsDB.save(w);
  if (data.exercises) for (const e of data.exercises) await exercisesDB.save(e);
  if (data.sessions) for (const s of data.sessions) await sessionsDB.save(s);
  if (data.personalRecords) for (const pr of data.personalRecords) await prDB.save(pr);
  if (data.weightLogs) for (const w of data.weightLogs) await weightLogsDB.save(w);
  if (data.measurements) for (const m of data.measurements) await measurementsDB.save(m);
  if (data.foodItems) for (const f of data.foodItems) await foodItemsDB.save(f);
  if (data.foodLogs) for (const f of data.foodLogs) await foodLogsDB.save(f);
  if (data.settings) await settingsDB.save(data.settings);
  if (data.achievements) for (const a of data.achievements) await achievementsDB.save(a);
}

export async function resetAllData(): Promise<void> {
  const db = await getDB();
  const stores = [
    'profile', 'nutritionTargets', 'schedule', 'workouts', 'exercises',
    'sessions', 'personalRecords', 'weightLogs', 'measurements', 'progressPhotos',
    'foodItems', 'foodLogs', 'waterLogs', 'settings', 'achievements'
  ];
  for (const store of stores) {
    await (db as any).clear(store);
  }
  dbPromise = null; // reset
}
