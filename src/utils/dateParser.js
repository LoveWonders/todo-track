const TAG_REGEX = /#(\S+)/g;

function endOfMonth(year, month) {
  return new Date(year, month + 1, 0);
}

const DATE_PATTERNS = [
  { regex: /(\d{4})[年\-\/.](\d{1,2})[月\-\/.](\d{1,2})[日号]?/, handler: (m) => new Date(+m[1], +m[2] - 1, +m[3]) },
  { regex: /(今天|tomorrow|明天|后天|大后天)/i, handler: (m) => {
    const map = { '今天': 0, 'tomorrow': 1, '明天': 1, '后天': 2, '大后天': 3 };
    const d = new Date(); d.setDate(d.getDate() + (map[m[1].toLowerCase()] || 0)); return d;
  }},
  { regex: /(下?)周([一二三四五六日天])/, handler: (m) => {
    const dayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
    const targetDay = dayMap[m[2]];
    if (targetDay === undefined) return null;
    const d = new Date();
    const currentDay = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    if (m[1] === '下') {
      monday.setDate(monday.getDate() + 7);
    }
    monday.setDate(monday.getDate() + (targetDay === 0 ? 6 : targetDay - 1));
    return monday;
  }},
  { regex: /(下?)星期([一二三四五六日天])/, handler: (m) => {
    const dayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
    const targetDay = dayMap[m[2]];
    if (targetDay === undefined) return null;
    const d = new Date();
    const currentDay = d.getDay();
    const monday = new Date(d);
    monday.setDate(d.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
    if (m[1] === '下') {
      monday.setDate(monday.getDate() + 7);
    }
    monday.setDate(monday.getDate() + (targetDay === 0 ? 6 : targetDay - 1));
    return monday;
  }},
  { regex: /本周/, handler: () => {
    const d = new Date();
    const diff = (7 - d.getDay()) % 7;
    d.setDate(d.getDate() + diff);
    return d;
  }},
  { regex: /下周/, handler: () => {
    const d = new Date();
    const diff = (14 - d.getDay()) % 7 || 7;
    d.setDate(d.getDate() + diff);
    return d;
  }},
  { regex: /(\d+)月前/, handler: (m) => { const d = new Date(); d.setMonth(d.getMonth() - +m[1]); return d; }},
  { regex: /(\d+)月后/, handler: (m) => { const d = new Date(); d.setMonth(d.getMonth() + +m[1]); return d; }},
  { regex: /(\d+)周前/, handler: (m) => { const d = new Date(); d.setDate(d.getDate() - +m[1] * 7); return d; }},
  { regex: /(\d+)周后/, handler: (m) => { const d = new Date(); d.setDate(d.getDate() + +m[1] * 7); return d; }},
  { regex: /(\d+)天前/, handler: (m) => { const d = new Date(); d.setDate(d.getDate() - +m[1]); return d; }},
  { regex: /(\d+)天后/, handler: (m) => { const d = new Date(); d.setDate(d.getDate() + +m[1]); return d; }},
  { regex: /(\d{1,2})月底前?/, handler: (m) => {
    const now = new Date();
    const d = endOfMonth(now.getFullYear(), +m[1] - 1);
    if (d < now) return endOfMonth(now.getFullYear() + 1, +m[1] - 1);
    return d;
  }},
  { regex: /(\d{1,2})月初/, handler: (m) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), +m[1] - 1, 1);
    if (d < now) d.setFullYear(d.getFullYear() + 1);
    return new Date(d.getFullYear(), +m[1] - 1, 1);
  }},
  { regex: /(下个?月)(\d{1,2})[日号]?/, handler: (m) => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(+m[2]);
    return d;
  }},
  { regex: /(\d{1,2})[月\-\/.](\d{1,2})[日号]?/, handler: (m) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), +m[1] - 1, +m[2]);
    if (d < now) d.setFullYear(d.getFullYear() + 1);
    return d;
  }},
  { regex: /(\d{1,2})[日号]/, handler: (m) => {
    const now = new Date();
    const d = new Date(now.getFullYear(), now.getMonth(), +m[1]);
    if (d < now) d.setMonth(d.getMonth() + 1);
    return d;
  }},
  { regex: /(\d{4})(\d{2})(\d{2})/, handler: (m) => {
    const y = +m[1], mo = +m[2], da = +m[3];
    if (mo < 1 || mo > 12 || da < 1 || da > 31) return null;
    const d = new Date(y, mo - 1, da);
    if (d.getMonth() !== mo - 1) return null;
    return d;
  }},
];

export function parseInput(text) {
  let cleaned = text;

  const tags = [];
  let tagMatch;
  while ((tagMatch = TAG_REGEX.exec(text)) !== null) {
    tags.push(tagMatch[1]);
  }

  cleaned = cleaned.replace(TAG_REGEX, '').trim();

  let dueDate = null;
  for (const pattern of DATE_PATTERNS) {
    const m = cleaned.match(pattern.regex);
    if (m) {
      dueDate = pattern.handler(m);
      if (dueDate) {
        cleaned = cleaned.replace(pattern.regex, '').trim();
        break;
      }
    }
  }

  cleaned = cleaned.replace(/\s+/g, ' ').trim();

  return { title: cleaned || text.replace(TAG_REGEX, '').trim(), dueDate, tags };
}

export function parseDateText(text) {
  if (!text || !text.trim()) return null;
  const trimmed = text.trim();
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) return trimmed;
  for (const pattern of DATE_PATTERNS) {
    const m = trimmed.match(pattern.regex);
    if (m) {
      const d = pattern.handler(m);
      if (d) return toDateString(d);
    }
  }
  return null;
}

export function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = Math.round((target - today) / 86400000);

  if (diff === 0) return '今天';
  if (diff === 1) return '明天';
  if (diff === 2) return '后天';
  if (diff === -1) return '昨天';
  if (diff < 0) return `已过期${Math.abs(diff)}天`;

  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function isOverdue(date) {
  if (!date) return false;
  const d = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return d < today;
}

export function toDateString(date) {
  if (!date) return '';
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
