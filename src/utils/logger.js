import { readJSON, save } from './storage';
import { applyLogTrim } from './logTrim';

const DEFAULT_MAX_LOGS = 200;
const STORAGE_KEY = 'todotrack_debug_logs';

let logs = [];
let autoTrim = true;
let maxLogs = DEFAULT_MAX_LOGS;
let persistTimer = null;

(function init() {
  const settings = readJSON('todo_app_settings', null);
  if (settings && typeof settings === 'object') {
    autoTrim = settings.autoClearLogs !== false;
    const n = Number(settings.maxLogs);
    if (Number.isFinite(n)) maxLogs = Math.min(5000, Math.max(20, Math.round(n)));
  }
  const parsedLogs = readJSON(STORAGE_KEY, null);
  if (Array.isArray(parsedLogs)) logs = parsedLogs;
  trimLogs();
})();

function trimLogs() {
  logs = applyLogTrim(logs, maxLogs, autoTrim);
}

export function setAutoTrim(enabled) {
  autoTrim = !!enabled;
  trimLogs();
  persist();
}

export function setMaxLogs(value) {
  const n = Number(value);
  maxLogs = Number.isFinite(n) ? Math.min(5000, Math.max(20, Math.round(n))) : DEFAULT_MAX_LOGS;
  trimLogs();
  persist();
}

export function flushLogs() {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  save(STORAGE_KEY, logs);
}

function persist() {
  if (persistTimer) return;
  persistTimer = setTimeout(() => {
    persistTimer = null;
    save(STORAGE_KEY, logs);
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
  trimLogs();
  persist();
  return entry;
}

export function deleteLogs(ids) {
  const idSet = ids instanceof Set ? ids : new Set(ids);
  if (idSet.size === 0) return;
  logs = logs.filter(e => !idSet.has(e.id));
  persist();
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
    case 'data': return '数据';
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
