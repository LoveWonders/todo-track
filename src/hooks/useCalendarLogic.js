import { useState, useEffect, useRef, useCallback } from 'react';

function extractDatePart(iso) {
  return typeof iso === 'string' && iso.length >= 10 ? iso.slice(0, 10) : '';
}

export function useCalendarLogic(startDate, dueDate, onDateRangeChange) {
  const [currentStart, setCurrentStart] = useState(null);
  const [currentEnd, setCurrentEnd] = useState(null);
  const pickerRef = useRef(null);
  const editingRef = useRef('end');
  const onChangeRef = useRef(onDateRangeChange);
  onChangeRef.current = onDateRangeChange;

  useEffect(() => {
    setCurrentStart(startDate);
    setCurrentEnd(dueDate);
  }, [startDate, dueDate]);

  const openPicker = useCallback((target = 'end') => {
    const input = pickerRef.current;
    if (!input) return;
    editingRef.current = target;
    const val = target === 'start' ? currentStart : currentEnd;
    input.value = val ? extractDatePart(val) : '';
    requestAnimationFrame(() => {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.focus();
      }
    });
  }, [currentStart, currentEnd]);

  const handleCalendarPick = useCallback((e) => {
    const picked = e.target.value;
    if (!picked) return;

    const isoString = picked + 'T23:59:59';
    const target = editingRef.current;

    const nextStart = target === 'start' ? isoString : currentStart;
    const nextEnd = target === 'end' ? isoString : currentEnd;

    setCurrentStart(nextStart);
    setCurrentEnd(nextEnd);
    onChangeRef.current?.({ start: nextStart, end: nextEnd });
  }, [currentStart, currentEnd]);

  return {
    startDate: currentStart,
    dueDate: currentEnd,
    pickerRef,
    openPicker,
    handleCalendarPick
  };
}
