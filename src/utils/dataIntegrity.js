const VALID_STATUSES = ['active', 'completed', 'cancelled'];
const VALID_PINS = ['top', 'bottom'];

function isValidIso(value) {
  return typeof value === 'string' && !isNaN(new Date(value).getTime());
}

function isNullableIso(value) {
  return value == null || isValidIso(value);
}

function checkTodo(t, source, problems) {
  const issues = [];
  if (!t || typeof t !== 'object') {
    problems.push({ source, id: null, title: null, issues: ['条目不是对象'] });
    return;
  }
  if (!Number.isFinite(t.id)) issues.push('id 无效（需要数字）');
  if (typeof t.title !== 'string') issues.push('title 无效（需要字符串）');
  if (t.status != null && !VALID_STATUSES.includes(t.status)) issues.push(`status 无效（${t.status}）`);
  if (t.pinStatus != null && !VALID_PINS.includes(t.pinStatus)) issues.push(`pinStatus 无效（${t.pinStatus}）`);
  if (t.manualOrder != null && !Number.isFinite(t.manualOrder)) issues.push('manualOrder 无效（需要数字）');
  if (!isNullableIso(t.dueDate)) issues.push('dueDate 无效（可为空或合法时间）');
  if (!isNullableIso(t.startDate)) issues.push('startDate 无效（可为空或合法时间）');
  if (!isNullableIso(t.createdAt)) issues.push('createdAt 无效（可为空或合法时间）');
  if (!isNullableIso(t.completedAt)) issues.push('completedAt 无效（可为空或合法时间）');
  if (t.tags != null && (!Array.isArray(t.tags) || t.tags.some(x => typeof x !== 'string'))) {
    issues.push('tags 无效（需要字符串数组）');
  }
  if (t.progress != null) {
    if (!Array.isArray(t.progress)) {
      issues.push('progress 无效（需要数组）');
    } else {
      t.progress.forEach((p, i) => {
        if (!p || typeof p !== 'object') {
          issues.push(`progress[${i}] 不是对象`);
          return;
        }
        if (!Number.isFinite(p.id)) issues.push(`progress[${i}].id 无效`);
        if (typeof p.text !== 'string') issues.push(`progress[${i}].text 无效`);
        if (p.status != null && !VALID_STATUSES.includes(p.status)) issues.push(`progress[${i}].status 无效`);
        if (!isNullableIso(p.createdAt)) issues.push(`progress[${i}].createdAt 无效`);
        if (!isNullableIso(p.completedAt)) issues.push(`progress[${i}].completedAt 无效`);
      });
    }
  }
  if (issues.length > 0) {
    problems.push({ source, id: t.id ?? null, title: typeof t.title === 'string' ? t.title : null, issues });
  }
}

function checkTodoArray(data, source, problems) {
  if (!Array.isArray(data)) {
    problems.push({ source, id: null, title: null, issues: ['数据不是数组'] });
    return 0;
  }
  data.forEach(t => checkTodo(t, source, problems));
  return data.length;
}

function checkSettings(data, source, problems) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) {
    problems.push({ source, id: null, title: null, issues: ['数据不是对象'] });
    return 0;
  }
  let issues = [];
  if (data.presetTags != null && !Array.isArray(data.presetTags)) {
    issues.push('presetTags 无效（需要数组）');
  }
  if (issues.length > 0) {
    problems.push({ source, id: null, title: null, issues });
  }
  return 1;
}

export function checkDataIntegrity() {
  const report = { checked: {}, problems: [] };

  const sources = [
    ['todo_app_data', '待办数据', checkTodoArray],
    ['todo_archive_data', '归档数据', checkTodoArray],
    ['todo_app_settings', '设置', checkSettings],
  ];

  for (const [key, label, checker] of sources) {
    let raw = null;
    try {
      raw = localStorage.getItem(key);
    } catch { /* ignore */ }
    if (raw == null) {
      report.checked[label] = 0;
      continue;
    }
    try {
      const parsed = JSON.parse(raw);
      report.checked[label] = checker(parsed, label, report.problems);
    } catch (e) {
      report.checked[label] = 0;
      report.problems.push({ source: label, id: null, title: null, issues: [`JSON 解析失败：${e.message}`] });
    }
  }

  report.total = Object.values(report.checked).reduce((sum, n) => sum + n, 0);
  return report;
}
