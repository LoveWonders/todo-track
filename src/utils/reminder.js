import { anchorDateInWindow, getWindowStart, isRepeatRule } from './repeat';

export function parseReminderTime(timeStr) {
  if (typeof timeStr !== 'string') return null;
  const m = timeStr.match(/^(\d{1,2}):(\d{1,2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return { h, min };
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

export const DEFAULT_REMINDER_OFFSET = 60;

export function extractDeadlineTime(dueDate) {
  if (typeof dueDate !== 'string') return null;
  const match = /(\d{2}):(\d{2})/.exec(dueDate.slice(11, 16) || '');
  if (!match) return null;
  const hm = match[0];
  return parseReminderTime(hm) ? hm : null;
}

export function initReminderTime(deadline, globalOffset) {
  const t = parseReminderTime(deadline);
  if (!t) return null;
  const offset = Number.isFinite(globalOffset) ? Math.max(0, globalOffset) : DEFAULT_REMINDER_OFFSET;
  const deadlineMin = t.h * 60 + t.min;
  const safeOffset = Math.min(offset, deadlineMin);
  const total = deadlineMin - safeOffset;
  return `${pad2(Math.floor(total / 60))}:${pad2(total % 60)}`;
}

function nextWindowStart(rule, date) {
  const d = new Date(date);
  if (rule === 'daily') d.setDate(d.getDate() + 1);
  else if (rule === 'weekly') d.setDate(d.getDate() + 7);
  else if (rule === 'monthly') d.setMonth(d.getMonth() + 1);
  return d;
}

export function nextReminderAt(rule, timeStr, anchor, from = new Date()) {
  const t = parseReminderTime(timeStr);
  if (!t || !isRepeatRule(rule)) return null;
  let start = getWindowStart(rule, from);
  for (let i = 0; i < 4; i++) {
    const c = anchorDateInWindow(rule, anchor, start);
    c.setHours(t.h, t.min, 0, 0);
    if (c.getTime() > from.getTime()) return c;
    start = nextWindowStart(rule, start);
  }
  return null;
}
