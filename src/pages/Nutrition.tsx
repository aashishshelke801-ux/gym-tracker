import React, { useState, useMemo, useCallback } from 'react';
import {
  ChevronLeft, ChevronRight, Plus, Trash2, Search, Droplets,
  X, Star, Clock, ChevronDown, ChevronUp, Copy, Flame,
  Info, Check
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import type { FoodItem, FoodLog, MealType, WaterLog, NutritionTargets } from '../types';
import { calculateBMR, calculateTDEE, calculateTargets } from '../utils/fitness';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatDateLabel(dateStr: string): string {
  const today = toDateStr(new Date());
  const yesterday = toDateStr(new Date(Date.now() - 86400000));
  if (dateStr === today) return 'Today';
  if (dateStr === yesterday) return 'Yesterday';
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function uid(): string {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

const MEAL_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snacks',
};

const MEAL_EMOJIS: Record<MealType, string> = {
  breakfast: '🌅',
  lunch: '☀️',
  dinner: '🌙',
  snack: '🍎',
};

const MEAL_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

// ─── MacroBar ─────────────────────────────────────────────────────────────────

function MacroBar({
  label, color, value, target,
}: { label: string; color: string; value: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  return (
    <div className="flex-1">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs text-[#888888]">{label}</span>
        <span className="text-xs font-semibold text-[#f5f5f5]">
          {Math.round(value)}<span className="text-[#888888] font-normal">/{target}g</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[#2a2a2a] overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

// ─── Donut ────────────────────────────────────────────────────────────────────

function DonutRing({ logged, target }: { logged: number; target: number }) {
  const R = 52;
  const circumference = 2 * Math.PI * R;
  const pct = target > 0 ? Math.min(1, logged / target) : 0;
  const dash = pct * circumference;
  return (
    <svg width="128" height="128" viewBox="0 0 128 128" className="rotate-[-90deg]">
      <circle cx="64" cy="64" r={R} fill="none" stroke="#2a2a2a" strokeWidth="12" />
      <circle
        cx="64" cy="64" r={R} fill="none"
        stroke="#ef4444" strokeWidth="12"
        strokeDasharray={`${dash} ${circumference}`}
        strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 0.6s ease' }}
      />
    </svg>
  );
}

// ─── Add Food Modal ───────────────────────────────────────────────────────────

interface AddFoodModalProps {
  meal: MealType;
  date: string;
  foodItems: FoodItem[];
  foodLogs: FoodLog[];
  onClose: () => void;
  onAdd: (log: FoodLog) => void;
  onSaveCustom: (item: FoodItem) => void;
}

type ModalView = 'list' | 'serving' | 'custom';

function AddFoodModal({ meal, date, foodItems, foodLogs, onClose, onAdd, onSaveCustom }: AddFoodModalProps) {
  const [view, setView] = useState<ModalView>('list');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<FoodItem | null>(null);
  const [servings, setServings] = useState('1');

  // Custom food form
  const [customName, setCustomName] = useState('');
  const [customCal, setCustomCal] = useState('');
  const [customProtein, setCustomProtein] = useState('');
  const [customCarbs, setCustomCarbs] = useState('');
  const [customFat, setCustomFat] = useState('');

  const favorites = useMemo(() => foodItems.filter(f => f.isFavorite), [foodItems]);

  const recentIds = useMemo(() => {
    const ids = new Set<string>();
    [...foodLogs]
      .sort((a, b) => b.loggedAt.localeCompare(a.loggedAt))
      .forEach(l => { if (l.foodItemId) ids.add(l.foodItemId); });
    return [...ids].slice(0, 6);
  }, [foodLogs]);

  const recents = useMemo(
    () => recentIds.map(id => foodItems.find(f => f.id === id)).filter(Boolean) as FoodItem[],
    [recentIds, foodItems]
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim();
    if (!q) return foodItems;
    return foodItems.filter(f => f.name.toLowerCase().includes(q));
  }, [foodItems, query]);

  const svNum = parseFloat(servings) || 1;

  function selectFood(item: FoodItem) {
    setSelected(item);
    setServings('1');
    setView('serving');
  }

  function confirmAdd() {
    if (!selected) return;
    const log: FoodLog = {
      id: uid(),
      date,
      meal,
      foodItemId: selected.id,
      foodName: selected.name,
      calories: Math.round(selected.calories * svNum),
      proteinG: Math.round(selected.proteinG * svNum * 10) / 10,
      carbsG: Math.round(selected.carbsG * svNum * 10) / 10,
      fatG: Math.round(selected.fatG * svNum * 10) / 10,
      servings: svNum,
      loggedAt: new Date().toISOString(),
    };
    onAdd(log);
    onClose();
  }

  function saveCustomFood() {
    const cal = parseFloat(customCal);
    const pro = parseFloat(customProtein);
    const carb = parseFloat(customCarbs);
    const fat = parseFloat(customFat);
    if (!customName.trim() || isNaN(cal)) return;
    const item: FoodItem = {
      id: uid(),
      name: customName.trim(),
      calories: cal,
      proteinG: isNaN(pro) ? 0 : pro,
      carbsG: isNaN(carb) ? 0 : carb,
      fatG: isNaN(fat) ? 0 : fat,
      servingSize: '1 serving',
      isFavorite: false,
      isCustom: true,
    };
    onSaveCustom(item);
    selectFood(item);
  }

  function FoodRow({ item }: { item: FoodItem }) {
    return (
      <button
        onClick={() => selectFood(item)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#1a1a1a] active:bg-[#222222] transition-colors text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-[#f5f5f5] truncate">{item.name}</span>
            {item.isCustom && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#2a2a2a] text-[#888888] shrink-0">Custom</span>
            )}
            {item.isFavorite && <Star size={12} className="text-yellow-400 shrink-0 fill-yellow-400" />}
          </div>
          <div className="text-xs text-[#888888] mt-0.5">
            {item.calories} kcal · P {item.proteinG}g · C {item.carbsG}g · F {item.fatG}g
            {item.servingSize ? ` · ${item.servingSize}` : ''}
          </div>
        </div>
        <ChevronRight size={16} className="text-[#444444] shrink-0" />
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#0a0a0a]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pb-3 border-b border-[#2a2a2a] bg-[#111111]">
        <button
          onClick={view === 'list' ? onClose : () => setView('list')}
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-[#1a1a1a]"
        >
          {view === 'list' ? <X size={20} className="text-[#f5f5f5]" /> : <ChevronLeft size={20} className="text-[#f5f5f5]" />}
        </button>
        <div>
          <h2 className="text-base font-semibold text-[#f5f5f5]">
            {view === 'list' ? `Add Food — ${MEAL_LABELS[meal]}` : view === 'serving' ? selected?.name ?? '' : 'Create Custom Food'}
          </h2>
          {view === 'list' && <p className="text-xs text-[#888888]">{date}</p>}
        </div>
      </div>

      {/* LIST VIEW */}
      {view === 'list' && (
        <div className="flex-1 overflow-y-auto">
          {/* Search */}
          <div className="px-4 py-3 border-b border-[#2a2a2a]">
            <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-xl px-3 h-11">
              <Search size={16} className="text-[#888888] shrink-0" />
              <input
                autoFocus
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Search foods…"
                className="flex-1 bg-transparent text-sm text-[#f5f5f5] placeholder-[#555555] outline-none"
              />
              {query && (
                <button onClick={() => setQuery('')}>
                  <X size={14} className="text-[#888888]" />
                </button>
              )}
            </div>
          </div>

          {!query && (
            <>
              {/* Favorites */}
              {favorites.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <Star size={14} className="text-yellow-400 fill-yellow-400" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Favorites</span>
                  </div>
                  {favorites.map(f => <FoodRow key={f.id} item={f} />)}
                </section>
              )}

              {/* Recents */}
              {recents.length > 0 && (
                <section>
                  <div className="flex items-center gap-2 px-4 py-2.5">
                    <Clock size={14} className="text-[#888888]" />
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#888888]">Recently Used</span>
                  </div>
                  {recents.map(f => <FoodRow key={f.id} item={f} />)}
                </section>
              )}

              {/* All Foods */}
              <section>
                <div className="px-4 py-2.5">
                  <span className="text-xs font-semibold uppercase tracking-wider text-[#888888]">All Foods</span>
                </div>
                {foodItems.map(f => <FoodRow key={f.id} item={f} />)}
              </section>
            </>
          )}

          {query && (
            <section>
              {filtered.length === 0 ? (
                <div className="px-4 py-10 text-center text-[#888888] text-sm">No foods match "{query}"</div>
              ) : (
                filtered.map(f => <FoodRow key={f.id} item={f} />)
              )}
            </section>
          )}

          {/* Divider */}
          <div className="h-px bg-[#2a2a2a] mx-4 my-2" />

          {/* Create custom */}
          <button
            onClick={() => setView('custom')}
            className="w-full flex items-center gap-3 px-4 py-4 hover:bg-[#1a1a1a] transition-colors"
          >
            <div className="w-9 h-9 rounded-full bg-[#ef4444]/20 flex items-center justify-center">
              <Plus size={18} className="text-[#ef4444]" />
            </div>
            <span className="text-sm font-medium text-[#ef4444]">Create Custom Food</span>
          </button>
        </div>
      )}

      {/* SERVING VIEW */}
      {view === 'serving' && selected && (
        <div className="flex-1 flex flex-col overflow-y-auto">
          <div className="flex-1 px-4 pt-6">
            {/* Food info */}
            <div className="bg-[#111111] rounded-2xl p-5 mb-6 border border-[#2a2a2a]">
              <p className="text-xs text-[#888888] mb-1">{selected.servingSize ?? '1 serving'}</p>
              <div className="grid grid-cols-4 gap-3 mt-3">
                {[
                  { label: 'Calories', val: Math.round(selected.calories * svNum), unit: 'kcal', color: '#ef4444' },
                  { label: 'Protein', val: Math.round(selected.proteinG * svNum * 10) / 10, unit: 'g', color: '#3b82f6' },
                  { label: 'Carbs', val: Math.round(selected.carbsG * svNum * 10) / 10, unit: 'g', color: '#f59e0b' },
                  { label: 'Fat', val: Math.round(selected.fatG * svNum * 10) / 10, unit: 'g', color: '#10b981' },
                ].map(m => (
                  <div key={m.label} className="text-center">
                    <div className="text-lg font-bold" style={{ color: m.color }}>{m.val}</div>
                    <div className="text-[10px] text-[#888888]">{m.unit}</div>
                    <div className="text-[10px] text-[#555555]">{m.label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Servings input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-[#888888] mb-2">Servings</label>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setServings(s => String(Math.max(0.25, (parseFloat(s) || 1) - 0.25)))}
                  className="w-12 h-12 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-xl text-[#f5f5f5] active:bg-[#222222]"
                >−</button>
                <input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={servings}
                  onChange={e => setServings(e.target.value)}
                  className="flex-1 h-12 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-center text-lg font-semibold text-[#f5f5f5] outline-none focus:border-[#ef4444]"
                />
                <button
                  onClick={() => setServings(s => String((parseFloat(s) || 1) + 0.25))}
                  className="w-12 h-12 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center text-xl text-[#f5f5f5] active:bg-[#222222]"
                >+</button>
              </div>
              <div className="flex gap-2 mt-2">
                {[0.5, 1, 1.5, 2].map(v => (
                  <button
                    key={v}
                    onClick={() => setServings(String(v))}
                    className={`flex-1 h-8 rounded-lg text-xs font-medium transition-colors ${parseFloat(servings) === v
                      ? 'bg-[#ef4444] text-white'
                      : 'bg-[#1a1a1a] text-[#888888] border border-[#2a2a2a]'}`}
                  >{v}x</button>
                ))}
              </div>
            </div>
          </div>

          <div className="px-4 pb-8">
            <button
              onClick={confirmAdd}
              className="w-full h-14 rounded-2xl bg-[#ef4444] text-white font-semibold text-base flex items-center justify-center gap-2 active:opacity-80"
            >
              <Check size={20} />
              Add to {MEAL_LABELS[meal]}
            </button>
          </div>
        </div>
      )}

      {/* CUSTOM FOOD VIEW */}
      {view === 'custom' && (
        <div className="flex-1 overflow-y-auto px-4 pt-6">
          <p className="text-xs text-[#888888] mb-4">Values per 1 serving</p>
          <div className="space-y-4">
            {[
              { label: 'Food Name', val: customName, set: setCustomName, placeholder: 'e.g. Grilled Chicken Breast', type: 'text' },
              { label: 'Calories (kcal)', val: customCal, set: setCustomCal, placeholder: '0', type: 'number' },
              { label: 'Protein (g)', val: customProtein, set: setCustomProtein, placeholder: '0', type: 'number' },
              { label: 'Carbs (g)', val: customCarbs, set: setCustomCarbs, placeholder: '0', type: 'number' },
              { label: 'Fat (g)', val: customFat, set: setCustomFat, placeholder: '0', type: 'number' },
            ].map(f => (
              <div key={f.label}>
                <label className="block text-sm font-medium text-[#888888] mb-1.5">{f.label}</label>
                <input
                  type={f.type}
                  value={f.val}
                  onChange={e => f.set(e.target.value)}
                  placeholder={f.placeholder}
                  className="w-full h-12 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] px-4 text-sm text-[#f5f5f5] outline-none focus:border-[#ef4444] placeholder-[#444444]"
                />
              </div>
            ))}
          </div>
          <button
            onClick={saveCustomFood}
            disabled={!customName.trim() || !customCal}
            className="w-full h-14 rounded-2xl bg-[#ef4444] text-white font-semibold text-base mt-8 mb-10 disabled:opacity-40 active:opacity-80"
          >
            Save & Add to {MEAL_LABELS[meal]}
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Meal Section ─────────────────────────────────────────────────────────────

interface MealSectionProps {
  meal: MealType;
  logs: FoodLog[];
  onAddFood: (meal: MealType) => void;
  onDelete: (id: string) => void;
}

function MealSection({ meal, logs, onAddFood, onDelete }: MealSectionProps) {
  const total = logs.reduce((s, l) => s + l.calories, 0);

  return (
    <div className="bg-[#111111] rounded-2xl border border-[#2a2a2a] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#2a2a2a]">
        <div className="flex items-center gap-2">
          <span className="text-lg">{MEAL_EMOJIS[meal]}</span>
          <div>
            <div className="text-sm font-semibold text-[#f5f5f5]">{MEAL_LABELS[meal]}</div>
            {total > 0 && <div className="text-xs text-[#888888]">{total} kcal</div>}
          </div>
        </div>
        <button
          onClick={() => onAddFood(meal)}
          className="flex items-center gap-1.5 bg-[#ef4444]/10 text-[#ef4444] px-3 py-1.5 rounded-lg text-xs font-semibold active:bg-[#ef4444]/20"
        >
          <Plus size={13} />
          Add Food
        </button>
      </div>

      {/* Logs */}
      {logs.length === 0 ? (
        <div className="px-4 py-5 text-center text-xs text-[#555555]">
          Nothing logged for {MEAL_LABELS[meal].toLowerCase()} yet
        </div>
      ) : (
        <div className="divide-y divide-[#1a1a1a]">
          {logs.map(log => (
            <div key={log.id} className="flex items-center gap-3 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-[#f5f5f5] truncate">{log.foodName}</div>
                <div className="text-xs text-[#888888] mt-0.5">
                  {log.servings}x · {log.calories} kcal · P {log.proteinG}g · C {log.carbsG}g · F {log.fatG}g
                </div>
              </div>
              <button
                onClick={() => onDelete(log.id)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#2a2a2a] text-[#555555] hover:text-[#ef4444] transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Water Section ────────────────────────────────────────────────────────────

interface WaterSectionProps {
  date: string;
  waterLogs: { date: string; amountMl: number }[];
  onUpdate: (w: WaterLog) => void;
}

function WaterSection({ date, waterLogs, onUpdate }: WaterSectionProps) {
  const [customMl, setCustomMl] = useState('');
  const TARGET = 2500;
  const current = waterLogs.find(w => w.date === date)?.amountMl ?? 0;

  function add(ml: number) {
    onUpdate({ date, amountMl: Math.max(0, current + ml) });
  }

  function addCustom() {
    const v = parseFloat(customMl);
    if (!isNaN(v) && v > 0) {
      add(v);
      setCustomMl('');
    }
  }

  const pct = Math.min(100, (current / TARGET) * 100);

  return (
    <div className="bg-[#111111] rounded-2xl border border-[#2a2a2a] p-4">
      <div className="flex items-center gap-2 mb-4">
        <Droplets size={18} className="text-blue-400" />
        <h3 className="text-sm font-semibold text-[#f5f5f5]">Water Intake</h3>
        <span className="ml-auto text-sm font-semibold text-[#f5f5f5]">
          {current}<span className="text-[#888888] font-normal"> / {TARGET} ml</span>
        </span>
      </div>

      {/* Progress bar */}
      <div className="h-2.5 bg-[#2a2a2a] rounded-full overflow-hidden mb-4">
        <div
          className="h-full bg-blue-400 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>

      {/* Quick add */}
      <div className="flex gap-2 mb-3">
        {[150, 250, 500].map(ml => (
          <button
            key={ml}
            onClick={() => add(ml)}
            className="flex-1 h-10 rounded-xl bg-blue-500/10 text-blue-400 text-sm font-medium border border-blue-500/20 active:bg-blue-500/20"
          >
            +{ml}ml
          </button>
        ))}
      </div>

      {/* Custom amount */}
      <div className="flex gap-2">
        <input
          type="number"
          value={customMl}
          onChange={e => setCustomMl(e.target.value)}
          placeholder="Custom ml"
          className="flex-1 h-10 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] px-3 text-sm text-[#f5f5f5] outline-none focus:border-blue-400 placeholder-[#444444]"
          onKeyDown={e => e.key === 'Enter' && addCustom()}
        />
        <button
          onClick={addCustom}
          className="h-10 px-4 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20 text-sm font-medium active:bg-blue-500/20"
        >
          Add
        </button>
        {current > 0 && (
          <button
            onClick={() => onUpdate({ date, amountMl: 0 })}
            className="h-10 px-3 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-[#888888] text-xs active:bg-[#222222]"
          >
            Reset
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Nutrition Targets Card ───────────────────────────────────────────────────

interface TargetsCardProps {
  targets: NutritionTargets | null;
  profile: { sex: 'male' | 'female' | 'other'; weightKg: number; heightCm: number; age: number; activityLevel: import('../types').ActivityLevel; goal: import('../types').Goal } | null;
  onSave: (t: NutritionTargets) => void;
}

function TargetsCard({ targets, profile, onSave }: TargetsCardProps) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [cal, setCal] = useState('');
  const [pro, setPro] = useState('');
  const [carb, setCarb] = useState('');
  const [fat, setFat] = useState('');

  const bmr = profile ? Math.round(calculateBMR(profile)) : null;
  const tdee = profile ? Math.round(calculateTDEE(profile)) : null;

  function startEdit() {
    setCal(String(targets?.calories ?? ''));
    setPro(String(targets?.proteinG ?? ''));
    setCarb(String(targets?.carbsG ?? ''));
    setFat(String(targets?.fatG ?? ''));
    setEditing(true);
  }

  function saveEdit() {
    if (!targets) return;
    onSave({
      calories: parseInt(cal) || targets.calories,
      proteinG: parseInt(pro) || targets.proteinG,
      carbsG: parseInt(carb) || targets.carbsG,
      fatG: parseInt(fat) || targets.fatG,
      overridden: true,
    });
    setEditing(false);
  }

  function resetToCalc() {
    if (!profile || !targets) return;
    const t = calculateTargets(profile);
    onSave({ ...t, overridden: false });
    setEditing(false);
  }

  return (
    <div className="bg-[#111111] rounded-2xl border border-[#2a2a2a] overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-4"
      >
        <div className="flex items-center gap-2">
          <Flame size={18} className="text-[#ef4444]" />
          <span className="text-sm font-semibold text-[#f5f5f5]">Nutrition Targets</span>
          {targets?.overridden && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#ef4444]/20 text-[#ef4444]">Custom</span>
          )}
        </div>
        {open ? <ChevronUp size={18} className="text-[#888888]" /> : <ChevronDown size={18} className="text-[#888888]" />}
      </button>

      {open && (
        <div className="px-4 pb-4 border-t border-[#2a2a2a] pt-4">
          {profile && bmr && tdee ? (
            <>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-[#1a1a1a] rounded-xl p-3">
                  <div className="text-xs text-[#888888] mb-0.5">BMR</div>
                  <div className="text-base font-bold text-[#f5f5f5]">{bmr} <span className="text-xs font-normal text-[#888888]">kcal</span></div>
                  <div className="text-[10px] text-[#555555] mt-0.5">Mifflin-St Jeor</div>
                </div>
                <div className="bg-[#1a1a1a] rounded-xl p-3">
                  <div className="text-xs text-[#888888] mb-0.5">TDEE</div>
                  <div className="text-base font-bold text-[#f5f5f5]">{tdee} <span className="text-xs font-normal text-[#888888]">kcal</span></div>
                  <div className="text-[10px] text-[#555555] mt-0.5">Activity × BMR</div>
                </div>
              </div>

              {targets && !editing && (
                <div className="space-y-2 mb-4">
                  {[
                    { label: 'Calories', val: targets.calories, unit: 'kcal' },
                    { label: 'Protein', val: targets.proteinG, unit: 'g' },
                    { label: 'Carbs', val: targets.carbsG, unit: 'g' },
                    { label: 'Fat', val: targets.fatG, unit: 'g' },
                  ].map(r => (
                    <div key={r.label} className="flex items-center justify-between py-1">
                      <span className="text-sm text-[#888888]">{r.label}</span>
                      <span className="text-sm font-semibold text-[#f5f5f5]">{r.val} {r.unit}</span>
                    </div>
                  ))}
                </div>
              )}

              {editing && (
                <div className="space-y-3 mb-4">
                  {[
                    { label: 'Calories (kcal)', val: cal, set: setCal },
                    { label: 'Protein (g)', val: pro, set: setPro },
                    { label: 'Carbs (g)', val: carb, set: setCarb },
                    { label: 'Fat (g)', val: fat, set: setFat },
                  ].map(f => (
                    <div key={f.label} className="flex items-center gap-3">
                      <label className="text-sm text-[#888888] w-28 shrink-0">{f.label}</label>
                      <input
                        type="number"
                        value={f.val}
                        onChange={e => f.set(e.target.value)}
                        className="flex-1 h-10 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] px-3 text-sm text-[#f5f5f5] outline-none focus:border-[#ef4444]"
                      />
                    </div>
                  ))}
                </div>
              )}

              {!editing ? (
                <button
                  onClick={startEdit}
                  className="w-full h-10 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-[#f5f5f5] font-medium active:bg-[#222222]"
                >
                  Override Targets
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={saveEdit}
                    className="flex-1 h-10 rounded-xl bg-[#ef4444] text-white text-sm font-semibold active:opacity-80"
                  >
                    Save
                  </button>
                  <button
                    onClick={resetToCalc}
                    className="flex-1 h-10 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-sm text-[#888888] active:bg-[#222222]"
                  >
                    Reset to Calc
                  </button>
                  <button
                    onClick={() => setEditing(false)}
                    className="w-10 h-10 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] flex items-center justify-center active:bg-[#222222]"
                  >
                    <X size={16} className="text-[#888888]" />
                  </button>
                </div>
              )}
            </>
          ) : (
            <p className="text-sm text-[#888888] text-center py-2">Complete your profile to see calculated targets.</p>
          )}

          <div className="flex items-start gap-2 mt-4 p-3 bg-[#1a1a1a] rounded-xl">
            <Info size={14} className="text-[#555555] shrink-0 mt-0.5" />
            <p className="text-[11px] text-[#555555] leading-relaxed">
              These are estimates based on the Mifflin-St Jeor equation. Adjust based on your actual weight trend over 2–4 weeks.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function Nutrition() {
  const { state, addFoodLog, deleteFoodLog, updateWaterLog, saveFoodItem, saveNutritionTargets } = useApp();

  const todayStr = toDateStr(new Date());
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [addFoodMeal, setAddFoodMeal] = useState<MealType | null>(null);
  const [copyDone, setCopyDone] = useState(false);

  // Filter logs for selected date
  const dayLogs = useMemo(
    () => state.foodLogs.filter(l => l.date === selectedDate),
    [state.foodLogs, selectedDate]
  );

  // Macro totals
  const totals = useMemo(() => dayLogs.reduce(
    (acc, l) => ({
      calories: acc.calories + l.calories,
      proteinG: acc.proteinG + l.proteinG,
      carbsG: acc.carbsG + l.carbsG,
      fatG: acc.fatG + l.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 }
  ), [dayLogs]);

  const targets = state.nutritionTargets ?? { calories: 2000, proteinG: 150, carbsG: 200, fatG: 65, overridden: false };

  function navigateDate(delta: number) {
    const d = new Date(selectedDate + 'T00:00:00');
    d.setDate(d.getDate() + delta);
    setSelectedDate(toDateStr(d));
    setCopyDone(false);
  }

  async function copyYesterday() {
    const yesterday = toDateStr(new Date(new Date(selectedDate + 'T00:00:00').getTime() - 86400000));
    const prevLogs = state.foodLogs.filter(l => l.date === yesterday);
    if (prevLogs.length === 0) return;
    for (const log of prevLogs) {
      await addFoodLog({
        ...log,
        id: uid(),
        date: selectedDate,
        loggedAt: new Date().toISOString(),
      });
    }
    setCopyDone(true);
    setTimeout(() => setCopyDone(false), 2000);
  }

  const handleAddFoodLog = useCallback(async (log: FoodLog) => {
    await addFoodLog(log);
  }, [addFoodLog]);

  const handleDeleteFoodLog = useCallback(async (id: string) => {
    await deleteFoodLog(id);
  }, [deleteFoodLog]);

  const handleSaveCustom = useCallback(async (item: FoodItem) => {
    await saveFoodItem(item);
  }, [saveFoodItem]);

  const remaining = targets.calories - Math.round(totals.calories);

  return (
    <div className="min-h-screen bg-[#0a0a0a] pb-24">
      {/* ─── Header ─── */}
      <div className="sticky top-0 z-10 bg-[#0a0a0a]/95 backdrop-blur-sm border-b border-[#2a2a2a]">
        <div className="flex items-center justify-between px-4 py-3">
          <h1 className="text-lg font-bold text-[#f5f5f5]">Nutrition</h1>
          {selectedDate !== todayStr && (
            <button
              onClick={() => { setSelectedDate(todayStr); setCopyDone(false); }}
              className="text-xs text-[#ef4444] font-semibold px-2 py-1 rounded-lg bg-[#ef4444]/10"
            >
              Today
            </button>
          )}
        </div>

        {/* Date nav */}
        <div className="flex items-center justify-center gap-4 px-4 pb-3">
          <button
            onClick={() => navigateDate(-1)}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a1a] active:bg-[#222222]"
          >
            <ChevronLeft size={20} className="text-[#f5f5f5]" />
          </button>
          <div className="text-sm font-semibold text-[#f5f5f5] min-w-[140px] text-center">
            {formatDateLabel(selectedDate)}
          </div>
          <button
            onClick={() => navigateDate(1)}
            disabled={selectedDate >= todayStr}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-[#1a1a1a] active:bg-[#222222] disabled:opacity-30"
          >
            <ChevronRight size={20} className="text-[#f5f5f5]" />
          </button>
        </div>
      </div>

      <div className="px-4 space-y-4 pt-4">

        {/* ─── Calorie Summary Card ─── */}
        <div className="bg-[#111111] rounded-2xl border border-[#2a2a2a] p-4">
          <div className="flex items-center gap-4">
            {/* Donut */}
            <div className="relative shrink-0">
              <DonutRing logged={totals.calories} target={targets.calories} />
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-[#888888]">eaten</span>
                <span className="text-lg font-bold text-[#f5f5f5] leading-tight">{Math.round(totals.calories)}</span>
              </div>
            </div>

            {/* Stats */}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-[#888888] mb-1">
                {Math.round(totals.calories)} / {targets.calories} kcal
              </div>
              <div className={`text-2xl font-black mb-1 ${remaining < 0 ? 'text-[#ef4444]' : 'text-[#f5f5f5]'}`}>
                {Math.abs(remaining)} kcal
              </div>
              <div className="text-xs text-[#888888]">
                {remaining < 0 ? 'over goal' : 'remaining'}
              </div>
            </div>
          </div>

          {/* Macro bars */}
          <div className="flex gap-4 mt-5">
            <MacroBar label="Protein" color="#3b82f6" value={totals.proteinG} target={targets.proteinG} />
            <MacroBar label="Carbs" color="#f59e0b" value={totals.carbsG} target={targets.carbsG} />
            <MacroBar label="Fat" color="#10b981" value={totals.fatG} target={targets.fatG} />
          </div>
        </div>

        {/* ─── Copy Yesterday ─── */}
        <button
          onClick={copyYesterday}
          className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-[#1a1a1a] border border-[#2a2a2a] text-sm font-medium text-[#888888] hover:text-[#f5f5f5] hover:border-[#3a3a3a] active:bg-[#222222] transition-colors"
        >
          {copyDone ? (
            <>
              <Check size={16} className="text-green-400" />
              <span className="text-green-400">Copied!</span>
            </>
          ) : (
            <>
              <Copy size={15} />
              Copy Yesterday's Meals
            </>
          )}
        </button>

        {/* ─── Meal Sections ─── */}
        {MEAL_ORDER.map(meal => (
          <MealSection
            key={meal}
            meal={meal}
            logs={dayLogs.filter(l => l.meal === meal)}
            onAddFood={m => setAddFoodMeal(m)}
            onDelete={handleDeleteFoodLog}
          />
        ))}

        {/* ─── Water Tracking ─── */}
        {state.settings.waterTrackingEnabled && (
          <WaterSection
            date={selectedDate}
            waterLogs={state.waterLogs}
            onUpdate={updateWaterLog}
          />
        )}

        {/* ─── Nutrition Targets ─── */}
        <TargetsCard
          targets={state.nutritionTargets}
          profile={state.profile}
          onSave={saveNutritionTargets}
        />

      </div>

      {/* ─── Add Food Modal ─── */}
      {addFoodMeal && (
        <AddFoodModal
          meal={addFoodMeal}
          date={selectedDate}
          foodItems={state.foodItems}
          foodLogs={state.foodLogs}
          onClose={() => setAddFoodMeal(null)}
          onAdd={handleAddFoodLog}
          onSaveCustom={handleSaveCustom}
        />
      )}
    </div>
  );
}
