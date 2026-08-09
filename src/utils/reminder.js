import { getWindowStart, isRepeatRule, CYCLE_LABELS } from './repeat';

export function parseReminderTime(timeStr) {
  if (typeof timeStr !== 'string') return null;
  const m = timeStr.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return { h, min };
}

function nextWindowStart(rule, date) {
  const d = new Date(date);
  if (rule === 'daily') d.setDate(d.getDate() + 1);
  else if (rule === 'weekly') d.setDate(d.getDate() + 7);
  else if (rule === 'monthly') d.setMonth(d.getMonth() + 1);
  return d;
}

export function nextReminderAt(rule, timeStr, from = new Date()) {
  const t = parseReminderTime(timeStr);
  if (!t || !isRepeatRule(rule)) return null;
  let start = getWindowStart(rule, from);
  for (let i = 0; i < 4; i++) {
    const c = new Date(start);
    c.setHours(t.h, t.min, 0, 0);
    if (c.getTime() > from.getTime()) return c;
    start = nextWindowStart(rule, start);
  }
  return null;
}

export function reminderLabel(rule) {
  return CYCLE_LABELS[rule];
}
