const VALID_STATUSES = ['active', 'completed', 'cancelled'];
const VALID_PIN_STATUSES = ['top', 'bottom', null];
const MAX_TITLE_LEN = 500;
const MAX_PROGRESS_TEXT_LEN = 2000;
const MAX_TAGS = 20;
const MAX_PROGRESS = 200;

function validIsoOrNull(value) {
  if (typeof value !== 'string') return null;
  if (!isNaN(new Date(value).getTime())) return value;
  return null;
}

function normalizeProgress(p, index) {
  if (!p || typeof p !== 'object') return null;
  const createdAt = validIsoOrNull(p.createdAt) || validIsoOrNull(p.time) || new Date().toISOString();
  return {
    id: Number.isFinite(p.id) ? p.id : Date.now() + index,
    text: typeof p.text === 'string' ? p.text.slice(0, MAX_PROGRESS_TEXT_LEN) : '',
    createdAt,
    status: p.status === 'completed' ? 'completed' : p.status === 'cancelled' ? 'cancelled' : 'active',
    completedAt: validIsoOrNull(p.completedAt),
  };
}

export function normalizeImportedTodo(t) {
  if (!t || typeof t !== 'object') return null;
  const id = Number.isFinite(t.id) ? t.id : null;
  if (id === null) return null;
  return {
    id,
    title: typeof t.title === 'string' ? t.title.slice(0, MAX_TITLE_LEN) : '',
    startDate: validIsoOrNull(t.startDate),
    dueDate: validIsoOrNull(t.dueDate),
    tags: Array.isArray(t.tags)
      ? [...new Set(t.tags.filter(x => typeof x === 'string').slice(0, MAX_TAGS))]
      : [],
    progress: Array.isArray(t.progress) ? t.progress.map(normalizeProgress).filter(Boolean).slice(0, MAX_PROGRESS) : [],
    status: VALID_STATUSES.includes(t.status) ? t.status : 'active',
    pinStatus: VALID_PIN_STATUSES.includes(t.pinStatus) ? t.pinStatus : null,
    completedAt: validIsoOrNull(t.completedAt),
    createdAt: validIsoOrNull(t.createdAt) || new Date().toISOString(),
  };
}
