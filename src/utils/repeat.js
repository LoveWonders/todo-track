export const CYCLE_LABELS = {
  daily: '每日',
  weekly: '每周',
  monthly: '每月',
};

export function isRepeatRule(v) {
  return v === 'daily' || v === 'weekly' || v === 'monthly';
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
  const end = getWindowEnd(todo.repeatRule, todo.repeatAnchor, now);
  return end ? end.getTime() : null;
}

export function currentCycleProgress(todo, now = new Date()) {
  const all = Array.isArray(todo?.progress) ? todo.progress : [];
  if (!isRepeatRule(todo?.repeatRule)) return all;
  const ws = getWindowStart(todo.repeatRule, now).getTime();
  return all.filter(p => new Date(p.createdAt ?? p.time).getTime() >= ws);
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
