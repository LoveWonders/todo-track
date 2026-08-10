import { getTaskTier } from './taskTier';
import { isRepeatRule, getRepeatDue } from './repeat';

const TOP = 'top';
const BOTTOM = 'bottom';

function todoDueTime(t, now) {
  if (isRepeatRule(t.repeatRule)) {
    const due = getRepeatDue(t, now);
    return due != null ? due : Infinity;
  }
  return t.dueDate ? new Date(t.dueDate).getTime() : Infinity;
}

export default function sortTodos(list, isManualMode) {
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

  if (!isManualMode) {
    const now = new Date();

    const byDue = (a, b) => {
      const aDue = todoDueTime(a, now);
      const bDue = todoDueTime(b, now);
      return aDue - bDue;
    };

    const tier1 = [];
    const tier2 = [];
    const tier3 = [];

    for (const t of normal) {
      const tier = getTaskTier(t, now);
      if (tier === 1) tier1.push(t);
      else if (tier === 2) tier2.push(t);
      else tier3.push(t);
    }

    tier1.sort(byDue);
    tier2.sort(byDue);
    tier3.sort(byDue);

    normal = [...tier1, ...tier2, ...tier3];
  }

  return [...pinned, ...normal, ...bottom];
}
