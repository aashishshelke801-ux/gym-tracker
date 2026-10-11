import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Weight,
  Ruler,
  Target,
  Camera,
  ChevronRight,
  Edit2,
  Check,
  X,
  Trash2,
  Plus,
  ZapOff,
  Zap,
  Activity,
  Flame,
  Shield,
  Dumbbell,
  Calendar,
  Clock,
  BarChart2,
  Image,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type {
  UserProfile,
  Sex,
  Goal,
  ActivityLevel,
  Units,
  BodyMeasurement,
  ProgressPhoto,
  NutritionTargets,
} from '../types';
import { calculateTargets, calculateBMI, bmiCategory } from '../utils/fitness';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function uid() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const GOAL_LABELS: Record<Goal, string> = {
  muscleGain: 'Muscle Gain',
  maintenance: 'Maintenance',
  fatLoss: 'Fat Loss',
};

const ACTIVITY_LABELS: Record<ActivityLevel, string> = {
  sedentary: 'Sedentary',
  light: 'Light',
  moderate: 'Moderate',
  active: 'Active',
  veryActive: 'Very Active',
};

const GOAL_ICONS: Record<Goal, React.ReactNode> = {
  muscleGain: <Dumbbell size={16} />,
  maintenance: <Shield size={16} />,
  fatLoss: <Flame size={16} />,
};

const ACTIVITY_ICONS: Record<ActivityLevel, React.ReactNode> = {
  sedentary: <ZapOff size={16} />,
  light: <Activity size={16} />,
  moderate: <Zap size={16} />,
  active: <Zap size={16} />,
  veryActive: <Flame size={16} />,
};

// ─── Inline Edit Field ────────────────────────────────────────────────────────

