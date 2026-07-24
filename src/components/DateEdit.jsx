import { useState, useRef, useEffect, useCallback } from 'react';
import { formatDate, formatDateTime, parseDateText } from '../utils/dateParser';

function isoToDatetimeLocal(iso) {
  if (!iso) return '';
  return iso.length >= 16 ? iso.slice(0, 16) : iso.slice(0, 10);
}

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
    const input = document.createElement('input');
    const hasTime = typeof value === 'string' && value.includes('T') && /[1-9]/.test(value.slice(11, 13) + value.slice(14, 16));
    input.type = hasTime ? 'datetime-local' : 'date';
    input.value = hasTime ? isoToDatetimeLocal(value) : isoToDateLocal(value);
    input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0';
    document.body.appendChild(input);

    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      if (document.body.contains(input)) document.body.removeChild(input);
      if (!mountedRef.current) return;
      setEditing(false);
    };

    input.addEventListener('change', (e) => {
      const picked = e.target.value;
      if (picked) {
        const iso = picked.length === 16 ? picked + ':00' : picked + 'T23:59:59';
        onSave(iso);
        setText(formatDateTime(iso));
      }
      cleanup();
    }, { once: true });

    input.addEventListener('blur', () => { setTimeout(cleanup, 200); }, { once: true });

    requestAnimationFrame(() => {
      typeof input.showPicker === 'function' ? input.showPicker() : input.focus();
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
