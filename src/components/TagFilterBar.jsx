import { useState, useRef, useEffect, useCallback } from 'react';

const SLOTS_KEY = 'todo_filter_slots';

const DEFAULT_SLOTS = [
  { id: 1, name: '紧急', ruleType: 'include', tags: ['紧急'] },
  { id: 2, name: '长期', ruleType: 'include', tags: ['长期'] },
  { id: 3, name: '长期', ruleType: 'exclude', tags: ['长期'] },
];

function loadSlots() {
  try {
    const raw = localStorage.getItem(SLOTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return DEFAULT_SLOTS;
}

function saveSlots(slots) {
  try { localStorage.setItem(SLOTS_KEY, JSON.stringify(slots)); } catch { /* ignore */ }
}

function buildSlotLabel(slot) {
  const prefix = slot.ruleType === 'exclude' ? '!' : '#';
  return slot.tags.map(t => prefix + t).join(' + ');
}

export default function TagFilterBar({ allTags, onFilterChange }) {
  const [slots, setSlots] = useState(loadSlots);
  const [activeSlotId, setActiveSlotId] = useState(null);
  const [wpsTags, setWpsTags] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [tooltipSlot, setTooltipSlot] = useState(null);
  const [saveMenuOpen, setSaveMenuOpen] = useState(false);
  const [undoSlot, setUndoSlot] = useState(null);
  const saveMenuRef = useRef(null);
  const slotRefs = useRef({});
  const barRef = useRef(null);
  const undoTimerRef = useRef(null);

  useEffect(() => {
    saveSlots(slots);
  }, [slots]);

  useEffect(() => {
    return () => {
      if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!dropdownOpen) return;
    const handler = (e) => {
      if (barRef.current && !barRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [dropdownOpen]);

  useEffect(() => {
    if (!saveMenuOpen) return;
    const handler = (e) => {
      if (saveMenuRef.current && !saveMenuRef.current.contains(e.target)) {
        setSaveMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [saveMenuOpen]);

  const emitFilter = useCallback((mode, includeTags, excludeTags) => {
    if (mode === 'all') {
      onFilterChange({ includeTags: [], excludeTags: [] });
      return;
    }
    onFilterChange({ includeTags, excludeTags });
  }, [onFilterChange]);

  const handleAllClick = () => {
    confirmUndo();
    setActiveSlotId(null);
    setWpsTags([]);
    setDropdownOpen(false);
    emitFilter('all', [], []);
  };

  const handleToggleWpsDropdown = () => {
    if (dropdownOpen) {
      setDropdownOpen(false);
    } else {
      setActiveSlotId(null);
      setDropdownOpen(true);
    }
  };

  const handleWpsCheck = (tag) => {
    setWpsTags(prev => {
      const next = prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag];
      emitFilter('wps', next, []);
      return next;
    });
  };

  const handleSlotClick = (slot) => {
    confirmUndo();
    setActiveSlotId(slot.id);
    setWpsTags([]);
    setDropdownOpen(false);
    const includeTags = slot.ruleType === 'include' ? slot.tags : [];
    const excludeTags = slot.ruleType === 'exclude' ? slot.tags : [];
    emitFilter('slot', includeTags, excludeTags);
  };

  const confirmUndo = useCallback(() => {
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setUndoSlot(null);
  }, []);

  const handleClearSlot = (slotId) => {
    confirmUndo();
    const slot = slots.find(s => s.id === slotId);
    if (!slot || slot.tags.length === 0) return;
    setUndoSlot({ slotId, prevSlot: { ...slot } });
    setSlots(prev => prev.map(s => s.id === slotId ? { ...s, name: '', ruleType: 'include', tags: [] } : s));
    if (activeSlotId === slotId) {
      handleAllClick();
    }
    undoTimerRef.current = setTimeout(() => {
      setUndoSlot(null);
    }, 5000);
  };

  const handleUndoClear = (slotId) => {
    if (!undoSlot || undoSlot.slotId !== slotId) return;
    if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
    setSlots(prev => prev.map(s => s.id === slotId ? undoSlot.prevSlot : s));
    setUndoSlot(null);
  };

  const handleSaveToSlot = (targetId) => {
    const newSlot = { id: targetId, name: wpsTags.join('+'), ruleType: 'include', tags: [...wpsTags] };
    setSlots(prev => prev.map(s => s.id === targetId ? newSlot : s));
    setSaveMenuOpen(false);
    setDropdownOpen(false);
  };

  const isAllActive = activeSlotId === null && wpsTags.length === 0;
  const isWpsActive = activeSlotId === null && wpsTags.length > 0;

  const renderSlotLabel = (slot) => {
    if (undoSlot && undoSlot.slotId === slot.id) {
      return (
        <span
          className="filter-slot-text filter-slot-undo"
          onClick={(e) => {
            e.stopPropagation();
            handleUndoClear(slot.id);
          }}
        >
          已清除，撤销
        </span>
      );
    }
    if (slot.tags.length === 0) return <span className="filter-slot-placeholder">空</span>;
    const text = buildSlotLabel(slot);
    return (
      <span
        className="filter-slot-text"
        ref={(el) => { if (el) slotRefs.current[slot.id] = el; }}
        onMouseEnter={() => {
          const el = slotRefs.current[slot.id];
          if (el && el.scrollWidth > el.clientWidth) {
            setTooltipSlot(slot.id);
          }
        }}
        onMouseLeave={() => setTooltipSlot(null)}
      >
        {text}
      </span>
    );
  };

  const hasWpsTags = wpsTags.length > 0;

  return (
    <div className="filter-bar-v2" ref={barRef}>
      <button
        className={`filter-btn-all ${isAllActive ? 'active' : ''}`}
        onClick={handleAllClick}
      >
        全部
      </button>

      <div className="filter-wps-wrap">
        <button
          className={`filter-btn-wps ${isWpsActive || dropdownOpen ? 'active' : ''}`}
          onClick={handleToggleWpsDropdown}
          title="筛选"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
        </button>

        {dropdownOpen && (
          <div className="filter-dropdown">
            <div className="filter-dropdown-list">
              {allTags.length === 0 ? (
                <div className="filter-dropdown-empty">暂无标签</div>
              ) : (
                allTags.map(tag => (
                  <label key={tag} className="filter-dropdown-item">
                    <input
                      type="checkbox"
                      checked={wpsTags.includes(tag)}
                      onChange={() => handleWpsCheck(tag)}
                    />
                    <span className="filter-dropdown-label">#{tag}</span>
                  </label>
                ))
              )}
            </div>
            {allTags.length > 0 && (
              <div className="filter-dropdown-footer">
                <button
                  className="btn-mini btn-add-progress"
                  disabled={!hasWpsTags}
                  onClick={() => {
                    const emptyIds = slots.filter(s => s.tags.length === 0).map(s => s.id);
                    if (emptyIds.length > 0) {
                      handleSaveToSlot(emptyIds[0]);
                    } else {
                      setSaveMenuOpen(!saveMenuOpen);
                    }
                  }}
                  style={{ opacity: hasWpsTags ? 1 : 0.4, fontSize: 11 }}
                >
                  固定当前筛选
                </button>
                {saveMenuOpen && (
                  <div className="filter-save-menu" ref={saveMenuRef}>
                    <span className="filter-save-menu-title">选择要覆盖的槽位</span>
                    {slots.map(s => (
                      <button
                        key={s.id}
                        className="filter-save-menu-item"
                        onClick={() => handleSaveToSlot(s.id)}
                      >
                        槽位 {s.id}{s.tags.length > 0 ? ` (${buildSlotLabel(s)})` : ' (空)'}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {slots.map(slot => (
        <div
          key={slot.id}
          className={`filter-slot ${activeSlotId === slot.id ? 'active' : ''}`}
          onClick={() => {
            if (slot.tags.length > 0) {
              handleSlotClick(slot);
            }
          }}
        >
          {renderSlotLabel(slot)}
          {slot.tags.length > 0 && (
            <span
              className="filter-slot-close"
              onClick={(e) => {
                e.stopPropagation();
                handleClearSlot(slot.id);
              }}
            >
              &times;
            </span>
          )}
          {tooltipSlot === slot.id && slot.tags.length > 0 && (
            <div className="filter-tooltip">
              {buildSlotLabel(slot)}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
