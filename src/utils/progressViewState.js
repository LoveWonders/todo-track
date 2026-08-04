const STORAGE_KEY = 'todo_progress_collapsed';
const DEFAULT_COLLAPSED = true;

export function loadProgressCollapsed(id) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_COLLAPSED;
    const map = JSON.parse(raw);
    if (map && typeof map === 'object' && typeof map[id] === 'boolean') {
      return map[id];
    }
  } catch { /* ignore */ }
  return DEFAULT_COLLAPSED;
}

export function saveProgressCollapsed(id, collapsed) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let map = {};
    if (raw) {
      try {
        map = JSON.parse(raw) || {};
      } catch {
        map = {};
      }
    }
    map[id] = !!collapsed;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch { /* ignore */ }
}

export function removeProgressCollapsed(id) {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    const map = JSON.parse(raw) || {};
    if (id in map) {
      delete map[id];
      localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
    }
  } catch { /* ignore */ }
}
