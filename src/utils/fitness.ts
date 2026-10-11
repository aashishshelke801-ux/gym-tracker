import type { UserProfile, ActivityLevel, Goal } from '../types';

// ─── BMR & TDEE ───────────────────────────────────────────────────────────────

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  veryActive: 1.9,
};

export function calculateBMR(profile: Pick<UserProfile, 'sex' | 'weightKg' | 'heightCm' | 'age'>): number {
  // Mifflin-St Jeor
  const base = 10 * profile.weightKg + 6.25 * profile.heightCm - 5 * profile.age;
  return profile.sex === 'male' ? base + 5 : base - 161;
}

export function calculateTDEE(profile: Pick<UserProfile, 'sex' | 'weightKg' | 'heightCm' | 'age' | 'activityLevel'>): number {
  return Math.round(calculateBMR(profile) * ACTIVITY_MULTIPLIERS[profile.activityLevel]);
}

export function calculateTargets(profile: Pick<UserProfile, 'sex' | 'weightKg' | 'heightCm' | 'age' | 'activityLevel' | 'goal'>): {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
} {
  const tdee = calculateTDEE(profile);
  let calories: number;
  let proteinG: number;

  switch (profile.goal) {
    case 'muscleGain':
      calories = tdee + 250;
      proteinG = Math.round(profile.weightKg * 1.8); // ~1.8g/kg
      break;
    case 'fatLoss':
      calories = Math.max(1400, tdee - 400); // never below 1400 kcal
      proteinG = Math.round(profile.weightKg * 2.0); // higher protein during cut
      break;
    default: // maintenance
      calories = tdee;
      proteinG = Math.round(profile.weightKg * 1.6);
  }

  const proteinCals = proteinG * 4;
  const fatCals = Math.round(calories * 0.25);
  const fatG = Math.round(fatCals / 9);
  const carbsCals = calories - proteinCals - fatCals;
  const carbsG = Math.round(Math.max(0, carbsCals) / 4);

  return { calories: Math.round(calories), proteinG, carbsG, fatG };
}

// ─── BMI ──────────────────────────────────────────────────────────────────────

export function calculateBMI(weightKg: number, heightCm: number): number {
  const heightM = heightCm / 100;
  return Math.round((weightKg / (heightM * heightM)) * 10) / 10;
}

export function bmiCategory(bmi: number): string {
  if (bmi < 18.5) return 'Underweight';
  if (bmi < 25) return 'Normal';
  if (bmi < 30) return 'Overweight';
  return 'Obese';
}

// ─── 1RM Estimate (Epley) ─────────────────────────────────────────────────────

export function estimate1RM(weightKg: number, reps: number): number {
  if (reps === 1) return weightKg;
  return Math.round(weightKg * (1 + reps / 30));
}

// ─── Volume ───────────────────────────────────────────────────────────────────

export function calculateVolume(weightKg: number, reps: number, sets: number): number {
  return Math.round(weightKg * reps * sets * 10) / 10;
}

// ─── Unit conversions ─────────────────────────────────────────────────────────

export function kgToLbs(kg: number): number { return Math.round(kg * 2.2046 * 10) / 10; }
export function lbsToKg(lbs: number): number { return Math.round(lbs / 2.2046 * 10) / 10; }
export function cmToFtIn(cm: number): string {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inches = Math.round(totalIn % 12);
  return `${ft}'${inches}"`;
}
export function ftInToCm(ft: number, inches: number): number {
  return Math.round((ft * 12 + inches) * 2.54);
}

// ─── 7-day moving average ─────────────────────────────────────────────────────

export function movingAverage(values: { date: string; value: number }[], window = 7): { date: string; avg: number }[] {
  return values.map((v, i) => {
    const slice = values.slice(Math.max(0, i - window + 1), i + 1);
    const avg = slice.reduce((s, x) => s + x.value, 0) / slice.length;
    return { date: v.date, avg: Math.round(avg * 10) / 10 };
  });
}

// ─── Streak calculation ───────────────────────────────────────────────────────

export function calculateStreak(completedDates: string[]): { current: number; longest: number } {
  if (!completedDates.length) return { current: 0, longest: 0 };
  const sorted = [...new Set(completedDates)].sort();
  let longest = 1;
  let current = 1;
  let temp = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const curr = new Date(sorted[i]);
    const diff = (curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24);
    if (diff === 1) {
      temp++;
      longest = Math.max(longest, temp);
    } else {
      temp = 1;
    }
  }

  // Check if current streak is still active (last workout was today or yesterday)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const lastDate = new Date(sorted[sorted.length - 1]);
  const daysSinceLast = (today.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
  if (daysSinceLast <= 1) {
    // Recalculate streak from end
    current = 1;
    for (let i = sorted.length - 1; i > 0; i--) {
      const d1 = new Date(sorted[i]);
      const d2 = new Date(sorted[i - 1]);
      const diff = (d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24);
      if (diff === 1) current++;
      else break;
    }
  } else {
    current = 0;
  }

  return { current, longest };
}

// ─── Workout duration estimate ────────────────────────────────────────────────

export function estimateWorkoutDuration(exercises: { sets: number; restSeconds: number; reps: string }[]): number {
  let totalSecs = 0;
  for (const ex of exercises) {
    const repsNum = parseInt(ex.reps.split('-')[1] || ex.reps) || 12;
    const setTime = Math.max(30, repsNum * 3); // ~3 sec/rep min 30s
    totalSecs += ex.sets * (setTime + ex.restSeconds);
  }
  return Math.round(totalSecs / 60);
}

// ─── Calorie safety check ─────────────────────────────────────────────────────

export const MIN_CALORIES = { male: 1500, female: 1200, other: 1200 } as const;
export function isSafeCalorieTarget(calories: number, sex: 'male' | 'female' | 'other'): boolean {
  return calories >= MIN_CALORIES[sex];
}
