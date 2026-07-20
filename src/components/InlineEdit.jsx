import { useState, useRef, useEffect, useCallback } from 'react';

export default function InlineEdit({ value, onSave, className, placeholder, style, inBatch }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value ?? '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== value) onSave(trimmed);
    setEditing(false);
  }, [text, value, onSave]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSave(); }
    else if (e.key === 'Escape') { setText(value ?? ''); setEditing(false); }
  }, [handleSave, value]);

  const handleClick = useCallback((e) => {
    if (inBatch) { e.stopPropagation(); return; }
    setText(value ?? '');
    setEditing(true);
  }, [inBatch, value]);

  if (editing) {
    return (
      <input ref={inputRef} className={`inline-edit-input ${className ?? ''}`}
        value={text} onChange={e => setText(e.target.value)}
        onBlur={handleSave} onKeyDown={handleKeyDown}
        placeholder={placeholder} style={style} />
    );
  }

  return (
    <span className={`inline-edit-text ${className ?? ''}`} onClick={handleClick} style={style}>
      {value || placeholder || '点击设置'}
    </span>
  );
}
