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

  const handleDateTextBlur = useCallback((text) => {
    if (!text || !text.trim()) return false;
    try {
      const results = chrono.parse(text, new Date(), { forwardDate: true });
      if (results.length === 0) return false;
      const parsed = results[0];
      if (!parsed.start) return false;

      const hasRange = parsed.end && parsed.end.date().getTime() !== parsed.start.date().getTime();
      const end = toISODateTime((parsed.end || parsed.start).date());
      const start = hasRange ? toISODateTime(parsed.start.date()) : null;
      emitChange(start, end);
      return true;
    } catch {
      return false;
    }
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
    handleDateTextBlur
  };
}
