import { useMemo } from 'react';
import {
  getLastWeekRange,
  getThisWeekRange,
  getCompletedLastWeek,
  getProgressedLastWeek,
  getNoProgressLastWeek,
  generateWeeklySummary,
  generateThisWeekSummary,
} from '../utils/weeklySummary';

function formatRange(range) {
  const s = range.start;
  const e = range.end;
  return `${s.getFullYear()}/${s.getMonth() + 1}/${s.getDate()} - ${e.getMonth() + 1}/${e.getDate()}`;
}

function WeekBlock({ label, range, todos, summaryGenerator }) {
  const completed = useMemo(() => getCompletedLastWeek(todos, range), [todos, range]);
  const progressed = useMemo(() => getProgressedLastWeek(todos, range), [todos, range]);
  const noProgress = useMemo(() => getNoProgressLastWeek(todos, range), [todos, range]);

  const summary = useMemo(
    () => summaryGenerator(completed, progressed, noProgress),
    [completed, progressed, noProgress, summaryGenerator]
  );

  const sections = [
    { key: 'completed', title: `${label}完成`, data: completed, color: 'var(--success)' },
    { key: 'progressed', title: `${label}推进`, data: progressed, color: 'var(--accent)' },
    { key: 'noProgress', title: `${label}无进展`, data: noProgress, color: 'var(--warn)' },
  ];

  return (
    <>
      <div className="weekly-header">
        <span className="weekly-title">{label} ({formatRange(range)})</span>
      </div>

      {summary && (
        <div className="weekly-summary">
          {summary.split('\n').map((line, i) => (
            <p key={i}>{line}</p>
          ))}
        </div>
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
            <div className="weekly-empty">暂无数据</div>
          )}
        </div>
      ))}
    </>
  );
}

export default function WeeklyReport({ todos }) {
  const thisWeekRange = useMemo(() => getThisWeekRange(), []);
  const lastWeekRange = useMemo(() => getLastWeekRange(), []);

  return (
    <div className="weekly-report">
      <WeekBlock label="本周" range={thisWeekRange} todos={todos} summaryGenerator={generateThisWeekSummary} />

      <div className="weekly-divider" />

      <WeekBlock label="上周" range={lastWeekRange} todos={todos} summaryGenerator={generateWeeklySummary} />

      <div className="scroll-spacer" />
    </div>
  );
}
