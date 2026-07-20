import { useState, useRef, useEffect, useCallback } from 'react';
import { formatDate, parseDateText } from '../utils/dateParser';

export default function DateEdit({ value, onSave, overdue, inBatch }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) { onSave(null); setEditing(false); return; }
    const parsed = parseDateText(trimmed);
    if (parsed) onSave(parsed);
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
    else if (e.key === 'Escape') { setText(value || ''); setEditing(false); }
  };

  const openCalendar = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'date';
    input.value = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
    input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0';
    document.body.appendChild(input);

    const cleanup = () => {
      if (document.body.contains(input)) document.body.removeChild(input);
      setEditing(false);
    };

    input.addEventListener('change', (e) => {
      const picked = e.target.value;
      if (picked) { onSave(picked); setText(picked); }
      cleanup();
    });
    input.addEventListener('blur', () => { setTimeout(cleanup, 200); });

    requestAnimationFrame(() => {
      typeof input.showPicker === 'function' ? input.showPicker() : input.focus();
    });
  }, [value, onSave]);

  const handleDateClick = (e) => {
    if (inBatch) { e.stopPropagation(); return; }
    setText(value || '');
    setEditing(true);
  };

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
