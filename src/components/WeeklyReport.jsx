import { useMemo, useState, useCallback } from 'react';
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

function WeekBlock({ label, range, todos, activeTag }) {
  const completedAll = useMemo(() => getCompletedLastWeek(todos, range), [todos, range]);
  const progressedAll = useMemo(() => getProgressedLastWeek(todos, range), [todos, range]);
  const noProgressAll = useMemo(() => getNoProgressLastWeek(todos, range), [todos, range]);

  const filterByTag = useCallback((list) =>
    activeTag ? list.filter(t => (t.tags || []).includes(activeTag)) : list
  , [activeTag]);

  const completed = useMemo(() => filterByTag(completedAll), [filterByTag, completedAll]);
  const progressed = useMemo(() => filterByTag(progressedAll), [filterByTag, progressedAll]);
  const noProgress = useMemo(() => filterByTag(noProgressAll), [filterByTag, noProgressAll]);
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

  return (
    <>
      <div className="weekly-header">
        <span className="weekly-title">{label} ({formatRange(range)})</span>
        <button className="weekly-copy-btn" onClick={handleCopy}>
          {copied ? '已复制' : '复制汇报'}
        </button>
      </div>

      <div className="weekly-stats">
        <span className="weekly-stat" style={{ color: 'var(--success)' }}>完成 {completed.length}</span>
        <span className="weekly-stat-sep">/</span>
        <span className="weekly-stat" style={{ color: 'var(--accent)' }}>推进 {progressed.length}</span>
        <span className="weekly-stat-sep">/</span>
        <span className="weekly-stat" style={{ color: 'var(--warn)' }}>无进展 {noProgress.length}</span>
      </div>

      {activeTag && total === 0 && (
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
  const [activeTag, setActiveTag] = useState(null);

  const allTags = useMemo(() => [...new Set(todos.flatMap(t => t.tags || []))].sort(), [todos]);

  return (
    <div className="weekly-report">
      {allTags.length > 0 && (
        <div className="filter-bar weekly-filter-bar">
          <button
            className={`filter-chip ${activeTag === null ? 'active' : ''}`}
            onClick={() => setActiveTag(null)}
          >
            全部
          </button>
          {allTags.map(tag => (
            <button
              key={tag}
              className={`filter-chip ${activeTag === tag ? 'active' : ''}`}
              onClick={() => setActiveTag(activeTag === tag ? null : tag)}
            >
              #{tag}
            </button>
          ))}
        </div>
      )}

      <WeekBlock label="本周" range={thisWeekRange} todos={todos} activeTag={activeTag} />

      <div className="weekly-divider" />

      <WeekBlock label="上周" range={lastWeekRange} todos={todos} activeTag={activeTag} />

      <div className="scroll-spacer" />
    </div>
  );
}
