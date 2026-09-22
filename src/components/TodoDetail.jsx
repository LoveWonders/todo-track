import { useState, useEffect, useRef, useCallback } from 'react';
import { formatDateTime, isOverdue } from '../utils/dateParser';
import { getEffectiveDue } from '../utils/taskTier';
import { describeCycle, hasCycleClosedThisCycle, hasCycleDoneThisCycle } from '../utils/repeat';
import RepeatSelector from './RepeatSelector';
import Countdown from './Countdown';
import DateEdit from './DateEdit';
import TagsEdit from './TagsEdit';
import ProgressLog from './ProgressLog';
import { useTodoActions } from '../hooks/TodoContext';
import { showNativeDatePicker } from '../utils/datePicker';
import ModalShell from './ModalShell';
import { highlightText } from '../utils/highlight';

export default function TodoDetail({ todo, onClose, highlight }) {
  const { updateTodo, toggleStatus, completeTodo, reopenCycle, setRepeatRule, setReminderTime, setReminderAt, setPinStatus, setFabHidden } = useTodoActions();
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

  const cycleText = describeCycle(todo.repeatRule, todo.repeatAnchor);

  return (
    <>
      {autoSaved && (
        <div className="autosave-toast">
          <span>已自动保存</span>
        </div>
      )}
      <ModalShell
        title="待办详情"
        onClose={onClose}
        bodyStyle={{ padding: '12px 16px' }}
        footerClassName="detail-footer"
        footer={
          <>
            {todo.status === 'active' ? (
              <>
                {hasCycleClosedThisCycle(todo) ? (
                  <button className="btn-primary-lg" onClick={() => { reopenCycle(todo.id); }} title="撤销本期，截止回到本期">
                    {hasCycleDoneThisCycle(todo) ? '撤销本期完成' : '撤销本期作废'}
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
          </>
        }
      >
        <div className="add-card">
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
                  {highlightText(todo.title || '待办内容', highlight)}
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
          <div className="add-row">
            <span className="add-row-label">状态</span>
            <span className="add-row-value">
              <span className={`detail-status status-${todo.status}`}>
                {statusLabels[todo.status]}
              </span>
            </span>
          </div>
          <div className="add-row">
            <span className="add-row-label">清单模式</span>
            <span className="add-row-value">
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
        </div>

        <div className="add-card">
          <div className="add-card-title">时间</div>
          <div className="add-row">
            <span className="add-row-label">创建时间</span>
            <span className="add-row-value detail-value-muted">{formatDateTime(todo.createdAt)}</span>
          </div>
          <div className="add-row">
            <span className="add-row-label">截止时间</span>
            <span className="add-row-value" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <DateEdit
                value={todo.dueDate}
                onSave={(val) => { updateTodo(todo.id, { dueDate: val }); triggerAutoSave(); }}
                overdue={isOverdue(todo.dueDate)}
              />
              {todo.dueDate && <Countdown dueDate={todo.dueDate} />}
              {getEffectiveDue(todo).source === 'child' && (
                <span className="todo-date-hint">列表按最早子项着色</span>
              )}
            </span>
          </div>
          <RepeatSelector
            rule={todo.repeatRule}
            anchor={todo.repeatAnchor}
            onChange={(nextRule, nextAnchor) => {
              setRepeatRule(todo.id, nextRule, nextAnchor);
              triggerAutoSave();
            }}
          />
        </div>

        <div className="add-card">
          <div className="add-card-title">提醒</div>
          {todo.repeatRule && (
            <div className="add-row">
              <span className="add-row-label">周期提醒</span>
              <span className="add-row-value">
                <input
                  type="time"
                  className="detail-time-input"
                  value={todo.reminderTime || ''}
                  onChange={(e) => { setReminderTime(todo.id, e.target.value || null); triggerAutoSave(); }}
                />
                <span className="detail-toggle-hint">{cycleText ? `${cycleText}到点本地通知` : '到点本地通知'}</span>
              </span>
            </div>
          )}
          <div className="add-row">
            <span className="add-row-label">单次提醒</span>
            <span className="add-row-value">
              {todo.reminderAt ? (
                <>
                  <span className="detail-time-text">{formatDateTime(todo.reminderAt)}</span>
                  <button className="detail-mini-btn" onClick={() => { setReminderAt(todo.id, null); triggerAutoSave(); }}>清除</button>
                </>
              ) : (
                <button className="detail-mini-btn" onClick={openTodoReminderPicker}>设置提醒</button>
              )}
              <span className="detail-toggle-hint">到点仅通知一次</span>
            </span>
          </div>
        </div>

        <div className="add-card">
          <div className="add-card-title">标签</div>
          <div className="add-row">
            <span className="add-row-label">标签</span>
            <span className="add-row-value">
              <TagsEdit
                tags={todo.tags}
                onSave={(tags) => { updateTodo(todo.id, { tags }); triggerAutoSave(); }}
              />
            </span>
          </div>
        </div>

        <div className="add-card" style={{ marginBottom: 0 }}>
          <div className="add-card-title">进度记录</div>
          <ProgressLog progress={todo.progress} todoId={todo.id} checklistMode={todo.checklistMode === true} repeatRule={todo.repeatRule} repeatAnchor={todo.repeatAnchor} dueDate={todo.dueDate} highlight={highlight} />
        </div>
      </ModalShell>
    </>
  );
}
