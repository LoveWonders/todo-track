import { useState, useEffect, useRef, useCallback } from 'react';
import { formatDate } from '../utils/dateParser';

function extractDatePart(iso) {
  return typeof iso === 'string' && iso.length >= 10 ? iso.slice(0, 10) : '';
}

function formatDisplayText(start, end) {
  if (!end) return '';
  if (start && start !== end) {
    return `${formatDate(start)} ~ ${formatDate(end)}`;
  }
  return formatDate(end);
}

export function useCalendarLogic(startDate, dueDate, onDateRangeChange) {
  const [dateText, setDateText] = useState('');
  const pickerRef = useRef(null);
  const editingRef = useRef('end');
  const onChangeRef = useRef(onDateRangeChange);
  const startRef = useRef(startDate);
  const endRef = useRef(dueDate);
  onChangeRef.current = onDateRangeChange;

  useEffect(() => {
    startRef.current = startDate;
    endRef.current = dueDate;
    setDateText(formatDisplayText(startDate, dueDate));
  }, [startDate, dueDate]);

  useEffect(() => {
    const input = document.createElement('input');
    input.type = 'date';
    input.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none';
    document.body.appendChild(input);
    pickerRef.current = input;

    return () => {
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
      pickerRef.current = null;
    };
  }, []);

  const syncInputValue = useCallback(() => {
    const input = pickerRef.current;
    if (!input) return;
    const ref = editingRef.current === 'start' ? startRef : endRef;
    input.value = ref.current ? extractDatePart(ref.current) : '';
  }, []);

  const openPicker = useCallback((target = 'end') => {
    const input = pickerRef.current;
    if (!input) return;
    editingRef.current = target;
    const refVal = target === 'start' ? startRef.current : endRef.current;
    input.value = refVal ? extractDatePart(refVal) : '';
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

    const nextStart = target === 'start' ? isoString : startRef.current;
    const nextEnd = target === 'end' ? isoString : endRef.current;

    setDateText(formatDisplayText(nextStart, nextEnd));
    startRef.current = nextStart;
    endRef.current = nextEnd;

    onChangeRef.current?.({ start: nextStart, end: nextEnd });
  }, []);

  return { dateText, setDateText, pickerRef, openPicker, handleCalendarPick };
}
