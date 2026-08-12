import { readJSON } from './storage';

const MAX_LOGS = 200;
const STORAGE_KEY = 'todotrack_debug_logs';

let logs = [];
let autoTrim = true;
let persistTimer = null;

(function init() {
  const settings = readJSON('todo_app_settings', null);
  if (settings && typeof settings === 'object') {
    autoTrim = settings.autoClearLogs !== false;
  }
  const parsedLogs = readJSON(STORAGE_KEY, null);
  if (Array.isArray(parsedLogs)) logs = parsedLogs;
})();

export function setAutoTrim(enabled) {
  autoTrim = !!enabled;
}

export function flushLogs() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch { /* ignore */ }
}

function persist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
    } catch { /* ignore */ }
  }, 200);
}

export function addLog(type, message, detail) {
  const entry = {
    id: Date.now() + '_' + Math.random().toString(36).slice(2, 6),
    ts: new Date().toLocaleString(),
    type,
    message,
    detail: detail !== undefined ? detail : null,
  };
  logs.unshift(entry);
  if (autoTrim && logs.length > MAX_LOGS) {
    logs.length = MAX_LOGS;
  }
  persist();
  return entry;
}

export function getLogs() {
  return logs;
}

export function clearLogs() {
  logs = [];
  flushLogs();
}

export function logTypeLabel(type) {
  switch (type) {
    case 'error': return '错误';
    case 'success': return '成功';
    case 'info': return '信息';
    default: return type;
  }
}

export function getSelectedLogsText(logs, selectedIds) {
  return logs
    .filter(e => selectedIds.has(e.id))
    .map(e =>
      `[${e.ts}] [${logTypeLabel(e.type)}] ${e.message}` +
      (e.detail ? '\n' + JSON.stringify(e.detail, null, 2) : '')
    ).join('\n\n---\n\n');
}
