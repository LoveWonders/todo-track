import { useState, useRef, useEffect, useCallback } from 'react';
import { formatDate, formatDateTime, parseDateText, isoToDatetimeLocal } from '../utils/dateParser';
import { showNativeDatePicker } from '../utils/datePicker';

function isoToDateLocal(iso) {
  if (!iso) return '';
  return iso.length >= 10 ? iso.slice(0, 10) : '';
}

export default function DateEdit({ value, onSave, overdue, inBatch }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? '');
  const inputRef = useRef(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) { onSave(null); setEditing(false); return; }
    const parsed = parseDateText(trimmed);
    if (parsed) onSave(parsed);
    setEditing(false);
  }, [text, onSave]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
    else if (e.key === 'Escape') { setText(value ?? ''); setEditing(false); }
  }, [handleSave, value]);

  const openCalendar = useCallback(() => {
    const hasTime = typeof value === 'string' && value.includes('T') && /[1-9]/.test(value.slice(11, 13) + value.slice(14, 16));
    showNativeDatePicker({
      type: hasTime ? 'datetime-local' : 'date',
      value: hasTime ? isoToDatetimeLocal(value) : isoToDateLocal(value),
      onPick: (picked) => {
        if (!mountedRef.current) return;
        const iso = picked.length === 16 ? picked + ':00' : picked + 'T23:59:59';
        onSave(iso);
        setText(formatDateTime(iso));
        setEditing(false);
      },
    });
  }, [value, onSave]);

  const handleDateClick = useCallback((e) => {
    if (inBatch) { e.stopPropagation(); return; }
    setText(value ?? '');
    setEditing(true);
  }, [inBatch, value]);

  if (editing) {
    return (
      <span className="date-edit-wrap" onClick={inBatch ? e => e.stopPropagation() : undefined}>
        <input ref={inputRef} className="inline-edit-input date-edit" value={text}
          onChange={e => setText(e.target.value)} onBlur={handleSave} onKeyDown={handleKeyDown} placeholder="明天、5月前" />
        <button type="button" className="calendar-btn" onMouseDown={e => e.preventDefault()} onClick={openCalendar} title="选择日期">&#x1F4C5;</button>
      </span>
    );
  }

  return (
    <span className={`todo-date clickable ${overdue ? 'overdue-label' : ''}`} onClick={handleDateClick} title="点击编辑日期">
      {value ? formatDate(value) : '+ 日期'}
    </span>
  );
}
