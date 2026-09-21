import { URGENT_TAG } from '../constants';
import { pad2 } from './datePatterns';
import { isRepeatRule, getRepeatDue, isMarkerKind } from './repeat';

function parseTime(value) {
  if (!value) return null;
  const t = new Date(value).getTime();
  return Number.isNaN(t) ? null : t;
}

function timeToIso(t) {
  const d = new Date(t);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
}

export function getParentDueTime(todo, now = new Date()) {
  if (isRepeatRule(todo?.repeatRule)) return getRepeatDue(todo, now);
  return parseTime(todo?.dueDate);
}

export function getEffectiveDue(todo, now = new Date()) {
  const parentTime = getParentDueTime(todo, now);
  let childTime = null;
  let childIso = null;
  const progress = Array.isArray(todo?.progress) ? todo.progress : [];
  for (const p of progress) {
    if (p.status !== 'active' || isMarkerKind(p.kind)) continue;
    const t = parseTime(p.dueDate);
    if (t == null) continue;
    if (childTime == null || t < childTime) {
      childTime = t;
      childIso = p.dueDate;
    }
  }

  if (parentTime == null && childTime == null) {
    return { time: null, iso: null, source: null };
  }
  if (childTime == null || (parentTime != null && parentTime <= childTime)) {
    return { time: parentTime, iso: todo.dueDate || timeToIso(parentTime), source: 'parent' };
  }
  return { time: childTime, iso: childIso, source: 'child' };
}

export function getTaskTier(todo, now = new Date()) {
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  const oneMonthLater = new Date(now);
  oneMonthLater.setMonth(oneMonthLater.getMonth() + 1);

  const tags = todo.tags || [];
  const isUrgent = tags.includes(URGENT_TAG);
  const isLongTerm = tags.includes('长期');
  const { time: dueTime } = getEffectiveDue(todo, now);
  const isOverdueTask = dueTime != null && dueTime < now.getTime();
  const isDueSoon = dueTime != null && dueTime <= threeDaysLater.getTime();
  const isDueInMonth = dueTime != null && dueTime <= oneMonthLater.getTime();

  if (dueTime == null) {
    if (isUrgent) return 1;
    if (isLongTerm) return 3;
    const hasActiveChild = (todo.progress || []).some(
      p => p.status === 'active' && !isMarkerKind(p.kind)
    );
    return hasActiveChild ? 2 : 3;
  }

  if (isUrgent || isOverdueTask || isDueSoon) return 1;
  if (!isLongTerm && isDueInMonth) return 2;
  return 3;
}
