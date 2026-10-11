// ========================================================
// DATA MODELS
// ========================================================

export type Sex = 'male' | 'female' | 'other';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'veryActive';
export type Goal = 'muscleGain' | 'maintenance' | 'fatLoss';
export type Units = 'metric' | 'imperial';
export type Difficulty = 'beginner' | 'intermediate' | 'advanced';
export type MuscleGroup =
  | 'chest' | 'shoulders' | 'back' | 'biceps' | 'triceps'
  | 'legs' | 'hamstrings' | 'glutes' | 'calves' | 'core' | 'forearms' | 'fullBody';
export type Equipment =
  | 'barbell' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'ezBar' | 'bands';

export interface UserProfile {
  id: string;
  name: string;
  age: number;
  sex: Sex;
  heightCm: number;
  weightKg: number;
  targetWeightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  units: Units;
  preferredGymTime: string; // HH:MM
  onboardingComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface NutritionTargets {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  overridden: boolean;
}

export interface Exercise {
  id: string;
  name: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
  equipment: Equipment;
  difficulty: Difficulty;
  instructions: string[];
  tips: string[];
  commonMistakes: string[];
  safetyTips: string[];
  alternativeExercise: string;
  image?: string;
  imageUrl?: string;
  isCustom: boolean;
  isFavorite: boolean;
  defaultSets: number;
  defaultReps: string; // e.g. "8-12"
  defaultRestSeconds: number;
}

export interface WorkoutExercise {
  exerciseId: string;
  sets: number;
  reps: string;
  restSeconds: number;
  order: number;
  notes?: string;
}

export interface Workout {
  id: string;
  name: string;
  muscleGroups: MuscleGroup[];
  exercises: WorkoutExercise[];
  estimatedDurationMins: number;
  isRestDay: boolean;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type DayOfWeek = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0=Sun

export interface ScheduleDay {
  day: DayOfWeek;
  workoutId: string | null; // null = rest day
  preferredTime?: string;
}

export interface WorkoutSchedule {
  days: ScheduleDay[];
}

// ─── Session ──────────────────────────────────────────────────────────────────

export interface SetLog {
  setNumber: number;
  targetReps: string;
  actualReps: number | null;
  weightKg: number | null;
  completed: boolean;
  isWarmup: boolean;
}

export interface ExerciseLog {
  exerciseId: string;
  sets: SetLog[];
  notes?: string;
  prBeaten: boolean;
}

export interface WorkoutSession {
  id: string;
  workoutId: string;
  workoutName: string;
  date: string; // ISO date string YYYY-MM-DD
  startTime: string; // ISO timestamp
  endTime?: string;
  durationSeconds?: number;
  exerciseLogs: ExerciseLog[];
  effortRating?: number; // 1-5
  notes?: string;
  completed: boolean;
  inProgress: boolean;
}

// ─── Personal Records ─────────────────────────────────────────────────────────

export interface PersonalRecord {
  exerciseId: string;
  heaviestWeightKg: number;
  bestReps: number;
  estimated1RM: number;
  bestVolume: number; // weight * reps * sets
  achievedAt: string;
}

// ─── Body Measurements ────────────────────────────────────────────────────────

export interface WeightLog {
  id: string;
  date: string;
  weightKg: number;
  notes?: string;
}

export interface BodyMeasurement {
  id: string;
  date: string;
  chestCm?: number;
  waistCm?: number;
  hipsCm?: number;
  shouldersCm?: number;
  bicepsCm?: number;
  thighsCm?: number;
  calvesCm?: number;
}

export interface ProgressPhoto {
  id: string;
  date: string;
  label: 'front' | 'side' | 'back';
  dataUrl: string;
  notes?: string;
}

// ─── Nutrition ────────────────────────────────────────────────────────────────

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface FoodItem {
  id: string;
  name: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servingSize?: string;
  isFavorite: boolean;
  isCustom: boolean;
}

export interface FoodLog {
  id: string;
  date: string; // YYYY-MM-DD
  meal: MealType;
  foodItemId?: string;
  foodName: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  servings: number;
  loggedAt: string;
}

export interface WaterLog {
  date: string;
  amountMl: number;
}

// ─── App Settings ─────────────────────────────────────────────────────────────

export interface AppSettings {
  theme: 'dark' | 'light';
  accentColor: string;
  units: Units;
  weekStartDay: DayOfWeek;
  defaultRestSeconds: number;
  notificationsEnabled: boolean;
  workoutReminderEnabled: boolean;
  waterTrackingEnabled: boolean;
  achievementsEnabled: boolean;
  progressPhotosEnabled: boolean;
  restTimerSound: boolean;
  restTimerVibration: boolean;
  showWarmupSuggestion: boolean;
  deloadReminderWeeks: number;
  language: string;
}

// ─── Achievements ─────────────────────────────────────────────────────────────

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  unlockedAt?: string;
  unlocked: boolean;
}
