import { useState, useRef, useEffect } from 'react';
import { SORT_CREATED, SORT_DUE, SORT_MANUAL, SORT_MODE_LABELS } from '../utils/sortTodos';

const OPTIONS = [SORT_CREATED, SORT_DUE, SORT_MANUAL];

export default function SortMenu({ sortMode, onChange, onReset }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (mode) => {
    onChange(mode);
    setOpen(false);
  };

  const handleReset = () => {
    onReset();
    setOpen(false);
  };

  return (
    <div className="sort-menu" ref={menuRef}>
      <button
        type="button"
        className={`sort-menu-btn ${open ? 'open' : ''}`}
        onClick={() => setOpen(v => !v)}
        title="排序"
        aria-label="排序"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 6h13M8 12h9M8 18h5" />
          <path d="M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
        <span className="sort-menu-label">{SORT_MODE_LABELS[sortMode] || SORT_MODE_LABELS[SORT_CREATED]}</span>
      </button>
      {open && (
        <div className="sort-menu-dropdown">
          {OPTIONS.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`sort-menu-item ${sortMode === mode ? 'active' : ''}`}
              onClick={() => handleSelect(mode)}
            >
              {SORT_MODE_LABELS[mode]}
            </button>
          ))}
          {sortMode === SORT_MANUAL && (
            <button
              type="button"
              className="sort-menu-item sort-menu-reset"
              onClick={handleReset}
            >
              重置排序
            </button>
          )}
        </div>
      )}
    </div>
  );
}
