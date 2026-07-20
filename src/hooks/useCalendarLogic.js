import { useState, useEffect, useRef, useCallback } from 'react';
import * as chrono from 'chrono-node';
import { toISODateTime, extractDatePart, parseLocalDate } from '../utils/datePatterns';

const DEBUG = import.meta.env.DEV;
const log = DEBUG ? console.log.bind(console) : () => {};

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
    log('[tryParseDateText] 尝试解析:', text);

    try {
      const results = chrono.zh.parse(text, new Date(), { forwardDate: true });
      log('[tryParseDateText] chrono.zh 结果:', results.length, '条');

      if (results.length > 0) {
        const parsed = results[0];
        if (!parsed.start) return false;
        const hasRange = parsed.end && parsed.end.date().getTime() !== parsed.start.date().getTime();
        const end = toISODateTime((parsed.end || parsed.start).date());
        const start = hasRange ? toISODateTime(parsed.start.date()) : null;
        log('[tryParseDateText] chrono 成功, start:', start, ', end:', end);
        emitChange(start, end);
        return true;
      }
    } catch (e) {
      log('[tryParseDateText] chrono 异常:', e);
    }

    const fallback = parseLocalDate(text);
    if (fallback) {
      const iso = toISODateTime(fallback);
      log('[tryParseDateText] 本地 fallback 成功:', iso);
      emitChange(null, iso);
      return true;
    }

    log('[tryParseDateText] 所有解析失败');
    return false;
  }, [emitChange]);

  const openPicker = useCallback((target = 'end') => {
    const input = pickerRef.current;
    if (!input) return;
    editingRef.current = target;
    const current = target === 'start' ? currentStartRef.current : currentEndRef.current;
    input.value = current ? extractDatePart(current) : '';
    requestAnimationFrame(() => {
      typeof input.showPicker === 'function' ? input.showPicker() : input.focus();
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
