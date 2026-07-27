import { save as storageSave, load as storageLoad } from './storage';

const ARCHIVE_KEY = 'todo_archive_data';

export function loadArchive() {
  try {
    const raw = storageLoad(ARCHIVE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveArchive(archive) {
  try {
    storageSave(ARCHIVE_KEY, archive);
  } catch { /* ignore */ }
}

export function autoArchive(todos, maxAgeDays = 30) {
  if (!todos || todos.length === 0) return { remaining: todos, archived: [] };

  const cutoff = Date.now() - maxAgeDays * 86400000;
  const remaining = [];
  const newlyArchived = [];

  for (const t of todos) {
    if (t.status !== 'active') {
      const archiveTime = t.completedAt ? new Date(t.completedAt).getTime() : 0;
      if (archiveTime > 0 && archiveTime < cutoff) {
        newlyArchived.push(t);
        continue;
      }
    }
    remaining.push(t);
  }

  return { remaining, newlyArchived };
}

export function mergeAndArchive(todos, maxAgeDays = 30) {
  const existingArchive = loadArchive();
  const { remaining, newlyArchived } = autoArchive(todos, maxAgeDays);

  if (newlyArchived.length > 0) {
    const merged = [...existingArchive, ...newlyArchived];
    saveArchive(merged);
  }

  return remaining;
}
