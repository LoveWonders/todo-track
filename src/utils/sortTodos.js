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

function todoCreatedTime(t) {
  const ts = t && t.createdAt ? new Date(t.createdAt).getTime() : 0;
  return Number.isNaN(ts) ? 0 : ts;
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

    // 混合排序：
    // 第一优先级：创建时间倒序（刚添加的任务永远在最上面，无论是否有截止日期）
    // 第二优先级：截止日期正序（已过期的在最前，无日期的排在最后）
    const byMixed = (a, b) => {
      const aCreated = todoCreatedTime(a);
      const bCreated = todoCreatedTime(b);
      if (aCreated !== bCreated) return bCreated - aCreated;
      return todoDueTime(a, now) - todoDueTime(b, now);
    };

    normal.sort(byMixed);
  }

  return [...pinned, ...normal, ...bottom];
}
