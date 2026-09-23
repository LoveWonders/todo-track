import { reopenCurrentCycle } from './cycleTodos';

export function appendProgress(t, {
  id,
  text,
  createdAt,
  temporary,
  urgent,
  reminderTime,
  dueDate,
}) {
  const trimmed = typeof text === 'string' ? text.trim() : '';
  if (!trimmed) return t;
  return {
    ...t,
    progress: [...(t.progress || []), {
      id,
      text: trimmed,
      createdAt,
      status: 'active',
      temporary: temporary === true,
      urgent: urgent === true,
      reminderTime: reminderTime || null,
      dueDate: dueDate || null,
    }],
  };
}

export function toggleProgressItem(t, progressId, newStatus, nowIso) {
  const target = (t.progress || []).find(p => p.id === progressId);
  if (target && (target.kind === 'cycle-done' || target.kind === 'cycle-skip') && target.status !== 'active') {
    return reopenCurrentCycle(t);
  }
  return {
    ...t,
    progress: (t.progress || []).map(p => {
      if (p.id !== progressId) return p;
      if (p.kind === 'promoted') return p;
      const willBeArchived = p.status === 'active' && newStatus !== 'active';
      const willBeRestored = p.status !== 'active' && newStatus !== p.status;
      return {
        ...p,
        status: p.status === newStatus ? 'active' : newStatus,
        completedAt: willBeArchived ? nowIso
          : willBeRestored ? null
          : p.completedAt,
      };
    }),
  };
}

export function patchProgressItem(t, progressId, patch) {
  return {
    ...t,
    progress: (t.progress || []).map(p =>
      p.id === progressId ? { ...p, ...patch } : p
    ),
  };
}

export function removeProgressItem(t, progressId) {
  return {
    ...t,
    progress: (t.progress || []).filter(p => p.id !== progressId),
  };
}
