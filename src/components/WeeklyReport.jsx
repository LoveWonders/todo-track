import { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import {
  getLastWeekRange,
  getThisWeekRange,
  getCompletedLastWeek,
  getProgressedLastWeek,
  getNoProgressLastWeek,
} from '../utils/weeklySummary';
import { copyToClipboard } from '../utils/clipboard';

function formatRange(range) {
  const s = range.start;
  const e = range.end;
  return `${s.getMonth() + 1}/${s.getDate()} - ${e.getMonth() + 1}/${e.getDate()}`;
}

function buildCopyText(label, range, completed, progressed, noProgress) {
  const lines = [];
  lines.push(`${label}工作汇报 (${formatRange(range)})`);

  lines.push(`一、已完成 (${completed.length})`);
  if (completed.length === 0) {
    lines.push('- 暂无');
  } else {
    completed.forEach(t => lines.push(`- ${t.title}`));
  }

  lines.push(`二、进行中 (${progressed.length})`);
  if (progressed.length === 0) {
    lines.push('- 暂无');
  } else {
    progressed.forEach(t => lines.push(`- ${t.title}`));
  }

  lines.push(`三、无进展 (${noProgress.length})`);
  if (noProgress.length === 0) {
    lines.push('- 暂无');
  } else {
    noProgress.forEach(t => lines.push(`- ${t.title}`));
  }

  return lines.join('\n');
}

function WeekBlock({ label, labelKey, range, todos, activeTags, filterProps }) {
  const completedAll = useMemo(() => getCompletedLastWeek(todos, range), [todos, range]);
  const progressedAll = useMemo(() => getProgressedLastWeek(todos, range), [todos, range]);
  const noProgressAll = useMemo(() => getNoProgressLastWeek(todos, range), [todos, range]);

  const filterByTags = useCallback((list) =>
    activeTags.length > 0 ? list.filter(t => (t.tags || []).some(tag => activeTags.includes(tag))) : list
  , [activeTags]);

  const completed = useMemo(() => filterByTags(completedAll), [filterByTags, completedAll]);
  const progressed = useMemo(() => filterByTags(progressedAll), [filterByTags, progressedAll]);
  const noProgress = useMemo(() => filterByTags(noProgressAll), [filterByTags, noProgressAll]);
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    const text = buildCopyText(label, range, completed, progressed, noProgress);
    setCopied(true);
    try {
      await copyToClipboard(text);
    } catch {
      // clipboard failed silently
    }
    setTimeout(() => setCopied(false), 3000);
  }, [label, range, completed, progressed, noProgress]);

  const sections = [
    { key: 'completed', title: '已完成', data: completed, color: 'var(--success)' },
    { key: 'progressed', title: '进行中', data: progressed, color: 'var(--accent)' },
    { key: 'noProgress', title: '无进展', data: noProgress, color: 'var(--warn)' },
  ];

  const total = completed.length + progressed.length + noProgress.length;
  const dropdownOpen = filterProps.openFor === labelKey;

  return (
    <>
      <div className="weekly-header">
        <span className="weekly-title">{label} ({formatRange(range)})</span>
        <div className="weekly-header-actions">
          <div className="filter-wps-wrap weekly-filter-wrap">
            <button
              className={`filter-btn-wps ${activeTags.length > 0 || dropdownOpen ? 'active' : ''}`}
              onClick={() => filterProps.onToggle(labelKey)}
              title="按标签筛选"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
            </button>

            {dropdownOpen && (
              <div className="filter-dropdown">
                <div className="filter-dropdown-list">
                  {filterProps.allTags.length === 0 ? (
                    <div className="filter-dropdown-empty">暂无标签</div>
                  ) : (
                    filterProps.allTags.map(tag => (
                      <label key={tag} className="filter-dropdown-item">
                        <input
                          type="checkbox"
                          checked={filterProps.draftTags.includes(tag)}
                          onChange={() => filterProps.onCheck(tag)}
                        />
                        <span className="filter-dropdown-label">#{tag}</span>
                      </label>
                    ))
                  )}
                </div>
                {filterProps.allTags.length > 0 && (
                  <div className="filter-dropdown-footer">
                    <button
                      className="btn-mini btn-mini-save filter-footer-btn"
                      onClick={filterProps.onSelectAll}
                    >
                      全选
                    </button>
                    <button
                      className="btn-mini btn-mini-cancel filter-footer-btn"
                      onClick={filterProps.onInvert}
                    >
                      反选
                    </button>
                    <button
                      className="btn-mini btn-mini-cancel filter-footer-btn"
                      onClick={filterProps.onClearDraft}
                    >
                      清空
                    </button>
                    <button
                      className="btn-mini btn-mini-save filter-footer-btn"
                      onClick={filterProps.onConfirm}
                    >
                      确定
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
          <button className="weekly-copy-btn" onClick={handleCopy}>
            {copied ? '已复制' : '复制'}
          </button>
        </div>
      </div>

      <div className="weekly-stats">
        <span className="weekly-stat" style={{ color: 'var(--success)' }}>完成 {completed.length}</span>
        <span className="weekly-stat-sep">/</span>
        <span className="weekly-stat" style={{ color: 'var(--accent)' }}>推进 {progressed.length}</span>
        <span className="weekly-stat-sep">/</span>
        <span className="weekly-stat" style={{ color: 'var(--warn)' }}>无进展 {noProgress.length}</span>
      </div>

      {activeTags.length > 0 && total === 0 && (
        <div className="weekly-empty-tip">当前标签下暂无周报内容</div>
      )}

      {sections.map(section => (
        <div key={section.key} className="weekly-section">
          <div className="weekly-section-header" style={{ borderLeftColor: section.color }}>
            <span className="weekly-section-title">{section.title}</span>
            <span className="weekly-section-count">{section.data.length}</span>
          </div>
          {section.data.length > 0 ? (
            <ul className="weekly-list">
              {section.data.map(todo => (
                <li key={todo.id} className="weekly-item">
                  <span className="weekly-item-title">{todo.title}</span>
                  {todo.tags.length > 0 && (
                    <span className="weekly-item-tags">
                      {todo.tags.map(tag => (
                        <span key={tag} className="todo-tag">#{tag}</span>
                      ))}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <div className="weekly-empty">暂无</div>
          )}
        </div>
      ))}
    </>
  );
}

export default function WeeklyReport({ todos }) {
  const thisWeekRange = useMemo(() => getThisWeekRange(), []);
  const lastWeekRange = useMemo(() => getLastWeekRange(), []);
  const [activeTags, setActiveTags] = useState([]);
  const [draftTags, setDraftTags] = useState([]);
  const [openFor, setOpenFor] = useState(null);

  const allTags = useMemo(() => [...new Set(todos.flatMap(t => t.tags || []))].sort(), [todos]);

  useEffect(() => {
    if (!openFor) return;
    const handler = (e) => {
      if (!e.target.closest('.weekly-filter-wrap')) {
        setOpenFor(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openFor]);

  const handleToggleFilter = useCallback((labelKey) => {
    setOpenFor(prev => {
      if (prev === labelKey) return null;
      return labelKey;
    });
    if (openFor !== labelKey) {
      setDraftTags([...activeTags]);
    }
  }, [openFor, activeTags]);

  const handleCheck = useCallback((tag) => {
    setDraftTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }, []);

  const handleConfirm = useCallback(() => {
    setActiveTags(draftTags);
    setOpenFor(null);
  }, [draftTags]);

  const handleClearDraft = useCallback(() => {
    setDraftTags([]);
  }, []);

  const handleSelectAll = useCallback(() => {
    setDraftTags([...allTags]);
  }, [allTags]);

  const handleInvert = useCallback(() => {
    setDraftTags(prev => allTags.filter(tag => !prev.includes(tag)));
  }, [allTags]);

  const filterProps = useMemo(() => ({
    openFor, allTags, draftTags,
    onToggle: (labelKey) => handleToggleFilter(labelKey),
    onCheck: handleCheck,
    onConfirm: handleConfirm,
    onClearDraft: handleClearDraft,
    onSelectAll: handleSelectAll,
    onInvert: handleInvert,
  }), [openFor, allTags, draftTags, handleToggleFilter, handleCheck, handleConfirm, handleClearDraft, handleSelectAll, handleInvert]);

  return (
    <div className="weekly-report">
      <WeekBlock label="本周" labelKey="this" range={thisWeekRange} todos={todos} activeTags={activeTags} filterProps={filterProps} />

      <div className="weekly-divider" />

      <WeekBlock label="上周" labelKey="last" range={lastWeekRange} todos={todos} activeTags={activeTags} filterProps={filterProps} />

      <div className="scroll-spacer" />
    </div>
  );
}
