const MAX_LOGS = 200;
const logs = [];

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
    logs.pop();
  }
  return entry;
}

export function getLogs() {
  return logs;
}

export function clearLogs() {
  logs.length = 0;
}
