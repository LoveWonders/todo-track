import { useState, useEffect, useRef, useCallback } from 'react';
import { formatDateTime, isOverdue } from '../utils/dateParser';
import { URGENT_TAG } from '../constants';
import { CYCLE_LABELS, WEEKDAY_LABELS, anchorLabel, hasCycleDoneThisCycle } from '../utils/repeat';
import Countdown from './Countdown';
import DateEdit from './DateEdit';
import TagsEdit from './TagsEdit';
import ProgressLog from './ProgressLog';
import { useTodoActions } from '../hooks/TodoContext';
import { showNativeDatePicker } from '../utils/datePicker';

export default function TodoDetail({ todo, onClose }) {
  const { updateTodo, toggleStatus, completeTodo, setRepeatRule, setReminderTime, setReminderAt, setPinStatus, setFabHidden } = useTodoActions();
  const [editTitle, setEditTitle] = useState(false);
  const [title, setTitle] = useState(todo.title);
  const [showPinActions, setShowPinActions] = useState(false);
  const [autoSaved, setAutoSaved] = useState(false);
  const autoSaveTimerRef = useRef(null);

  const triggerAutoSave = useCallback(() => {
    setAutoSaved(true);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => setAutoSaved(false), 1500);
  }, []);

  const openTodoReminderPicker = useCallback(() => {
    showNativeDatePicker({
      type: 'datetime-local',
      value: todo.reminderAt ? todo.reminderAt.slice(0, 16) : '',
      onPick: (picked) => {
        if (picked) {
          setReminderAt(todo.id, `${picked}:00`);
          triggerAutoSave();
        }
      },
    });
  }, [todo.reminderAt, todo.id, setReminderAt, triggerAutoSave]);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setFabHidden(true);
    return () => setFabHidden(false);
  }, [setFabHidden]);

  const handleSaveTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== todo.title) updateTodo(todo.id, { title: trimmed });
    triggerAutoSave();
    setEditTitle(false);
  };

  const statusLabels = {
    active: '进行中',
    completed: '已完成',
    cancelled: '已作废',
  };

  return (
    <div className="modal-full-overlay" onClick={onClose}>
      {autoSaved && (
        <div className="autosave-toast">
          <span>已自动保存</span>
        </div>
      )}
      <div className="modal-full-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-full-header">
          <span className="modal-full-title">待办详情</span>
          <button className="modal-full-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-full-body" style={{ padding: '12px 16px' }}>
          <div className="detail-section">
            <div
              className="detail-title-area"
              onMouseEnter={() => setShowPinActions(true)}
              onMouseLeave={() => setShowPinActions(false)}
            >
              {editTitle ? (
                <div className="detail-title-edit">
                  <input
                    className="detail-title-input"
                    value={title}
                    onChange={e => setTitle(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSaveTitle(); }}
                    autoFocus
                  />
                  <button className="btn-mini btn-mini-save" onClick={handleSaveTitle}>保存</button>
                </div>
              ) : (
                <div className="detail-title-row">
                  <div
                    className="detail-title"
                    onClick={() => { setEditTitle(true); setTitle(todo.title); }}
                  >
                    {todo.title || '待办内容'}
                  </div>
                  <div className={`detail-pin-actions ${showPinActions ? 'visible' : ''}`}>
                    <button
                      className={`pin-btn ${todo.pinStatus === 'top' ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setPinStatus(todo.id, todo.pinStatus === 'top' ? null : 'top'); triggerAutoSave(); }}
                      title={todo.pinStatus === 'top' ? '取消置顶' : '置顶'}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                        <path d="M16 9V4h1c.55 0 1-.45 1-1s-.45-1-1-1H7c-.55 0-1 .45-1 1s.45 1 1 1h1v5c0 1.66-1.34 3-3 3v2h5.97v7l1 1 1-1v-7H19v-2c-1.66 0-3-1.34-3-3z" />
                      </svg>
                    </button>
                    <button
                      className={`pin-btn ${todo.pinStatus === 'bottom' ? 'active' : ''}`}
                      onClick={(e) => { e.stopPropagation(); setPinStatus(todo.id, todo.pinStatus === 'bottom' ? null : 'bottom'); triggerAutoSave(); }}
                      title={todo.pinStatus === 'bottom' ? '取消置底' : '置底'}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                        <path d="M20 12l-1.41-1.41L13 16.17V4h-2v12.17l-5.58-5.59L4 12l8 8 8-8z" />
                      </svg>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="detail-grid">
            <div className="detail-row">
              <span className="detail-label">状态</span>
              <span className={`detail-status status-${todo.status}`}>
                {statusLabels[todo.status]}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">创建时间</span>
              <span className="detail-value">{formatDateTime(todo.createdAt)}</span>
            </div>

            <div className="detail-row">
              <span className="detail-label">截止时间</span>
              <span className="detail-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <DateEdit
                  value={todo.dueDate}
                  onSave={(val) => { updateTodo(todo.id, { dueDate: val }); triggerAutoSave(); }}
                  overdue={isOverdue(todo.dueDate)}
                />
                {todo.dueDate && <Countdown dueDate={todo.dueDate} />}
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">标签</span>
              <span className="detail-value">
                <TagsEdit
                  tags={todo.tags}
                  onSave={(tags) => { updateTodo(todo.id, { tags }); triggerAutoSave(); }}
                />
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">清单模式</span>
              <span className="detail-value">
                <span
                  className={`detail-toggle ${todo.checklistMode ? 'on' : ''}`}
                  onClick={() => { updateTodo(todo.id, { checklistMode: !todo.checklistMode }); triggerAutoSave(); }}
                  role="switch"
                  aria-checked={!!todo.checklistMode}
                >
                  <span className="detail-toggle-knob" />
                </span>
                <span className="detail-toggle-hint">
                  {todo.checklistMode ? '拆解勾选' : '流水账'}
                </span>
              </span>
            </div>

            <div className="detail-row">
              <span className="detail-label">设为重复</span>
              <span className="detail-value">
                <div className="repeat-selector">
                  {['daily', 'weekly', 'monthly'].map(rule => (
                    <button
                      key={rule}
                      className={`repeat-opt ${todo.repeatRule === rule ? 'active' : ''}`}
                      onClick={() => {
                        if (todo.repeatRule === rule) {
                          setRepeatRule(todo.id, null);
                        } else {
                          setRepeatRule(todo.id, rule, todo.repeatAnchor);
                        }
                        triggerAutoSave();
                      }}
                    >
                      {CYCLE_LABELS[rule]}
                    </button>
                  ))}
                </div>
                <span className="detail-toggle-hint">
                  {todo.repeatRule ? `重复任务 · ${anchorLabel(todo.repeatRule, todo.repeatAnchor)}` : '不重复'}
                </span>
              </span>
            </div>

            {todo.repeatRule === 'weekly' && (
              <div className="detail-row">
                <span className="detail-label">到期日</span>
                <span className="detail-value">
                  <div className="repeat-anchor-row">
                    {WEEKDAY_LABELS.map((label, i) => (
                      <button
                        key={i}
                        className={`repeat-anchor-opt ${todo.repeatAnchor === i + 1 ? 'active' : ''}`}
                        onClick={() => { setRepeatRule(todo.id, 'weekly', todo.repeatAnchor === i + 1 ? null : i + 1); triggerAutoSave(); }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </span>
              </div>
            )}

            {todo.repeatRule === 'monthly' && (
              <div className="detail-row">
                <span className="detail-label">到期日</span>
                <span className="detail-value">
                  <div className="repeat-anchor-row">
                    <input
                      type="number"
                      min="1"
                      max="31"
                      className="repeat-anchor-input"
                      value={Number.isInteger(todo.repeatAnchor) ? todo.repeatAnchor : ''}
                      placeholder="号数"
                      onChange={e => {
                        const raw = e.target.value;
                        let anchor = null;
                        if (raw !== '') {
                          const v = Math.min(31, Math.max(1, Number(raw)));
                          anchor = Number.isNaN(v) ? null : v;
                        }
                        setRepeatRule(todo.id, 'monthly', anchor);
                        triggerAutoSave();
                      }}
                    />
                    <button
                      className={`repeat-anchor-opt ${todo.repeatAnchor === 'last' ? 'active' : ''}`}
                      onClick={() => {
                        setRepeatRule(todo.id, 'monthly', todo.repeatAnchor === 'last' ? null : 'last');
                        triggerAutoSave();
                      }}
                    >
                      月末
                    </button>
                  </div>
                </span>
              </div>
            )}

            {todo.repeatRule && (
              <div className="detail-row">
                <span className="detail-label">提醒时间</span>
                <span className="detail-value">
                  <input
                    type="time"
                    className="detail-time-input"
                    value={todo.reminderTime || ''}
                    onChange={(e) => { setReminderTime(todo.id, e.target.value || null); triggerAutoSave(); }}
                  />
                  <span className="detail-toggle-hint">到点本地通知</span>
                </span>
              </div>
            )}

            <div className="detail-row">
              <span className="detail-label">一次性提醒</span>
              <span className="detail-value">
                {todo.reminderAt ? (
                  <>
                    <span className="detail-time-text">{formatDateTime(todo.reminderAt)}</span>
                    <button className="detail-mini-btn" onClick={() => { setReminderAt(todo.id, null); triggerAutoSave(); }}>清除</button>
                  </>
                ) : (
                  <button className="detail-mini-btn" onClick={openTodoReminderPicker}>设置提醒</button>
                )}
              </span>
            </div>

            {todo.tags.includes(URGENT_TAG) && (
              <div className="detail-row">
                <span className="detail-label" />
                <span className="detail-tag urgent">#紧急</span>
              </div>
            )}
          </div>

          <div className="detail-section" style={{ marginTop: 12 }}>
            <div className="detail-section-title">进度记录</div>
            <ProgressLog progress={todo.progress} todoId={todo.id} checklistMode={todo.checklistMode === true} repeatRule={todo.repeatRule} />
          </div>
        </div>

        <div className="modal-full-footer" style={{ justifyContent: 'center', gap: 10, padding: '12px 16px' }}>
          {todo.status === 'active' ? (
            <>
              {hasCycleDoneThisCycle(todo) ? (
                <button className="btn-primary-lg" disabled title="本期已完成，下一周期继续">
                  本期已完成
                </button>
              ) : (
                <button className="btn-primary-lg" onClick={() => { completeTodo(todo.id); onClose(); }}>
                  标记完成
                </button>
              )}
              <button className="btn-danger-lg" onClick={() => { toggleStatus(todo.id, 'cancelled'); onClose(); }}>
                作废
              </button>
            </>
          ) : (
            <button className="btn-primary-lg" onClick={() => { toggleStatus(todo.id, todo.status); onClose(); }}>
              恢复
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
