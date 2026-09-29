export function isTodoOpLog(entry) {
  return entry && entry.type === 'data';
}

export function applyLogTrim(list, limit, enabled) {
  if (!enabled || !Array.isArray(list) || list.length <= limit) return list;
  const next = list.slice();
  let i = next.length - 1;
  while (next.length > limit && i >= 0) {
    if (!isTodoOpLog(next[i])) next.splice(i, 1);
    i -= 1;
  }
  return next;
}
