import { getEffectiveDue } from './taskTier';

export const SORT_CREATED = 'created';
export const SORT_DUE = 'due';
export const SORT_MANUAL = 'manual';

export const SORT_MODE_LABELS = {
  [SORT_CREATED]: '最新创建',
  [SORT_DUE]: '截止日期',
  [SORT_MANUAL]: '手动排序',
};

const TOP = 'top';
const BOTTOM = 'bottom';

function todoDueTime(t, now) {
  const { time } = getEffectiveDue(t, now);
  return time != null ? time : Infinity;
}

function todoCreatedTime(t) {
  const ts = t && t.createdAt ? new Date(t.createdAt).getTime() : 0;
  return Number.isNaN(ts) ? 0 : ts;
}

function hasDue(t, now) {
  return todoDueTime(t, now) !== Infinity;
}

function manualOrderValue(t) {
  return Number.isFinite(t && t.manualOrder) ? t.manualOrder : Infinity;
}

function byCreatedDesc(a, b) {
  return todoCreatedTime(b) - todoCreatedTime(a);
}

function byDueAsc(a, b, now) {
  const aHas = hasDue(a, now);
  const bHas = hasDue(b, now);
  if (aHas !== bHas) return aHas ? -1 : 1;
  if (!aHas && !bHas) return byCreatedDesc(a, b);
  const dueDiff = todoDueTime(a, now) - todoDueTime(b, now);
  if (dueDiff !== 0) return dueDiff;
  return byCreatedDesc(a, b);
}

function byManual(a, b) {
  const ao = manualOrderValue(a);
  const bo = manualOrderValue(b);
  const aLocked = ao !== Infinity;
  const bLocked = bo !== Infinity;
  if (aLocked !== bLocked) return aLocked ? 1 : -1;
  if (!aLocked) return byCreatedDesc(a, b);
  return ao - bo;
}

export function normalizeSortMode(mode) {
  if (mode === SORT_DUE || mode === SORT_MANUAL || mode === SORT_CREATED) return mode;
  return SORT_CREATED;
}

export default function sortTodos(list, sortMode) {
  if (!Array.isArray(list)) return [];

  const pinned = [];
  const bottom = [];
  let normal = [];

  for (const t of list) {
    const pinStatus = t && t.pinStatus;
    if (pinStatus === TOP) pinned.push(t);
    else if (pinStatus === BOTTOM) bottom.push(t);
    else normal.push(t);
  }

  const mode = normalizeSortMode(sortMode);
  if (mode === SORT_CREATED) {
    normal.sort(byCreatedDesc);
  } else if (mode === SORT_DUE) {
    const now = new Date();
    normal.sort((a, b) => byDueAsc(a, b, now));
  } else {
    normal.sort(byManual);
  }

  return [...pinned, ...normal, ...bottom];
}
