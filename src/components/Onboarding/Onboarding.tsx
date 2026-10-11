import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  ChevronLeft,
  User,
  Target,
  Zap,
  Settings,
  Dumbbell,
  Flame,
  Shield,
  Check,
  X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import type { UserProfile, Sex, Goal, ActivityLevel, Units } from '../../types';
import { calculateTargets } from '../../utils/fitness';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FormData {
  name: string;
  age: string;
  sex: Sex;
  heightCm: string;
  weightKg: string;
  goal: Goal;
  targetWeightKg: string;
  activityLevel: ActivityLevel;
  units: Units;
  preferredGymTime: string;
  weekStartDay: 0 | 1;
}

interface ValidationErrors {
  name?: string;
  age?: string;
  heightCm?: string;
  weightKg?: string;
  targetWeightKg?: string;
}

// ─── Step Configs ─────────────────────────────────────────────────────────────

const GOAL_OPTIONS: { value: Goal; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  {
    value: 'muscleGain',
    label: 'Muscle Gain',
    desc: 'Build strength and add lean mass',
    icon: <Dumbbell size={24} />,
    color: 'from-blue-500/20 to-blue-600/10',
  },
  {
    value: 'maintenance',
    label: 'Maintenance',
    desc: 'Keep your current physique',
    icon: <Shield size={24} />,
    color: 'from-green-500/20 to-green-600/10',
  },
  {
    value: 'fatLoss',
    label: 'Fat Loss',
    desc: 'Reduce body fat, keep muscle',
    icon: <Flame size={24} />,
    color: 'from-orange-500/20 to-orange-600/10',
  },
];

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; desc: string; emoji: string }[] = [
  { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, little to no exercise', emoji: '🛋️' },
  { value: 'light', label: 'Light', desc: '1–3 days/week of light exercise', emoji: '🚶' },
  { value: 'moderate', label: 'Moderate', desc: '3–5 days/week of moderate exercise', emoji: '🏃' },
  { value: 'active', label: 'Active', desc: '6–7 days/week of hard exercise', emoji: '💪' },
  { value: 'veryActive', label: 'Very Active', desc: 'Physical job + heavy training daily', emoji: '🔥' },
];

const DAY_LABELS = ['Sunday', 'Monday'];

// ─── Validation ───────────────────────────────────────────────────────────────

function validateStep(step: number, data: FormData): ValidationErrors {
  const errors: ValidationErrors = {};
  if (step === 0) {
    if (!data.name.trim()) errors.name = 'Name is required';
    const age = parseInt(data.age);
    if (!data.age || isNaN(age) || age < 10 || age > 100) errors.age = 'Age must be between 10 and 100';
    const h = parseFloat(data.heightCm);
    if (!data.heightCm || isNaN(h) || h < 100 || h > 250) errors.heightCm = 'Height must be 100–250 cm';
    const w = parseFloat(data.weightKg);
    if (!data.weightKg || isNaN(w) || w < 20 || w > 300) errors.weightKg = 'Weight must be 20–300 kg';
  }
  if (step === 1) {
    const tw = parseFloat(data.targetWeightKg);
    if (!data.targetWeightKg || isNaN(tw) || tw < 20 || tw > 300) errors.targetWeightKg = 'Target weight must be 20–300 kg';
  }
  return errors;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Onboarding() {
  const navigate = useNavigate();
  const { saveProfile, updateSettings } = useApp();

  const [step, setStep] = useState(0);
  const [direction, setDirection] = useState(1);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<FormData>({
    name: '',
    age: '',
    sex: 'male',
    heightCm: '',
    weightKg: '',
    goal: 'muscleGain',
    targetWeightKg: '',
    activityLevel: 'moderate',
    units: 'metric',
    preferredGymTime: '07:00',
    weekStartDay: 1,
  });

  const totalSteps = 4;

  function set<K extends keyof FormData>(key: K, value: FormData[K]) {
    setForm(prev => ({ ...prev, [key]: value }));
    setErrors(prev => ({ ...prev, [key]: undefined }));
  }

  function goNext() {
    const errs = validateStep(step, form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setDirection(1);
    setStep(s => Math.min(s + 1, totalSteps - 1));
  }

  function goBack() {
    setDirection(-1);
    setStep(s => Math.max(s - 1, 0));
  }

  function skip() {
    setDirection(1);
    setStep(s => Math.min(s + 1, totalSteps - 1));
  }

  async function handleComplete() {
    const errs = validateStep(step, form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSaving(true);
    try {
      const now = new Date().toISOString();
      const profile: UserProfile = {
        id: 'user',
        name: form.name.trim() || 'Athlete',
        age: parseInt(form.age) || 25,
        sex: form.sex,
        heightCm: parseFloat(form.heightCm) || 170,
        weightKg: parseFloat(form.weightKg) || 70,
        targetWeightKg: parseFloat(form.targetWeightKg) || parseFloat(form.weightKg) || 70,
        activityLevel: form.activityLevel,
        goal: form.goal,
        units: form.units,
        preferredGymTime: form.preferredGymTime,
        onboardingComplete: true,
        createdAt: now,
        updatedAt: now,
      };
      await saveProfile(profile);
      await updateSettings({ units: form.units, weekStartDay: form.weekStartDay });
      navigate('/', { replace: true });
    } catch (err) {
      console.error('Failed to save profile', err);
    } finally {
      setSaving(false);
    }
  }

  // Preview targets after step 3 (activity)
  const previewTargets = (() => {
    const w = parseFloat(form.weightKg);
    const h = parseFloat(form.heightCm);
    const a = parseInt(form.age);
    if (!w || !h || !a) return null;
    return calculateTargets({
      sex: form.sex,
      weightKg: w,
      heightCm: h,
      age: a,
      activityLevel: form.activityLevel,
      goal: form.goal,
    });
  })();

  const variants = {
    enter: (dir: number) => ({ x: dir > 0 ? 80 : -80, opacity: 0 }),
    center: { x: 0, opacity: 1 },
    exit: (dir: number) => ({ x: dir > 0 ? -80 : 80, opacity: 0 }),
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Progress bar */}
      <div className="w-full h-1 bg-[#222222]">
        <motion.div
          className="h-1 bg-[#ef4444]"
          animate={{ width: `${((step + 1) / totalSteps) * 100}%` }}
          transition={{ duration: 0.4, ease: 'easeInOut' }}
        />
      </div>

      {/* Step dots */}
      <div className="flex items-center justify-center gap-2 pt-5 pb-2">
        {Array.from({ length: totalSteps }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full transition-all duration-300 ${
              i === step ? 'w-6 h-2 bg-[#ef4444]' : i < step ? 'w-2 h-2 bg-[#ef4444]/50' : 'w-2 h-2 bg-[#333333]'
            }`}
          />
        ))}
      </div>

      {/* Skip button */}
      {step < totalSteps - 1 && (
        <div className="flex justify-end px-6 pt-1">
          <button
            onClick={skip}
            className="flex items-center gap-1 text-[#888888] text-sm py-2 px-3 rounded-lg active:bg-[#1a1a1a]"
          >
            Skip <X size={14} />
          </button>
        </div>
      )}

      {/* Step content */}
      <div className="flex-1 overflow-hidden relative px-6 py-4">
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.28, ease: 'easeInOut' }}
            className="absolute inset-0 px-6 py-4 overflow-y-auto"
          >
            {step === 0 && (
              <StepProfile form={form} errors={errors} set={set} />
            )}
            {step === 1 && (
              <StepGoal form={form} errors={errors} set={set} />
            )}
            {step === 2 && (
              <StepActivity form={form} set={set} previewTargets={previewTargets} />
            )}
            {step === 3 && (
              <StepPreferences form={form} set={set} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="px-6 pb-8 pt-4 flex gap-3">
        {step > 0 && (
          <button
            onClick={goBack}
            className="flex items-center justify-center gap-2 h-14 px-6 rounded-2xl bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] font-semibold text-base flex-shrink-0"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        <button
          onClick={step === totalSteps - 1 ? handleComplete : goNext}
          disabled={saving}
          className="flex-1 flex items-center justify-center gap-2 h-14 rounded-2xl bg-[#ef4444] text-white font-bold text-base disabled:opacity-60 active:bg-[#dc2626]"
        >
          {saving ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : step === totalSteps - 1 ? (
            <>Get Started <Check size={20} /></>
          ) : (
            <>Next <ChevronRight size={20} /></>
          )}
        </button>
      </div>
    </div>
  );
}

// ─── Step 1: Profile ──────────────────────────────────────────────────────────

function StepProfile({
  form,
  errors,
  set,
}: {
  form: FormData;
  errors: ValidationErrors;
  set: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-[#ef4444]/15 flex items-center justify-center">
            <User size={20} className="text-[#ef4444]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#f5f5f5]">Your Profile</h2>
            <p className="text-[#888888] text-sm">Let's personalize your experience</p>
          </div>
        </div>
      </div>

      {/* Name */}
      <div>
        <label className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">Name</label>
        <input
          type="text"
          value={form.name}
          onChange={e => set('name', e.target.value)}
          placeholder="Your name"
          className={`w-full h-14 px-4 rounded-xl bg-[#111111] border text-[#f5f5f5] placeholder-[#444] text-base outline-none focus:border-[#ef4444] transition-colors ${
            errors.name ? 'border-red-400' : 'border-[#2a2a2a]'
          }`}
        />
        {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name}</p>}
      </div>

      {/* Age */}
      <div>
        <label className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">Age</label>
        <input
          type="number"
          inputMode="numeric"
          value={form.age}
          onChange={e => set('age', e.target.value)}
          placeholder="25"
          min={10}
          max={100}
          className={`w-full h-14 px-4 rounded-xl bg-[#111111] border text-[#f5f5f5] placeholder-[#444] text-base outline-none focus:border-[#ef4444] transition-colors ${
            errors.age ? 'border-red-400' : 'border-[#2a2a2a]'
          }`}
        />
        {errors.age && <p className="text-red-400 text-xs mt-1">{errors.age}</p>}
      </div>

      {/* Sex */}
      <div>
        <label className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">Sex</label>
        <div className="grid grid-cols-3 gap-2">
          {(['male', 'female', 'other'] as Sex[]).map(s => (
            <button
              key={s}
              onClick={() => set('sex', s)}
              className={`h-12 rounded-xl font-semibold text-sm capitalize transition-all border ${
                form.sex === s
                  ? 'bg-[#ef4444] text-white border-[#ef4444]'
                  : 'bg-[#111111] text-[#888888] border-[#2a2a2a]'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Height */}
      <div>
        <label className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
          Height (cm)
        </label>
        <input
          type="number"
          inputMode="decimal"
          value={form.heightCm}
          onChange={e => set('heightCm', e.target.value)}
          placeholder="175"
          min={100}
          max={250}
          className={`w-full h-14 px-4 rounded-xl bg-[#111111] border text-[#f5f5f5] placeholder-[#444] text-base outline-none focus:border-[#ef4444] transition-colors ${
            errors.heightCm ? 'border-red-400' : 'border-[#2a2a2a]'
          }`}
        />
        {errors.heightCm && <p className="text-red-400 text-xs mt-1">{errors.heightCm}</p>}
      </div>

      {/* Weight */}
      <div>
        <label className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
          Current Weight (kg)
        </label>
        <input
          type="number"
          inputMode="decimal"
          value={form.weightKg}
          onChange={e => set('weightKg', e.target.value)}
          placeholder="70"
          min={20}
          max={300}
          className={`w-full h-14 px-4 rounded-xl bg-[#111111] border text-[#f5f5f5] placeholder-[#444] text-base outline-none focus:border-[#ef4444] transition-colors ${
            errors.weightKg ? 'border-red-400' : 'border-[#2a2a2a]'
          }`}
        />
        {errors.weightKg && <p className="text-red-400 text-xs mt-1">{errors.weightKg}</p>}
      </div>
    </div>
  );
}

// ─── Step 2: Goal & Target ────────────────────────────────────────────────────

function StepGoal({
  form,
  errors,
  set,
}: {
  form: FormData;
  errors: ValidationErrors;
  set: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-[#ef4444]/15 flex items-center justify-center">
            <Target size={20} className="text-[#ef4444]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#f5f5f5]">Your Goal</h2>
            <p className="text-[#888888] text-sm">What do you want to achieve?</p>
          </div>
        </div>
      </div>

      {/* Goal Cards */}
      <div className="flex flex-col gap-3">
        {GOAL_OPTIONS.map(g => (
          <button
            key={g.value}
            onClick={() => set('goal', g.value)}
            className={`flex items-center gap-4 p-4 rounded-2xl border transition-all text-left ${
              form.goal === g.value
                ? 'border-[#ef4444] bg-[#ef4444]/10'
                : 'border-[#2a2a2a] bg-[#111111]'
            }`}
          >
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${g.color} flex items-center justify-center shrink-0 ${
              form.goal === g.value ? 'text-[#ef4444]' : 'text-[#888888]'
            }`}>
              {g.icon}
            </div>
            <div className="flex-1">
              <div className={`font-bold text-base ${form.goal === g.value ? 'text-[#f5f5f5]' : 'text-[#cccccc]'}`}>
                {g.label}
              </div>
              <div className="text-[#888888] text-sm">{g.desc}</div>
            </div>
            {form.goal === g.value && (
              <div className="w-6 h-6 rounded-full bg-[#ef4444] flex items-center justify-center shrink-0">
                <Check size={14} className="text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Target Weight */}
      <div>
        <label className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
          Target Weight (kg)
        </label>
        <input
          type="number"
          inputMode="decimal"
          value={form.targetWeightKg}
          onChange={e => set('targetWeightKg', e.target.value)}
          placeholder={form.weightKg || '70'}
          min={20}
          max={300}
          className={`w-full h-14 px-4 rounded-xl bg-[#111111] border text-[#f5f5f5] placeholder-[#444] text-base outline-none focus:border-[#ef4444] transition-colors ${
            errors.targetWeightKg ? 'border-red-400' : 'border-[#2a2a2a]'
          }`}
        />
        {errors.targetWeightKg && <p className="text-red-400 text-xs mt-1">{errors.targetWeightKg}</p>}
      </div>
    </div>
  );
}

// ─── Step 3: Activity Level ───────────────────────────────────────────────────

function StepActivity({
  form,
  set,
  previewTargets,
}: {
  form: FormData;
  set: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
  previewTargets: { calories: number; proteinG: number; carbsG: number; fatG: number } | null;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-[#ef4444]/15 flex items-center justify-center">
            <Zap size={20} className="text-[#ef4444]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#f5f5f5]">Activity Level</h2>
            <p className="text-[#888888] text-sm">How active are you day-to-day?</p>
          </div>
        </div>
      </div>

      {/* Activity Cards */}
      <div className="flex flex-col gap-2">
        {ACTIVITY_OPTIONS.map(a => (
          <button
            key={a.value}
            onClick={() => set('activityLevel', a.value)}
            className={`flex items-center gap-3 px-4 py-3 rounded-2xl border transition-all text-left ${
              form.activityLevel === a.value
                ? 'border-[#ef4444] bg-[#ef4444]/10'
                : 'border-[#2a2a2a] bg-[#111111]'
            }`}
          >
            <span className="text-2xl w-8 text-center shrink-0">{a.emoji}</span>
            <div className="flex-1">
              <div className={`font-bold text-sm ${form.activityLevel === a.value ? 'text-[#f5f5f5]' : 'text-[#cccccc]'}`}>
                {a.label}
              </div>
              <div className="text-[#888888] text-xs">{a.desc}</div>
            </div>
            {form.activityLevel === a.value && (
              <div className="w-5 h-5 rounded-full bg-[#ef4444] flex items-center justify-center shrink-0">
                <Check size={12} className="text-white" />
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Calorie/Protein Preview */}
      {previewTargets && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl bg-[#111111] border border-[#2a2a2a] p-4"
        >
          <p className="text-[#888888] text-xs font-semibold uppercase tracking-wider mb-3">
            Estimated Daily Targets
          </p>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: 'Calories', value: previewTargets.calories, unit: 'kcal', color: 'text-[#ef4444]' },
              { label: 'Protein', value: previewTargets.proteinG, unit: 'g', color: 'text-blue-400' },
              { label: 'Carbs', value: previewTargets.carbsG, unit: 'g', color: 'text-yellow-400' },
              { label: 'Fat', value: previewTargets.fatG, unit: 'g', color: 'text-orange-400' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
                <div className="text-[#888888] text-xs">{item.unit}</div>
                <div className="text-[#555555] text-[10px]">{item.label}</div>
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

// ─── Step 4: Preferences ──────────────────────────────────────────────────────

function StepPreferences({
  form,
  set,
}: {
  form: FormData;
  set: <K extends keyof FormData>(key: K, value: FormData[K]) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-[#ef4444]/15 flex items-center justify-center">
            <Settings size={20} className="text-[#ef4444]" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-[#f5f5f5]">Preferences</h2>
            <p className="text-[#888888] text-sm">Customize your experience</p>
          </div>
        </div>
      </div>

      {/* Units */}
      <div>
        <label className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">Units</label>
        <div className="grid grid-cols-2 gap-2">
          {(['metric', 'imperial'] as Units[]).map(u => (
            <button
              key={u}
              onClick={() => set('units', u)}
              className={`h-12 rounded-xl font-semibold text-sm capitalize transition-all border ${
                form.units === u
                  ? 'bg-[#ef4444] text-white border-[#ef4444]'
                  : 'bg-[#111111] text-[#888888] border-[#2a2a2a]'
              }`}
            >
              {u === 'metric' ? '🌍 Metric (kg/cm)' : '🇺🇸 Imperial (lbs/ft)'}
            </button>
          ))}
        </div>
      </div>

      {/* Preferred gym time */}
      <div>
        <label className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
          Preferred Gym Time
        </label>
        <input
          type="time"
          value={form.preferredGymTime}
          onChange={e => set('preferredGymTime', e.target.value)}
          className="w-full h-14 px-4 rounded-xl bg-[#111111] border border-[#2a2a2a] text-[#f5f5f5] text-base outline-none focus:border-[#ef4444] transition-colors"
        />
      </div>

      {/* Week start day */}
      <div>
        <label className="block text-[#888888] text-xs font-semibold uppercase tracking-wider mb-2">
          Week Starts On
        </label>
        <div className="grid grid-cols-2 gap-2">
          {([0, 1] as Array<0 | 1>).map(d => (
            <button
              key={d}
              onClick={() => set('weekStartDay', d)}
              className={`h-12 rounded-xl font-semibold text-sm transition-all border ${
                form.weekStartDay === d
                  ? 'bg-[#ef4444] text-white border-[#ef4444]'
                  : 'bg-[#111111] text-[#888888] border-[#2a2a2a]'
              }`}
            >
              {DAY_LABELS[d]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary card */}
      <div className="rounded-2xl bg-[#111111] border border-[#2a2a2a] p-4">
        <p className="text-[#888888] text-xs font-semibold uppercase tracking-wider mb-3">You're all set!</p>
        <p className="text-[#f5f5f5] text-base leading-relaxed">
          Press <span className="text-[#ef4444] font-bold">Get Started</span> to save your profile and begin your fitness journey. You can always update these settings later.
        </p>
      </div>
    </div>
  );
}
