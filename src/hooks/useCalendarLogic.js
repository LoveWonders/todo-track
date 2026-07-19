import { useState, useEffect, useRef, useCallback } from 'react';
import { formatDate } from '../utils/dateParser';

function extractDatePart(iso) {
  return typeof iso === 'string' && iso.length >= 10 ? iso.slice(0, 10) : '';
}

export function useCalendarLogic(initialDate) {
  const [dateText, setDateText] = useState('');
  const pickerRef = useRef(null);
  const callbackRef = useRef(null);

  useEffect(() => {
    setDateText(initialDate ? formatDate(initialDate) : '');
  }, [initialDate]);

  useEffect(() => {
    const input = document.createElement('input');
    input.type = 'date';
    input.style.cssText =
      'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none';

    const handleChange = (e) => {
      const picked = e.target.value;
      if (picked) {
        const isoString = picked + 'T23:59:59';
        setDateText(formatDate(isoString));
        callbackRef.current?.(picked);
      }
    };

    input.addEventListener('change', handleChange);
    document.body.appendChild(input);
    pickerRef.current = input;

    return () => {
      input.removeEventListener('change', handleChange);
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
      pickerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (pickerRef.current) {
      pickerRef.current.value = initialDate ? extractDatePart(initialDate) : '';
    }
  }, [initialDate]);

  const openPicker = useCallback(() => {
    const input = pickerRef.current;
    if (!input) return;
    if (initialDate) {
      input.value = extractDatePart(initialDate);
    }
    requestAnimationFrame(() => {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.focus();
      }
    });
  }, [initialDate]);

  const handleCalendarPick = useCallback((callback) => {
    callbackRef.current = callback;
  }, []);

  return { dateText, setDateText, pickerRef, openPicker, handleCalendarPick };
}
