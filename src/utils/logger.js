const MAX_LOGS = 200;
const STORAGE_KEY = 'todotrack_debug_logs';

let logs = [];

(function init() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      logs = JSON.parse(raw);
    }
  } catch {
    logs = [];
  }
})();

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
  if (logs.length > MAX_LOGS) {
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
