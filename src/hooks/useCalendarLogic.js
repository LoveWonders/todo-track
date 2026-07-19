import { useState, useEffect, useRef, useCallback } from 'react';
import * as chrono from 'chrono-node';

function extractDatePart(iso) {
  return typeof iso === 'string' && iso.length >= 10 ? iso.slice(0, 10) : '';
}

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

function parseLocalDate(text) {
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
      if (m[1] === '下') monday.setDate(monday.getDate() + 7);
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
      if (m[1] === '下') monday.setDate(monday.getDate() + 7);
      monday.setDate(monday.getDate() + (targetDay === 0 ? 6 : targetDay - 1));
      return monday;
    }},
    { regex: /本周/, handler: () => { const d = new Date(); d.setDate(d.getDate() + (7 - d.getDay()) % 7); return d; } },
    { regex: /下周/, handler: () => { const d = new Date(); d.setDate(d.getDate() + (14 - d.getDay()) % 7 || 7); return d; } },
    { regex: /(\d+)月前/, handler: (m) => { const d = new Date(); d.setMonth(d.getMonth() - +m[1]); return d; } },
    { regex: /(\d+)月后/, handler: (m) => { const d = new Date(); d.setMonth(d.getMonth() + +m[1]); return d; } },
    { regex: /(\d+)周前/, handler: (m) => { const d = new Date(); d.setDate(d.getDate() - +m[1] * 7); return d; } },
    { regex: /(\d+)周后/, handler: (m) => { const d = new Date(); d.setDate(d.getDate() + +m[1] * 7); return d; } },
    { regex: /(\d+)天前/, handler: (m) => { const d = new Date(); d.setDate(d.getDate() - +m[1]); return d; } },
    { regex: /(\d+)天后/, handler: (m) => { const d = new Date(); d.setDate(d.getDate() + +m[1]); return d; } },
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
  ];

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

export function useCalendarLogic(startDate, dueDate, onDateRangeChange) {
  const [currentStart, setCurrentStart] = useState(null);
  const [currentEnd, setCurrentEnd] = useState(null);
  const pickerRef = useRef(null);
  const editingRef = useRef('end');
  const onChangeRef = useRef(onDateRangeChange);
  const currentStartRef = useRef(currentStart);
  const currentEndRef = useRef(currentEnd);
  onChangeRef.current = onDateRangeChange;

  useEffect(() => {
    currentStartRef.current = startDate;
    currentEndRef.current = dueDate;
    setCurrentStart(startDate);
    setCurrentEnd(dueDate);
  }, [startDate, dueDate]);

  const emitChange = useCallback((start, end) => {
    setCurrentStart(start);
    setCurrentEnd(end);
    currentStartRef.current = start;
    currentEndRef.current = end;
    onChangeRef.current?.({ start, end });
  }, []);

  const tryParseDateText = useCallback((text) => {
    if (!text || !text.trim()) return false;
    console.log('[tryParseDateText] 尝试解析:', text);

    try {
      const results = chrono.zh.parse(text, new Date(), { forwardDate: true });
      console.log('[tryParseDateText] chrono.zh 结果:', results.length, '条');

      if (results.length > 0) {
        const parsed = results[0];
        if (parsed.start) {
          const hasRange = parsed.end && parsed.end.date().getTime() !== parsed.start.date().getTime();
          const end = toISODateTime((parsed.end || parsed.start).date());
          const start = hasRange ? toISODateTime(parsed.start.date()) : null;
          console.log('[tryParseDateText] chrono 成功, start:', start, ', end:', end);
          emitChange(start, end);
          return true;
        }
      }

      const fallback = parseLocalDate(text);
      if (fallback) {
        const iso = toISODateTime(fallback);
        console.log('[tryParseDateText] 本地 fallback 成功:', iso);
        emitChange(null, iso);
        return true;
      }

      console.log('[tryParseDateText] 所有解析失败');
    } catch (e) {
      console.log('[tryParseDateText] 异常:', e);
      const fallback = parseLocalDate(text);
      if (fallback) {
        const iso = toISODateTime(fallback);
        emitChange(null, iso);
        return true;
      }
    }

    return false;
  }, [emitChange]);

  const openPicker = useCallback((target = 'end') => {
    const input = pickerRef.current;
    if (!input) return;
    editingRef.current = target;
    const current = target === 'start' ? currentStartRef.current : currentEndRef.current;
    input.value = current ? extractDatePart(current) : '';
    requestAnimationFrame(() => {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.focus();
      }
    });
  }, []);

  const handleCalendarPick = useCallback((e) => {
    const picked = e.target.value;
    if (!picked) return;

    const isoString = picked + 'T23:59:59';
    const target = editingRef.current;

    const nextStart = target === 'start' ? isoString : currentStartRef.current;
    const nextEnd = target === 'end' ? isoString : currentEndRef.current;

    emitChange(nextStart, nextEnd);
  }, [emitChange]);

  return {
    startDate: currentStart,
    dueDate: currentEnd,
    pickerRef,
    openPicker,
    handleCalendarPick,
    tryParseDateText
  };
}
