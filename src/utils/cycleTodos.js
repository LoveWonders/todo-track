import {
  getCycleKey,
  getWindowStart,
  getWindowEnd,
  isRepeatRule,
  advanceCycleDue,
  isCycleClosedForDue,
  repairRolledDue,
  formatLocalDueIso,
  isMarkerKind,
  getCycleMarkerThisCycle,
} from './repeat';

function checklistTemplates(progress) {
  return [...new Set(
    (progress || [])
      .filter(p => p.status === 'completed' && !isMarkerKind(p.kind) && !p.temporary)
      .map(p => p.text)
  )];
}

function seedChecklist(templates, allocateId, createdAt) {
  if (templates.length === 0) return [];
  return templates.map(text => ({
    id: allocateId(),
    text,
    createdAt,
    status: 'active',
  }));
}

export function closeCurrentCycle(t, kind, nowIso, allocateId) {
  if (getCycleMarkerThisCycle(t)) return t;
  const currentDue = t.dueDate || (() => {
    const end = getWindowEnd(t.repeatRule, t.repeatAnchor, new Date());
    return end ? formatLocalDueIso(end, null) : null;
  })();
  const current = { ...t, dueDate: currentDue };
  if (isCycleClosedForDue(current, currentDue)) return t;
  const markDone = kind === 'cycle-done';
  const closeStamp = currentDue || nowIso;
  let progress = (t.progress || []).map(p =>
    p.status === 'active'
      ? { ...p, status: markDone ? 'completed' : 'cancelled', completedAt: closeStamp }
      : p
  );
  progress = [...progress, {
    id: allocateId(),
    text: markDone ? '本期完成' : '本期作废',
    createdAt: closeStamp,
    status: markDone ? 'completed' : 'cancelled',
    completedAt: closeStamp,
    kind,
  }];
  const nextDue = advanceCycleDue({ ...current, progress });
  if (t.checklistMode) {
    const stamp = nextDue
      ? getWindowStart(t.repeatRule, new Date(nextDue)).toISOString()
      : nowIso;
    progress = [...progress, ...seedChecklist(checklistTemplates(t.progress), allocateId, stamp)];
  }
  return {
    ...t,
    status: 'active',
    completedAt: nowIso,
    progress,
    dueDate: nextDue || currentDue,
  };
}

export function reopenCurrentCycle(t, now = new Date()) {
  if (!isRepeatRule(t.repeatRule)) return t;
  const marker = getCycleMarkerThisCycle(t, now);
  if (!marker) return t;
  const restoredDue = marker.createdAt || marker.completedAt || t.dueDate;
  const closeStamp = marker.completedAt || marker.createdAt;
  let progress = (t.progress || []).filter(p => p.id !== marker.id);
  progress = progress.map(p => {
    if (isMarkerKind(p.kind) || p.status === 'active') return p;
    if (closeStamp && p.completedAt === closeStamp) {
      return { ...p, status: 'active', completedAt: null };
    }
    return p;
  });
  if (t.checklistMode && t.dueDate) {
    const seedStamp = getWindowStart(t.repeatRule, new Date(t.dueDate)).toISOString();
    progress = progress.filter(p => {
      if (p.status !== 'active' || isMarkerKind(p.kind)) return true;
      return (p.createdAt ?? p.time) !== seedStamp;
    });
  }
  return {
    ...t,
    status: 'active',
    completedAt: null,
    progress,
    dueDate: restoredDue,
  };
}

export function applyRepeatTick(list, now, allocateId) {
  const nowIso = now.toISOString();
  let mutated = false;
  const next = list.map(t => {
    if (t.status !== 'active' || !isRepeatRule(t.repeatRule)) return t;
    const key = getCycleKey(t.repeatRule, now);
    if (t.cycleKey === key) {
      const repaired = repairRolledDue(t);
      if (repaired !== t) mutated = true;
      return repaired;
    }
    mutated = true;
    if (!t.cycleKey) {
      return repairRolledDue({ ...t, cycleKey: key });
    }
    const newWs = getWindowStart(t.repeatRule, now).getTime();
    let progress = (t.progress || []).map(p => {
      if (p.status !== 'active') return p;
      const created = new Date(p.createdAt ?? p.time).getTime();
      if (created >= newWs) return p;
      return { ...p, status: 'cancelled', completedAt: nowIso };
    });
    if (t.checklistMode) {
      const hasNewActive = progress.some(p =>
        p.status === 'active' && new Date(p.createdAt ?? p.time).getTime() >= newWs
      );
      if (!hasNewActive) {
        progress = [...progress, ...seedChecklist(checklistTemplates(progress), allocateId, nowIso)];
      }
    }
    return repairRolledDue({ ...t, cycleKey: key, progress });
  });
  return mutated ? next : list;
}
