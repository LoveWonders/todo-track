import { URGENT_TAG } from '../constants';
import { isMarkerKind } from './repeat';
import { SORT_MANUAL } from './sortTodos';

function copyTags(parentTags, urgent) {
  const tags = Array.isArray(parentTags) ? parentTags.filter(t => typeof t === 'string') : [];
  if (urgent && !tags.includes(URGENT_TAG)) tags.push(URGENT_TAG);
  return [...new Set(tags)];
}

function nextManualOrder(todos) {
  let max = -1;
  for (const t of todos) {
    if (t.pinStatus) continue;
    if (Number.isFinite(t.manualOrder) && t.manualOrder > max) max = t.manualOrder;
  }
  return max + 1;
}

export function promoteProgressItem(todos, todoId, progressId, { nowIso, newTodoId, sortMode }) {
  const parent = todos.find(t => t.id === todoId);
  if (!parent) return null;
  const item = (parent.progress || []).find(p => p.id === progressId);
  if (!item || item.status !== 'active' || isMarkerKind(item.kind)) return null;

  const newTodo = {
    id: newTodoId,
    title: item.text || '',
    startDate: null,
    dueDate: item.dueDate || null,
    tags: copyTags(parent.tags, item.urgent === true),
    status: 'active',
    pinStatus: null,
    manualOrder: sortMode === SORT_MANUAL ? nextManualOrder(todos) : null,
    manualLocked: false,
    createdAt: nowIso,
    progress: [],
    checklistMode: false,
    repeatRule: null,
    repeatAnchor: null,
    cycleKey: null,
    reminderTime: null,
    reminderAt: item.reminderTime || null,
  };

  const parentNext = {
    ...parent,
    progress: (parent.progress || []).map(p =>
      p.id === progressId
        ? {
            ...p,
            status: 'cancelled',
            kind: 'promoted',
            completedAt: nowIso,
          }
        : p
    ),
  };

  const nextTodos = todos.map(t => (t.id === todoId ? parentNext : t));
  nextTodos.push(newTodo);
  return { parent: parentNext, newTodo, todos: nextTodos };
}
