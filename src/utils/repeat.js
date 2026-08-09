export const CYCLE_LABELS = {
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
};

export function isRepeatRule(v) {
  return v === 'daily' || v === 'weekly' || v === 'monthly';
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toLocalDateKey(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getWindowStart(rule, date = new Date()) {
  const d = startOfDay(date);
  if (rule === 'daily') return d;
  if (rule === 'monthly') return new Date(d.getFullYear(), d.getMonth(), 1);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return startOfDay(monday);
}

export function getCycleKey(rule, date = new Date()) {
  return toLocalDateKey(getWindowStart(rule, date));
}

export function hasCycleDoneThisCycle(todo, now = new Date()) {
  if (!isRepeatRule(todo?.repeatRule)) return false;
  const ws = getWindowStart(todo.repeatRule, now).getTime();
  return (Array.isArray(todo.progress) ? todo.progress : []).some(p =>
    p.kind === 'cycle-done' &&
    new Date(p.completedAt ?? p.createdAt).getTime() >= ws
  );
}
