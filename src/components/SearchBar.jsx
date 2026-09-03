import { useRef, useEffect } from 'react';

export default function SearchBar({ value, onChange, onClose, placeholder = '搜索标题、内容、标签...' }) {
  const inputRef = useRef(null);

  useEffect(() => {
    const el = inputRef.current;
    if (el) el.focus();
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const el = inputRef.current;
        if (el) el.focus();
      }
      if (e.key === 'Escape' && onClose) {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="search-bar header-search-bar">
      <button className="search-bar-back" onClick={onClose} title="关闭搜索" aria-label="关闭搜索">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <input
        ref={inputRef}
        className="search-bar-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        spellCheck={false}
      />
      {value && (
        <button className="search-bar-clear" onClick={() => onChange('')} title="清除搜索">
          &#x2715;
        </button>
      )}
    </div>
  );
}
