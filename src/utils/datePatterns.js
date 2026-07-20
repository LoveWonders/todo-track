function endOfMonth(year, month) {
  return new Date(year, month + 1, 0);
}

export function toISODateTime(date) {
  if (!date) return null;
  const d = new Date(date);
  if (isNaN(d.getTime())) return null;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}:${ss}`;
}

export function extractDatePart(iso) {
  return typeof iso === 'string' && iso.length >= 10 ? iso.slice(0, 10) : '';
}

function nextWeekday(dayName, isNextWeek) {
  const dayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 0, '天': 0 };
  const targetDay = dayMap[dayName];
  if (targetDay === undefined) return null;
  const d = new Date();
  const currentDay = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (currentDay === 0 ? 6 : currentDay - 1));
  if (isNextWeek) monday.setDate(monday.getDate() + 7);
  monday.setDate(monday.getDate() + (targetDay === 0 ? 6 : targetDay - 1));
  return monday;
}

export const DATE_PATTERNS = [
  { regex: /(\d{4})[年\-.](\d{1,2})[月\-.](\d{1,2})[日号]?/, handler: (m) => new Date(+m[1], +m[2] - 1, +m[3]) },
  { regex: /大后天/, handler: () => { const d = new Date(); d.setDate(d.getDate() + 3); return d; } },
  { regex: /后天/, handler: () => { const d = new Date(); d.setDate(d.getDate() + 2); return d; } },
  { regex: /(今天|tomorrow|明天)/i, handler: (m) => {
    const map = { '今天': 0, 'tomorrow': 1, '明天': 1 };
    const d = new Date(); d.setDate(d.getDate() + (map[m[1].toLowerCase()] || 0)); return d;
  }},
  { regex: /(下?)周([一二三四五六日天])/, handler: (m) => nextWeekday(m[2], !!m[1]) },
  { regex: /(下?)星期([一二三四五六日天])/, handler: (m) => nextWeekday(m[2], !!m[1]) },
  { regex: /本周/, handler: () => { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay()) % 7); return d; } },
  { regex: /下周/, handler: () => { const d = new Date(); d.setDate(d.getDate() + (14 - d.getDay()) % 7 || 7); return d; } },
  { regex: /(\d+)月前/, handler: (m) => { const d = new Date(); d.setMonth(d.getMonth() - +m[1]); return d; } },
  { regex: /(\d+)月后/, handler: (m) => { const d = new Date(); d.setMonth(d.getMonth() + +m[1]); return d; } },
  { regex: /(\d+)周前/, handler: (m) => { const d = new Date(); d.setDate(d.getDate() - +m[1] * 7); return d; } },
  { regex: /(\d+)周后/, handler: (m) => { const d = new Date(); d.setDate(d.getDate() + +m[1] * 7); return d; } },
  { regex: /(\d+)天前/, handler: (m) => { const d = new Date(); d.setDate(d.getDate() - +m[1]); return d; } },
  { regex: /(\d+)天后/, handler: (m) => { const d = new Date(); d.setDate(d.getDate() + +m[1]); return d; } },
  { regex: /(\d{1,2})月底前?/, handler: (m) => {
    const now = new Date();
    const d = endOfMonth(now.getFullYear(), +m[1] - 1);
    return d < now ? endOfMonth(now.getFullYear() + 1, +m[1] - 1) : d;
  }},
  { regex: /([一二三四五六七八九十]{1,2})月底/, handler: (m) => {
    const map = { '一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'十一':11,'十二':12 };
    const month = map[m[1]];
    if (!month) return null;
    const now = new Date();
    const d = endOfMonth(now.getFullYear(), month - 1);
    return d < now ? endOfMonth(now.getFullYear() + 1, month - 1) : d;
  }},
  { regex: /(?<!\d)(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])(?!\d)/, handler: (m) => {
    const mm = +m[1], dd = +m[2];
    const now = new Date();
    const d = new Date(now.getFullYear(), mm - 1, dd);
    if (d < now) d.setFullYear(d.getFullYear() + 1);
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
  { regex: /(\d{1,2})[月\-.](\d{1,2})[日号]?/, handler: (m) => {
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

export function parseLocalDate(text) {
  if (!text || !text.trim()) return null;
  const trimmed = text.trim();
  for (const pattern of DATE_PATTERNS) {
    const m = trimmed.match(pattern.regex);
    if (m) {
      const d = pattern.handler(m);
      if (d) return d;
    }
  }
  return null;
}
