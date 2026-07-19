import * as chrono from 'chrono-node';

function toISODateTime(date) {
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

function endOfMonth(year, month) {
  return new Date(year, month + 1, 0);
}

const DATE_PATTERNS = [
  { regex: /(\d{4})[年\-.](\d{1,2})[月\-.](\d{1,2})[日号]?/, handler: (m) => new Date(+m[1], +m[2] - 1, +m[3]) },
  { regex: /大后天/, handler: () => { const d = new Date(); d.setDate(d.getDate() + 3); return d; } },
  { regex: /后天/, handler: () => { const d = new Date(); d.setDate(d.getDate() + 2); return d; } },
  { regex: /(今天|tomorrow|明天)/i, handler: (m) => {
    const map = { '今天': 0, 'tomorrow': 1, '明天': 1 };
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
  { regex: /([一二三四五六七八九十]{1,2})月底/, handler: (m) => {
    const map = { '一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10,'十一':11,'十二':12 };
    const month = map[m[1]];
    if (!month) return null;
    const now = new Date();
    const d = endOfMonth(now.getFullYear(), month - 1);
    if (d < now) return endOfMonth(now.getFullYear() + 1, month - 1);
    return d;
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

function parseDateText(text) {
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

/**
 * parseSmartInput: 智能输入解析器，先从 chrono.zh 解析，失败则回退到本地 DATE_PATTERNS
 */
export function parseSmartInput(rawText) {
  const tags = [];
  let startDate = null;
  let dueDate = null;
  let text = rawText;

  const tagRegex = /#(\S+)/g;
  let tagMatch;
  while ((tagMatch = tagRegex.exec(text)) !== null) {
    tags.push(tagMatch[1]);
  }
  text = text.replace(tagRegex, '').trim();

  const dateMatch = text.match(/@(\S+)/);
  if (dateMatch) {
    const dateText = dateMatch[1];
    console.log('[parseSmartInput] 尝试解析日期文本:', dateText);

    try {
      const results = chrono.zh.parse(dateText, new Date(), { forwardDate: true });
      console.log('[parseSmartInput] chrono.zh 解析结果:', results.length, '条');

      if (results.length > 0) {
        const parsed = results[0];
        if (parsed.start) {
          const hasRange = parsed.end && parsed.end.date().getTime() !== parsed.start.date().getTime();
          dueDate = toISODateTime((parsed.end || parsed.start).date());
          startDate = hasRange ? toISODateTime(parsed.start.date()) : null;
          console.log('[parseSmartInput] chrono 解析成功, dueDate:', dueDate, ', startDate:', startDate);
        }
      }

      if (dueDate === null) {
        const fallbackDate = parseDateText(dateText);
        if (fallbackDate) {
          dueDate = toISODateTime(fallbackDate);
          console.log('[parseSmartInput] 本地 fallback 解析成功, dueDate:', dueDate);
        } else {
          console.log('[parseSmartInput] 所有解析失败，无法识别日期文本:', dateText);
        }
      }
    } catch (e) {
      console.log('[parseSmartInput] chrono 异常:', e);
      const fallbackDate = parseDateText(dateText);
      if (fallbackDate) {
        dueDate = toISODateTime(fallbackDate);
        console.log('[parseSmartInput] 异常 fallback 解析成功, dueDate:', dueDate);
      }
    }

    text = text.replace(/@(\S+)/, '').trim();
  }

  console.log('[parseSmartInput] 最终结果 cleanContent:', text, ', dueDate:', dueDate, ', tags:', tags);

  return {
    cleanContent: text,
    startDate,
    dueDate,
    tags
  };
}
