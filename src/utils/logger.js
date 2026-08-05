const MAX_LOGS = 200;
const STORAGE_KEY = 'todotrack_debug_logs';

let logs = [];
let autoTrim = true;

(function init() {
  try {
    const settingsRaw = localStorage.getItem('todo_app_settings');
    if (settingsRaw) {
      const settings = JSON.parse(settingsRaw);
      if (settings && typeof settings === 'object') {
        autoTrim = settings.autoClearLogs !== false;
      }
    }
  } catch { /* keep default */ }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) logs = parsed;
    }
  } catch {
    logs = [];
  }
})();

export function setAutoTrim(enabled) {
  autoTrim = !!enabled;
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(logs));
  } catch { /* ignore */ }
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
  persist();
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