function EditableField({
  label,
  value,
  displayValue,
  onSave,
  type = 'text',
  min,
  max,
  step,
  options,
}: {
  label: string;
  value: string | number;
  displayValue?: string;
  onSave: (v: string) => void;
  type?: 'text' | 'number' | 'time' | 'select';
  min?: number;
  max?: number;
  step?: number;
  options?: { value: string; label: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(value));

  function commit() {
    onSave(draft);
    setEditing(false);
  }

  function cancel() {
    setDraft(String(value));
    setEditing(false);
  }

  return (
    <div className="flex items-center justify-between py-4 border-b border-[#1a1a1a] last:border-0">
      <span className="text-[#888888] text-sm">{label}</span>
      {editing ? (
        <div className="flex items-center gap-2">
          {type === 'select' && options ? (
            <select
              value={draft}
              onChange={e => setDraft(e.target.value)}
              className="bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] rounded-lg px-3 py-1 text-sm outline-none focus:border-[#ef4444]"
            >
              {options.map(o => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          ) : (
            <input
              type={type}
              value={draft}
              autoFocus
              min={min}
              max={max}
              step={step}
              onChange={e => setDraft(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); }}
              className="w-28 bg-[#1a1a1a] border border-[#ef4444] text-[#f5f5f5] rounded-lg px-3 py-1 text-sm outline-none text-right"
            />
          )}
          <button onClick={commit} className="w-7 h-7 rounded-full bg-[#ef4444] flex items-center justify-center">
            <Check size={14} className="text-white" />
          </button>
          <button onClick={cancel} className="w-7 h-7 rounded-full bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center">
            <X size={14} className="text-[#888888]" />
          </button>
        </div>
      ) : (
        <button
          onClick={() => { setDraft(String(value)); setEditing(true); }}
          className="flex items-center gap-2 text-[#f5f5f5] font-medium text-sm active:opacity-70"
        >
          {displayValue ?? value}
          <Edit2 size={13} className="text-[#555555]" />
        </button>
      )}
    </div>
  );
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mx-4 mb-4 rounded-2xl bg-[#111111] border border-[#2a2a2a] overflow-hidden">
      <div className="flex items-center gap-2 px-4 pt-4 pb-2">
        <span className="text-[#ef4444]">{icon}</span>
        <h3 className="text-[#f5f5f5] font-bold text-base">{title}</h3>
      </div>
      <div className="px-4 pb-2">{children}</div>
    </div>
  );
}

// ─── Measurement Modal ────────────────────────────────────────────────────────

const MEASUREMENT_FIELDS: { key: keyof Omit<BodyMeasurement, 'id' | 'date'>; label: string }[] = [
  { key: 'chestCm', label: 'Chest (cm)' },
  { key: 'waistCm', label: 'Waist (cm)' },
  { key: 'hipsCm', label: 'Hips (cm)' },
  { key: 'shouldersCm', label: 'Shoulders (cm)' },
  { key: 'bicepsCm', label: 'Biceps (cm)' },
  { key: 'thighsCm', label: 'Thighs (cm)' },
  { key: 'calvesCm', label: 'Calves (cm)' },
];

type MeasurementDraft = Partial<Record<keyof Omit<BodyMeasurement, 'id' | 'date'>, string>>;

function MeasurementModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (m: BodyMeasurement) => void;
}) {
  const [draft, setDraft] = useState<MeasurementDraft>({});
  const today = new Date().toISOString().slice(0, 10);

  function handleSave() {
    const m: BodyMeasurement = { id: uid(), date: today };
    for (const f of MEASUREMENT_FIELDS) {
      const v = parseFloat(draft[f.key] ?? '');
      if (!isNaN(v) && v > 0) (m as unknown as Record<string, unknown>)[f.key] = v;
    }
    onSave(m);
    onClose();
  }

  const hasAny = MEASUREMENT_FIELDS.some(f => {
    const v = parseFloat(draft[f.key] ?? '');
    return !isNaN(v) && v > 0;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-[#111111] rounded-t-3xl border-t border-[#2a2a2a] p-6 pb-10 max-h-[85vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[#f5f5f5] font-bold text-lg">Add Measurements</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center">
            <X size={16} className="text-[#888888]" />
          </button>
        </div>
        <p className="text-[#888888] text-sm mb-4">Fill in any measurements you want to track. Leave blank to skip.</p>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {MEASUREMENT_FIELDS.map(f => (
            <div key={f.key}>
              <label className="block text-[#888888] text-xs mb-1">{f.label}</label>
              <input
                type="number"
                inputMode="decimal"
                value={draft[f.key] ?? ''}
                onChange={e => setDraft(prev => ({ ...prev, [f.key]: e.target.value }))}
                placeholder="—"
                className="w-full h-11 px-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] text-sm outline-none focus:border-[#ef4444] placeholder-[#444]"
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleSave}
          disabled={!hasAny}
          className="w-full h-14 rounded-2xl bg-[#ef4444] text-white font-bold text-base disabled:opacity-40"
        >
          Save Measurements
        </button>
      </motion.div>
    </div>
  );
}

// ─── Override Targets Modal ───────────────────────────────────────────────────

function OverrideTargetsModal({
  current,
  onClose,
  onSave,
}: {
  current: NutritionTargets;
  onClose: () => void;
  onSave: (t: NutritionTargets) => void;
}) {
  const [cal, setCal] = useState(String(current.calories));
  const [prot, setProt] = useState(String(current.proteinG));
  const [carbs, setCarbs] = useState(String(current.carbsG));
  const [fat, setFat] = useState(String(current.fatG));

  function handleSave() {
    onSave({
      calories: parseInt(cal) || current.calories,
      proteinG: parseInt(prot) || current.proteinG,
      carbsG: parseInt(carbs) || current.carbsG,
      fatG: parseInt(fat) || current.fatG,
      overridden: true,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 28, stiffness: 300 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-lg bg-[#111111] rounded-t-3xl border-t border-[#2a2a2a] p-6 pb-10"
      >
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-[#f5f5f5] font-bold text-lg">Override Targets</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#1a1a1a] flex items-center justify-center">
            <X size={16} className="text-[#888888]" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: 'Calories (kcal)', value: cal, set: setCal },
            { label: 'Protein (g)', value: prot, set: setProt },
            { label: 'Carbs (g)', value: carbs, set: setCarbs },
            { label: 'Fat (g)', value: fat, set: setFat },
          ].map(f => (
            <div key={f.label}>
              <label className="block text-[#888888] text-xs mb-1">{f.label}</label>
              <input
                type="number"
                inputMode="numeric"
                value={f.value}
                onChange={e => f.set(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-[#f5f5f5] text-sm outline-none focus:border-[#ef4444]"
              />
            </div>
          ))}
        </div>
        <button
          onClick={handleSave}
          className="w-full h-14 rounded-2xl bg-[#ef4444] text-white font-bold text-base"
        >
          Apply Override
        </button>
      </motion.div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Profile() {
  const { state, saveProfile, addMeasurement, deleteMeasurement, addPhoto, deletePhoto, saveNutritionTargets } = useApp();
  const { profile, measurements, progressPhotos, settings, nutritionTargets } = state;

  const [showMeasurementModal, setShowMeasurementModal] = useState(false);
  const [showOverrideModal, setShowOverrideModal] = useState(false);
  const [deletingMeasId, setDeletingMeasId] = useState<string | null>(null);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoLabel, setPhotoLabel] = useState<'front' | 'side' | 'back'>('front');

  if (!profile) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#0a0a0a]">
        <p className="text-[#888888]">No profile found. Complete onboarding first.</p>
      </div>
    );
  }

  // ─── Profile update helpers ───────────────────────────────────────────────

  async function updateProfile(patch: Partial<UserProfile>) {
    if (!profile) return;
    const updated = { ...profile, ...patch, updatedAt: new Date().toISOString() } as UserProfile;
    await saveProfile(updated);
  }

  // ─── BMI ──────────────────────────────────────────────────────────────────

  const bmi = calculateBMI(profile.weightKg, profile.heightCm);
  const bmiCat = bmiCategory(bmi);
  const bmiColor =
    bmi < 18.5 ? 'text-blue-400' : bmi < 25 ? 'text-green-400' : bmi < 30 ? 'text-yellow-400' : 'text-red-400';

  // ─── Targets ──────────────────────────────────────────────────────────────

  const targets = nutritionTargets ?? { ...calculateTargets(profile), overridden: false };

  async function handleResetTargets() {
    if (!profile) return;
    const fresh = { ...calculateTargets(profile), overridden: false };
    await saveNutritionTargets(fresh);
  }

  // ─── Photo upload ─────────────────────────────────────────────────────────

  function handlePhotoFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async ev => {
      const dataUrl = ev.target?.result as string;
      if (!dataUrl) return;
      const photo: ProgressPhoto = {
        id: uid(),
        date: new Date().toISOString().slice(0, 10),
        label: photoLabel,
        dataUrl,
      };
      await addPhoto(photo);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-28">
      {/* Header */}
      <div className="px-4 pt-12 pb-6">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#ef4444]/20 border-2 border-[#ef4444]/40 flex items-center justify-center">
            <User size={28} className="text-[#ef4444]" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-[#f5f5f5]">{profile.name}</h1>
            <p className="text-[#888888] text-sm">
              {profile.age}y · {profile.sex} · {GOAL_LABELS[profile.goal]}
            </p>
          </div>
        </div>

        {/* BMI Banner */}
        <div className="mt-5 flex items-center justify-between rounded-2xl bg-[#111111] border border-[#2a2a2a] px-5 py-4">
          <div>
            <p className="text-[#888888] text-xs uppercase tracking-wider font-semibold">BMI</p>
            <p className={`text-3xl font-bold ${bmiColor}`}>{bmi}</p>
            <p className={`text-sm font-medium ${bmiColor}`}>{bmiCat}</p>
          </div>
          <div className="text-right">
            <p className="text-[#888888] text-xs uppercase tracking-wider font-semibold mb-1">Weight</p>
            <p className="text-[#f5f5f5] text-lg font-bold">{profile.weightKg} kg</p>
            <p className="text-[#888888] text-xs">Target: {profile.targetWeightKg} kg</p>
          </div>
        </div>
      </div>

      {/* ─── Personal Info ─────────────────────────────────────────────── */}
      <SectionCard title="Personal Info" icon={<User size={18} />}>
        <EditableField
          label="Name"
          value={profile.name}
          onSave={v => updateProfile({ name: v })}
          type="text"
        />
        <EditableField
          label="Age"
          value={profile.age}
          onSave={v => updateProfile({ age: Math.max(10, Math.min(100, parseInt(v) || profile.age)) })}
          type="number"
          min={10}
          max={100}
        />
        <EditableField
          label="Sex"
          value={profile.sex}
          displayValue={profile.sex.charAt(0).toUpperCase() + profile.sex.slice(1)}
          onSave={v => updateProfile({ sex: v as Sex })}
          type="select"
          options={[
            { value: 'male', label: 'Male' },
            { value: 'female', label: 'Female' },
            { value: 'other', label: 'Other' },
          ]}
        />
      </SectionCard>

      {/* ─── Body Stats ────────────────────────────────────────────────── */}
      <SectionCard title="Body Stats" icon={<Weight size={18} />}>
        <EditableField
          label="Height (cm)"
          value={profile.heightCm}
          onSave={v => updateProfile({ heightCm: Math.max(100, Math.min(250, parseFloat(v) || profile.heightCm)) })}
          type="number"
          min={100}
          max={250}
          step={0.1}
        />
        <EditableField
          label="Weight (kg)"
          value={profile.weightKg}
          onSave={v => updateProfile({ weightKg: Math.max(20, Math.min(300, parseFloat(v) || profile.weightKg)) })}
          type="number"
          min={20}
          max={300}
          step={0.1}
        />
        <EditableField
          label="Target Weight (kg)"
          value={profile.targetWeightKg}
          onSave={v => updateProfile({ targetWeightKg: Math.max(20, Math.min(300, parseFloat(v) || profile.targetWeightKg)) })}
          type="number"
          min={20}
          max={300}
          step={0.1}
        />
      </SectionCard>

      {/* ─── Goal & Training ───────────────────────────────────────────── */}
      <SectionCard title="Goal & Training" icon={<Target size={18} />}>
        <EditableField
          label="Goal"
          value={profile.goal}
          displayValue={GOAL_LABELS[profile.goal]}
          onSave={v => updateProfile({ goal: v as Goal })}
          type="select"
          options={[
            { value: 'muscleGain', label: 'Muscle Gain' },
            { value: 'maintenance', label: 'Maintenance' },
            { value: 'fatLoss', label: 'Fat Loss' },
          ]}
        />
        <EditableField
          label="Activity Level"
          value={profile.activityLevel}
          displayValue={ACTIVITY_LABELS[profile.activityLevel]}
          onSave={v => updateProfile({ activityLevel: v as ActivityLevel })}
          type="select"
          options={[
            { value: 'sedentary', label: 'Sedentary' },
            { value: 'light', label: 'Light' },
            { value: 'moderate', label: 'Moderate' },
            { value: 'active', label: 'Active' },
            { value: 'veryActive', label: 'Very Active' },
          ]}
        />
        <EditableField
          label="Preferred Gym Time"
          value={profile.preferredGymTime}
          onSave={v => updateProfile({ preferredGymTime: v })}
          type="time"
        />
        <EditableField
          label="Units"
          value={profile.units}
          displayValue={profile.units.charAt(0).toUpperCase() + profile.units.slice(1)}
          onSave={v => updateProfile({ units: v as Units })}
          type="select"
          options={[
            { value: 'metric', label: 'Metric (kg/cm)' },
            { value: 'imperial', label: 'Imperial (lbs/ft)' },
          ]}
        />
      </SectionCard>

      {/* ─── Calorie / Protein Targets ─────────────────────────────────── */}
      <SectionCard title="Daily Targets" icon={<BarChart2 size={18} />}>
        {targets.overridden && (
          <div className="flex items-center gap-2 mb-3 px-3 py-2 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <span className="text-yellow-400 text-xs font-medium">Targets are manually overridden</span>
            <button
              onClick={handleResetTargets}
              className="ml-auto text-[#888888] text-xs underline"
            >
              Reset
            </button>
          </div>
        )}
        <div className="grid grid-cols-4 gap-3 py-3">
          {[
            { label: 'Calories', value: targets.calories, unit: 'kcal', color: 'text-[#ef4444]' },
            { label: 'Protein', value: targets.proteinG, unit: 'g', color: 'text-blue-400' },
            { label: 'Carbs', value: targets.carbsG, unit: 'g', color: 'text-yellow-400' },
            { label: 'Fat', value: targets.fatG, unit: 'g', color: 'text-orange-400' },
          ].map(item => (
            <div key={item.label} className="text-center">
              <div className={`text-xl font-bold ${item.color}`}>{item.value}</div>
              <div className="text-[#888888] text-[10px]">{item.unit}</div>
              <div className="text-[#555555] text-[10px]">{item.label}</div>
            </div>
          ))}
        </div>
        <button
          onClick={() => setShowOverrideModal(true)}
          className="w-full h-10 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-[#888888] text-sm font-medium flex items-center justify-center gap-2 mt-1 mb-2"
        >
          <Edit2 size={14} /> Override Targets
        </button>
      </SectionCard>

      {/* ─── Body Measurements ─────────────────────────────────────────── */}
      <div className="mx-4 mb-4 rounded-2xl bg-[#111111] border border-[#2a2a2a] overflow-hidden">
        <div className="flex items-center justify-between px-4 pt-4 pb-2">
          <div className="flex items-center gap-2">
            <Ruler size={18} className="text-[#ef4444]" />
            <h3 className="text-[#f5f5f5] font-bold text-base">Body Measurements</h3>
          </div>
          <button
            onClick={() => setShowMeasurementModal(true)}
            className="flex items-center gap-1 h-8 px-3 rounded-xl bg-[#ef4444]/15 text-[#ef4444] text-sm font-medium"
          >
            <Plus size={14} /> Add
          </button>
        </div>
        <div className="px-4 pb-4">
          {measurements.length === 0 ? (
            <div className="text-center py-8">
              <Ruler size={32} className="text-[#333333] mx-auto mb-2" />
              <p className="text-[#555555] text-sm">No measurements yet</p>
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {[...measurements]
                .sort((a, b) => b.date.localeCompare(a.date))
                .map(m => (
                  <AnimatePresence key={m.id}>
                    {deletingMeasId !== m.id && (
                      <motion.div
                        layout
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, x: -40 }}
                        className="rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] p-3"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Calendar size={13} className="text-[#888888]" />
                            <span className="text-[#888888] text-xs">{fmtDate(m.date)}</span>
                          </div>
                          <button
                            onClick={async () => {
                              setDeletingMeasId(m.id);
                              await deleteMeasurement(m.id);
                              setDeletingMeasId(null);
                            }}
                            className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center"
                          >
                            <Trash2 size={13} className="text-red-400" />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {MEASUREMENT_FIELDS.map(f => {
                            const val = (m as unknown as Record<string, unknown>)[f.key] as number | undefined;
                            if (!val) return null;
                            return (
                              <div key={f.key} className="text-center">
                                <div className="text-[#f5f5f5] text-sm font-semibold">{val}</div>
                                <div className="text-[#555555] text-[10px]">
                                  {f.label.replace(' (cm)', '')}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                ))}
            </div>
          )}
        </div>
      </div>

      {/* ─── Progress Photos ───────────────────────────────────────────── */}
      {settings.progressPhotosEnabled && (
        <div className="mx-4 mb-4 rounded-2xl bg-[#111111] border border-[#2a2a2a] overflow-hidden">
          <div className="flex items-center justify-between px-4 pt-4 pb-2">
            <div className="flex items-center gap-2">
              <Camera size={18} className="text-[#ef4444]" />
              <h3 className="text-[#f5f5f5] font-bold text-base">Progress Photos</h3>
            </div>
            <div className="flex items-center gap-2">
              <select
                value={photoLabel}
                onChange={e => setPhotoLabel(e.target.value as 'front' | 'side' | 'back')}
                className="h-8 px-2 rounded-lg bg-[#1a1a1a] border border-[#2a2a2a] text-[#888888] text-xs outline-none"
              >
                <option value="front">Front</option>
                <option value="side">Side</option>
                <option value="back">Back</option>
              </select>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-1 h-8 px-3 rounded-xl bg-[#ef4444]/15 text-[#ef4444] text-sm font-medium"
              >
                <Plus size={14} /> Add
              </button>
            </div>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoFileChange}
          />
          <div className="px-4 pb-4">
            {progressPhotos.length === 0 ? (
              <div className="text-center py-8">
                <Image size={32} className="text-[#333333] mx-auto mb-2" />
                <p className="text-[#555555] text-sm">No progress photos yet</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-2">
                {[...progressPhotos]
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map(photo => (
                    <motion.div
                      key={photo.id}
                      layout
                      className="relative aspect-square rounded-xl overflow-hidden bg-[#1a1a1a] border border-[#2a2a2a]"
                    >
                      <img
                        src={photo.dataUrl}
                        alt={photo.label}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-0 left-0 right-0 bg-black/60 py-1 px-2 flex items-center justify-between">
                        <div>
                          <span className="text-white text-[10px] font-semibold capitalize">{photo.label}</span>
                          <div className="text-white/60 text-[9px]">{fmtDate(photo.date)}</div>
                        </div>
                        <button
                          onClick={async () => {
                            setDeletingPhotoId(photo.id);
                            await deletePhoto(photo.id);
                            setDeletingPhotoId(null);
                          }}
                          disabled={deletingPhotoId === photo.id}
                          className="w-6 h-6 rounded-full bg-red-500/80 flex items-center justify-center"
                        >
                          <Trash2 size={11} className="text-white" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Measurement Modal */}
      <AnimatePresence>
        {showMeasurementModal && (
          <MeasurementModal
            onClose={() => setShowMeasurementModal(false)}
            onSave={async m => { await addMeasurement(m); }}
          />
        )}
      </AnimatePresence>

      {/* Override Targets Modal */}
      <AnimatePresence>
        {showOverrideModal && (
          <OverrideTargetsModal
            current={targets}
            onClose={() => setShowOverrideModal(false)}
            onSave={async t => { await saveNutritionTargets(t); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
