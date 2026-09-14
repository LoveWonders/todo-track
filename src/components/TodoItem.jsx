import { useState, useRef, useEffect, memo } from 'react';
import { createPortal } from 'react-dom';
import { isOverdue } from '../utils/dateParser';
import { getTaskTier } from '../utils/taskTier';
import { loadProgressCollapsed, saveProgressCollapsed } from '../utils/progressViewState';
import { URGENT_TAG } from '../constants';
import { useTodoActions, useTodoView } from '../hooks/TodoContext';
import { anchorLabel, getCycleStats } from '../utils/repeat';
import Countdown from './Countdown';
import DateEdit from './DateEdit';
import TagsEdit from './TagsEdit';
import ProgressLog from './ProgressLog';
import { highlightText } from '../utils/highlight';
import { SORT_MANUAL } from '../utils/sortTodos';
import TodoDetail from './TodoDetail';

function getStatusClass(todo) {
  if (todo.status === 'completed') return 'completed';
  if (todo.status === 'cancelled') return 'cancelled';
  if (isOverdue(todo.dueDate)) return 'overdue';
  return '';
}

function formatReminderAt(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

function isReminderAtDue(todo) {
  if (!todo.reminderAt) return false;
  const t = new Date(todo.reminderAt).getTime();
  return !Number.isNaN(t) && t <= Date.now();
}

const TodoItem = memo(function TodoItem({ todo, isDragging, isSelected, dragListeners, highlight }) {
  const { toggleStatus, completeTodo, updateTodo, handleBatchToggle, setPinStatus } = useTodoActions();
  const { batchMode, isArchive, devMode, openMenuId, setOpenMenuId, sortMode } = useTodoView();
  const statusClass = getStatusClass(todo);
  const tier = getTaskTier(todo);
  const moreOpen = openMenuId === todo.id;

  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  const devRenderLabel = devMode ? renderCountRef.current : null;

  const [showDetail, setShowDetail] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [collapsed, setCollapsed] = useState(() => loadProgressCollapsed(todo.id));
  const [titleExpanded, setTitleExpanded] = useState(false);
  const [titleOverflow, setTitleOverflow] = useState(false);
  const dragRef = useRef(null);
  const titleRef = useRef(null);

  const canCollapse = !isArchive && todo.status === 'active';
  const cycleStats = getCycleStats(todo);
  const progressCount = cycleStats.count;
  const completedCount = cycleStats.completed;
  const activeCount = cycleStats.active;
  const progressAllDone = cycleStats.allDone;
  const cycleDone = cycleStats.cycleDone;
  const checklistMode = todo.checklistMode === true;

  const toggleCollapsed = () => {
    const next = !collapsed;
    setCollapsed(next);
    saveProgressCollapsed(todo.id, next);
  };

  useEffect(() => {
    setTitleExpanded(false);
  }, [todo.id, todo.title]);

  useEffect(() => {
    const el = titleRef.current;
    if (!el || titleExpanded) return;
    const measure = () => {
      setTitleOverflow(el.scrollHeight > el.clientHeight + 1);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro) ro.observe(el);
    return () => { if (ro) ro.disconnect(); };
  }, [todo.title, highlight, titleExpanded]);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e) => {
      if (e.target.closest('.more-dropdown') || e.target.closest('.drag-handle')) return;
      setOpenMenuId(null);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [moreOpen, setOpenMenuId]);

  const isUrgent = (todo.tags || []).includes(URGENT_TAG);

  const hasUrgentProgress = (todo.progress || []).some(p => {
    if (p.status !== 'active') return false;
    if (p.urgent) return true;
    if (p.reminderTime) {
      const t = new Date(p.reminderTime).getTime();
      if (!Number.isNaN(t) && t <= Date.now()) return true;
    }
    return false;
  });

  const reminderAtDue = isReminderAtDue(todo);

  const handleItemClick = () => {
    if (!batchMode) return;
    handleBatchToggle(todo.id);
  };

  const handleOpenDetail = (e) => {
    if (batchMode) return;
    if (e.target.closest('.todo-title-toggle')) return;
    setShowDetail(true);
  };

  const handleToggleTitle = (e) => {
    e.stopPropagation();
    setTitleExpanded(v => !v);
  };

  const handleEnterBatch = (e) => {
    e.stopPropagation();
    handleBatchToggle(todo.id);
    setOpenMenuId(null);
  };

  const handleComplete = (e) => {
    e.stopPropagation();
    completeTodo(todo.id);
  };

  const handleCancel = (e) => {
    e.stopPropagation();
    toggleStatus(todo.id, 'cancelled');
  };

  const handleUrgent = (e) => {
    e.stopPropagation();
    const currentTags = todo.tags || [];
    if (isUrgent) {
      updateTodo(todo.id, { tags: currentTags.filter(t => t !== URGENT_TAG) });
    } else {
      updateTodo(todo.id, { tags: [...currentTags, URGENT_TAG] });
    }
  };

  const handleUndo = (e) => {
    e.stopPropagation();
    toggleStatus(todo.id, todo.status);
  };

  const handlePinTop = (e) => {
    e.stopPropagation();
    setPinStatus(todo.id, todo.pinStatus === 'top' ? null : 'top');
    setOpenMenuId(null);
  };

  const handlePinBottom = (e) => {
    e.stopPropagation();
    setPinStatus(todo.id, todo.pinStatus === 'bottom' ? null : 'bottom');
    setOpenMenuId(null);
  };

  const handleToggleMore = (e) => {
    e.stopPropagation();
    if (moreOpen) {
      setOpenMenuId(null);
      return;
    }
    if (dragRef.current) {
      const rect = dragRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        left: rect.left + 'px',
        top: (rect.bottom + 4) + 'px',
        zIndex: 9999,
      });
    }
    setOpenMenuId(todo.id);
  };

  return (
    <div
      className={`todo-item ${statusClass} ${tier === 3 ? 'long-term' : ''} ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''} ${batchMode ? 'batch-mode' : ''} ${isUrgent ? 'urgent' : ''} ${reminderAtDue ? 'reminder-due' : ''}`}
      onClick={handleItemClick}
    >
      <div className="todo-header">
        {batchMode && (
          <div className="batch-check">
            <span className={`check-circle ${isSelected ? 'checked' : ''}`}>
              {isSelected ? '\u2713' : ''}
            </span>
          </div>
        )}

        <div
          ref={dragRef}
          className={`drag-handle ${batchMode ? 'disabled' : ''}`}
          {...(!batchMode ? dragListeners : {})}
          onClick={!batchMode ? handleToggleMore : undefined}
          title={batchMode ? '' : '长按拖动 / 点击菜单'}
        >
          <span className="drag-handle-icon">
            {batchMode ? '\u2630' : '\u2807'}
          </span>
        </div>

        {moreOpen && createPortal(
          <div className="more-dropdown" style={dropdownStyle}>
            <button className="more-item" onClick={() => { setOpenMenuId(null); setShowDetail(true); }}>
              详情
            </button>
            <button className="more-item" onClick={handleEnterBatch}>
              选择
            </button>
            <button className="more-item" onClick={handlePinTop}>
              {todo.pinStatus === 'top' ? '取消置顶' : '置顶'}
            </button>
            <button className="more-item" onClick={handlePinBottom}>
              {todo.pinStatus === 'bottom' ? '取消置底' : '置底'}
            </button>
          </div>,
          document.body
        )}

        <div
          className="todo-content"
          onClick={handleOpenDetail}
        >
          <div className="todo-title-row">
            {todo.pinStatus && (
              <span className={`pin-badge ${todo.pinStatus === 'top' ? 'pin-top' : 'pin-bottom'}`}>
                {todo.pinStatus === 'top' ? '置顶' : '置底'}
              </span>
            )}
            {sortMode === SORT_MANUAL && todo.manualLocked && !todo.pinStatus && (
              <span className="pin-badge manual-lock" title="手动锁定">手</span>
            )}
            <span
              className={`todo-title-clip ${!titleExpanded && titleOverflow ? 'truncated' : ''}`}
            >
              <span
                ref={titleRef}
                className={`todo-title-text ${titleExpanded ? 'expanded' : ''}`}
              >
                {highlightText(todo.title || '待办内容', highlight)}
              </span>
            </span>
            {todo.repeatRule && (
              <span className={`repeat-badge repeat-${todo.repeatRule}`}>
                {anchorLabel(todo.repeatRule, todo.repeatAnchor)}
              </span>
            )}
            {hasUrgentProgress && (
              <span className="progress-urgent-badge" title="含紧急/待提醒进度">急</span>
            )}
            {todo.reminderAt && (
              <span className={`todo-reminder-tag ${reminderAtDue ? 'due' : ''}`}>提醒 {formatReminderAt(todo.reminderAt)}</span>
            )}
            {checklistMode && progressCount > 0 && (
              <span
                className={`progress-badge ${progressAllDone ? 'all-done' : ''} ${cycleDone ? 'cycle-done' : ''}`}
                title={cycleDone ? '本期已完成' : progressAllDone ? '全部子项已完成，点击完成待办' : `子项进度 ${completedCount}/${progressCount}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (progressAllDone && !cycleDone) completeTodo(todo.id);
                }}
              >
                {completedCount}/{progressCount}
              </span>
            )}
            {devRenderLabel != null && !isDragging && (
              <span className="render-counter-badge" title={`渲染次数: ${devRenderLabel}`}>
                {devRenderLabel}
              </span>
            )}
          </div>
          {(titleOverflow || titleExpanded) && (
            <button
              type="button"
              className="todo-title-toggle"
              onClick={handleToggleTitle}
            >
              {titleExpanded ? '收起' : '展开'}
            </button>
          )}
          <div className="todo-meta">
            <DateEdit
              value={todo.dueDate}
              onSave={(val) => updateTodo(todo.id, { dueDate: val })}
              overdue={false}
              inBatch={batchMode}
              interactive={false}
            />
            {todo.status === 'active' && todo.dueDate && (
              <Countdown dueDate={todo.dueDate} />
            )}
            <TagsEdit
              tags={todo.tags}
              onSave={(tags) => updateTodo(todo.id, { tags })}
              inBatch={batchMode}
              interactive={false}
            />
          </div>
        </div>

        <div className="todo-actions">
          {!batchMode && todo.status === 'active' && (
            <div className="actions-grid">
              <button className="btn-action done" onClick={handleComplete} title="完成">
                &#x2713;
              </button>
              <button className="btn-action cancel" onClick={handleCancel} title="作废">
                &#x2717;
              </button>
              <button
                className="btn-action urgent"
                data-active={isUrgent ? 'true' : 'false'}
                onClick={handleUrgent}
                title={isUrgent ? '取消紧急' : '标记紧急'}
                style={isUrgent ? { background: '#e74c3c', color: '#fff', borderColor: '#e74c3c' } : { background: '#f0f2f5', color: '#7f8c8d', borderColor: '#e0e0e0' }}
              >
                !
              </button>
              {canCollapse && (
                <button
                  className="btn-action expand"
                  onClick={(e) => { e.stopPropagation(); toggleCollapsed(); }}
                  title={collapsed ? '展开进度' : '收起进度'}
                >
                  {collapsed ? '\u25BC' : '\u25B2'}
                  {activeCount > 0 && collapsed && (
                    <span className="expand-count">{activeCount}</span>
                  )}
                </button>
              )}
            </div>
          )}
          {!batchMode && todo.status !== 'active' && (
            <button className="btn-action undo" onClick={handleUndo} title="恢复">
              &#x21A9;
            </button>
          )}
        </div>

      </div>

      {!isArchive && todo.status === 'active' && canCollapse && !collapsed && (
        <ProgressLog progress={todo.progress} todoId={todo.id} collapsed={collapsed} checklistMode={checklistMode} repeatRule={todo.repeatRule} dueDate={todo.dueDate} highlight={highlight} />
      )}

      {isArchive && todo.progress && todo.progress.length > 0 && (
        <div className="progress-log">
          {todo.progress.map((p) => (
            <div key={p.id} className={`progress-entry ${p.status}`}>
              <span className="progress-status-tag">
                {p.status === 'completed' ? '已完成' : '已作废'}
              </span>
              <span className="progress-date">
                {new Date(p.createdAt || p.time).toLocaleDateString('zh-CN', {
                  month: 'numeric',
                  day: 'numeric',
                })}
              </span>
              {highlightText(p.text, highlight)}
            </div>
          ))}
        </div>
      )}

      {showDetail && createPortal(
        <TodoDetail todo={todo} onClose={() => setShowDetail(false)} highlight={highlight} />,
        document.body
      )}
    </div>
  );
});

export default TodoItem;
