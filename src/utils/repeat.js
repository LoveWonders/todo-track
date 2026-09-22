import { pad2 } from './datePatterns';

export const CYCLE_LABELS = {
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
};

export function isRepeatRule(v) {
  return v === 'daily' || v === 'weekly' || v === 'monthly';
}

export function isMarkerKind(kind) {
  return kind === 'cycle-done' || kind === 'cycle-skip' || kind === 'promoted';
}

export const WEEKDAY_LABELS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export function isValidAnchor(rule, anchor) {
  if (rule === 'weekly') {
    return Number.isInteger(anchor) && anchor >= 1 && anchor <= 7;
  }
  if (rule === 'monthly') {
    return anchor === 'last' || (Number.isInteger(anchor) && anchor >= 1 && anchor <= 31);
  }
  return false;
}

export function anchorLabel(rule, anchor) {
  if (rule === 'weekly') {
    return isValidAnchor(rule, anchor) ? WEEKDAY_LABELS[anchor - 1] : '每周';
  }
  if (rule === 'monthly') {
    if (anchor === 'last') return '每月月末';
    if (isValidAnchor(rule, anchor)) return `每月${anchor}号`;
    return '每月';
  }
  return CYCLE_LABELS[rule];
}

export function describeCycle(rule, anchor) {
  if (rule === 'daily') return '每天';
  if (rule === 'weekly') {
    return isValidAnchor(rule, anchor) ? `每周${WEEKDAY_LABELS[anchor - 1]}` : '每周';
  }
  if (rule === 'monthly') return anchorLabel(rule, anchor);
  return '';
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function toLocalDateKey(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
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

function progressTime(p) {
  return new Date(p.completedAt ?? p.createdAt ?? p.time ?? 0).getTime();
}

function cycleRefDate(todo, now) {
  if (todo?.dueDate) {
    const d = new Date(todo.dueDate);
    if (!Number.isNaN(d.getTime())) return d;
  }
  return now;
}

export function formatLocalDueIso(date, timeSource) {
  const y = date.getFullYear();
  const m = pad2(date.getMonth() + 1);
  const d = pad2(date.getDate());
  let hh = '23';
  let mi = '59';
  let ss = '59';
  if (typeof timeSource === 'string') {
    const tm = timeSource.match(/T(\d{2}):(\d{2})(?::(\d{2}))?/);
    if (tm) {
      hh = tm[1];
      mi = tm[2];
      ss = tm[3] || '00';
    }
  }
  return `${y}-${m}-${d}T${hh}:${mi}:${ss}`;
}

export function nextCycleWindowStart(rule, date) {
  const ws = getWindowStart(rule, date);
  const d = new Date(ws);
  if (rule === 'daily') d.setDate(d.getDate() + 1);
  else if (rule === 'weekly') d.setDate(d.getDate() + 7);
  else d.setMonth(d.getMonth() + 1);
  return getWindowStart(rule, d);
}

export function advanceCycleDue(todo, fromDue) {
  if (!isRepeatRule(todo?.repeatRule)) return todo?.dueDate || null;
  const base = fromDue
    ? new Date(fromDue)
    : (todo.dueDate ? new Date(todo.dueDate) : new Date());
  if (Number.isNaN(base.getTime())) return todo.dueDate || null;
  const nextWs = nextCycleWindowStart(todo.repeatRule, base);
  const nextDate = anchorDateInWindow(todo.repeatRule, todo.repeatAnchor, nextWs);
  return formatLocalDueIso(nextDate, todo.dueDate);
}

export function isCycleClosedForDue(todo, dueDate) {
  if (!isRepeatRule(todo?.repeatRule) || !dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  const ws = getWindowStart(todo.repeatRule, due).getTime();
  const we = getWindowEnd(todo.repeatRule, todo.repeatAnchor, due);
  const weTime = we ? we.getTime() : Infinity;
  return (Array.isArray(todo.progress) ? todo.progress : []).some(p => {
    if (p.kind !== 'cycle-done' && p.kind !== 'cycle-skip') return false;
    const ts = progressTime(p);
    return ts >= ws && ts <= weTime;
  });
}

export function repairRolledDue(todo) {
  if (!isRepeatRule(todo?.repeatRule)) return todo;
  let dueDate = todo.dueDate;
  if (!dueDate) {
    const end = getWindowEnd(todo.repeatRule, todo.repeatAnchor, new Date());
    dueDate = end ? formatLocalDueIso(end, null) : null;
    if (!dueDate) return todo;
  }
  const original = todo.dueDate;
  let guard = 0;
  while (guard++ < 8 && isCycleClosedForDue(todo, dueDate)) {
    const next = advanceCycleDue({ ...todo, dueDate });
    if (!next || next === dueDate) break;
    dueDate = next;
  }
  return dueDate !== original ? { ...todo, dueDate } : todo;
}

function getCalendarWindowEnd(rule, date = new Date()) {
  if (rule === 'daily') {
    const e = startOfDay(date);
    e.setHours(23, 59, 59, 999);
    return e;
  }
  if (rule === 'weekly') {
    const e = getWindowStart('weekly', date);
    e.setDate(e.getDate() + 6);
    e.setHours(23, 59, 59, 999);
    return e;
  }
  const ws = getWindowStart('monthly', date);
  const e = new Date(ws.getFullYear(), ws.getMonth() + 1, 0);
  e.setHours(23, 59, 59, 999);
  return e;
}

export function getCycleMarkerThisCycle(todo, now = new Date()) {
  if (!isRepeatRule(todo?.repeatRule)) return null;
  const ws = getWindowStart(todo.repeatRule, now).getTime();
  const weTime = getCalendarWindowEnd(todo.repeatRule, now).getTime();
  let found = null;
  for (const p of Array.isArray(todo.progress) ? todo.progress : []) {
    if (p.kind !== 'cycle-done' && p.kind !== 'cycle-skip') continue;
    const ts = progressTime(p);
    if (ts >= ws && ts <= weTime) found = p;
  }
  return found;
}

export function hasCycleDoneThisCycle(todo, now = new Date()) {
  return getCycleMarkerThisCycle(todo, now)?.kind === 'cycle-done';
}

export function hasCycleClosedThisCycle(todo, now = new Date()) {
  return getCycleMarkerThisCycle(todo, now) != null;
}

export function getWindowEnd(rule, anchor, date = new Date()) {
  if (!isRepeatRule(rule)) return null;
  const d = new Date(date);
  if (rule === 'daily') {
    const e = startOfDay(d);
    e.setHours(23, 59, 59, 999);
    return e;
  }
  if (rule === 'weekly') {
    const ws = getWindowStart('weekly', d);
    const target = new Date(ws);
    if (isValidAnchor('weekly', anchor)) {
      target.setDate(ws.getDate() + anchor - 1);
    } else {
      target.setDate(ws.getDate() + 6);
    }
    target.setHours(23, 59, 59, 999);
    return target;
  }
  const ws = getWindowStart('monthly', d);
  const y = ws.getFullYear();
  const m = ws.getMonth();
  let target;
  if (anchor === 'last') {
    target = new Date(y, m + 1, 0);
  } else if (isValidAnchor('monthly', anchor)) {
    const lastDay = new Date(y, m + 1, 0).getDate();
    target = new Date(y, m, Math.min(Number(anchor), lastDay));
  } else {
    target = new Date(y, m + 1, 0);
  }
  target.setHours(23, 59, 59, 999);
  return target;
}

export function getRepeatDue(todo, now = new Date()) {
  if (!isRepeatRule(todo?.repeatRule)) return null;
  if (todo.dueDate) {
    const t = new Date(todo.dueDate).getTime();
    if (!Number.isNaN(t)) return t;
  }
  const end = getWindowEnd(todo.repeatRule, todo.repeatAnchor, now);
  return end ? end.getTime() : null;
}

export function currentCycleProgress(todo, now = new Date()) {
  const all = Array.isArray(todo?.progress) ? todo.progress : [];
  const untagged = all.filter(p => !isMarkerKind(p.kind));
  if (!isRepeatRule(todo?.repeatRule)) return untagged;
  const ref = cycleRefDate(todo, now);
  const ws = getWindowStart(todo.repeatRule, ref).getTime();
  return untagged.filter(p =>
    new Date(p.createdAt ?? p.time).getTime() >= ws
  );
}

export function getCycleStats(todo, now = new Date()) {
  const items = currentCycleProgress(todo, now);
  let completed = 0;
  let active = 0;
  for (const p of items) {
    if (p.status === 'completed') completed += 1;
    else if (p.status === 'active') active += 1;
  }
  return {
    items,
    completed,
    active,
    count: items.length,
    allDone: items.length > 0 && completed === items.length,
    cycleDone: hasCycleDoneThisCycle(todo, now),
    cycleClosed: hasCycleClosedThisCycle(todo, now),
  };
}

export function anchorDateInWindow(rule, anchor, windowStart) {
  const ws = windowStart instanceof Date ? windowStart : new Date(windowStart);
  if (rule === 'daily') return new Date(ws);
  if (rule === 'weekly') {
    const d = new Date(ws);
    const offset = isValidAnchor('weekly', anchor) ? anchor - 1 : 6;
    d.setDate(ws.getDate() + offset);
    return d;
  }
  const y = ws.getFullYear();
  const m = ws.getMonth();
  if (anchor === 'last') return new Date(y, m + 1, 0);
  const lastDay = new Date(y, m + 1, 0).getDate();
  const day = isValidAnchor('monthly', anchor) ? Math.min(Number(anchor), lastDay) : lastDay;
  return new Date(y, m, day);
}
