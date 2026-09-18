import { readJSON, save } from './storage';

const STORAGE_KEY = 'todo_progress_collapsed';
const DEFAULT_COLLAPSED = true;

export function loadProgressCollapsed(id) {
  const map = readJSON(STORAGE_KEY, {});
  return map && typeof map === 'object' && typeof map[id] === 'boolean' ? map[id] : DEFAULT_COLLAPSED;
}

export function saveProgressCollapsed(id, collapsed) {
  const map = readJSON(STORAGE_KEY, {});
  map[id] = !!collapsed;
  save(STORAGE_KEY, map);
}

export function removeProgressCollapsed(id) {
  const map = readJSON(STORAGE_KEY, {});
  if (id in map) {
    delete map[id];
    save(STORAGE_KEY, map);
  }
}
