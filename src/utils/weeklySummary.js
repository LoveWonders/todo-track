function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function getWeekRange(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diff);
  return { start: startOfDay(monday), end: endOfDay(new Date(monday.getTime() + 6 * 86400000)) };
}

export function getLastWeekRange() {
  const thisMonday = getWeekRange(new Date()).start;
  const lastMonday = new Date(thisMonday.getTime() - 7 * 86400000);
  return { start: lastMonday, end: endOfDay(new Date(lastMonday.getTime() + 6 * 86400000)) };
}

export function getThisWeekRange() {
  return getWeekRange(new Date());
}

function isInRange(isoString, range) {
  if (!isoString) return false;
  const t = new Date(isoString).getTime();
  return t >= range.start.getTime() && t <= range.end.getTime();
}

export function getCompletedLastWeek(todos, range) {
  return todos.filter(t =>
    t.status === 'completed' && isInRange(t.completedAt, range)
  );
}

export function getProgressedLastWeek(todos, range) {
  return todos.filter(t => {
    if (t.status !== 'active') return false;

    if (isInRange(t.createdAt, range)) return true;

    const progress = t.progress || [];
    return progress.some(p =>
      isInRange(p.createdAt, range) || isInRange(p.completedAt, range)
    );
  });
}

export function getNoProgressLastWeek(todos, range) {
  return todos.filter(t => {
    if (t.status !== 'active') return false;

    if (new Date(t.createdAt).getTime() >= range.start.getTime()) return false;

    const progress = t.progress || [];
    return !progress.some(p =>
      isInRange(p.createdAt, range) || isInRange(p.completedAt, range)
    );
  });
}

export function generateWeeklySummary(completed, progressed, noProgress) {
  const lines = [];

  if (completed.length > 0) {
    lines.push('上周完成了：' + completed.map(t => t.title).join('、'));
  }

  if (progressed.length > 0) {
    lines.push('上周推进了：' + progressed.map(t => t.title).join('、'));
  }

  if (noProgress.length > 0) {
    lines.push('上周无进展：' + noProgress.map(t => t.title).join('、'));
  }

  return lines.join('\n');
}

export function generateThisWeekSummary(completed, progressed, noProgress) {
  const lines = [];

  if (completed.length > 0) {
    lines.push('本周完成了：' + completed.map(t => t.title).join('、'));
  }

  if (progressed.length > 0) {
    lines.push('本周推进了：' + progressed.map(t => t.title).join('、'));
  }

  if (noProgress.length > 0) {
    lines.push('本周无进展：' + noProgress.map(t => t.title).join('、'));
  }

  return lines.join('\n');
}
