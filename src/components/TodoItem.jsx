import { useState, useRef, useEffect, memo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { isOverdue } from '../utils/dateParser';
import { URGENT_TAG } from '../constants';
import { useTodoActions, useTodoView } from '../hooks/TodoContext';
import Countdown from './Countdown';
import DateEdit from './DateEdit';
import TagsEdit from './TagsEdit';
import ProgressLog from './ProgressLog';
import TodoDetail from './TodoDetail';

function getTaskTier(todo) {
  const now = new Date();
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  const sevenDaysLater = new Date(now);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  const tags = todo.tags || [];
  const isUrgent = tags.includes(URGENT_TAG);
  const isLongTerm = tags.includes('长期');
  const dueDate = todo.dueDate ? new Date(todo.dueDate) : null;
  const isOverdueTask = dueDate && dueDate < now;
  const isDueSoon = dueDate && dueDate <= threeDaysLater;
  const isDueInWeek = dueDate && dueDate <= sevenDaysLater;

  if (isUrgent || isOverdueTask || isDueSoon) return 1;
  if (!isLongTerm && isDueInWeek) return 2;
  return 3;
}

function getStatusClass(todo) {
  if (todo.status === 'completed') return 'completed';
  if (todo.status === 'cancelled') return 'cancelled';
  if (isOverdue(todo.dueDate)) return 'overdue';
  return '';
}

const TodoItem = memo(function TodoItem({ todo, isDragging, isSelected, dragListeners }) {
  const { toggleStatus, updateTodo, handleBatchToggle, moveTodoToTop, moveTodoToBottom } = useTodoActions();
  const { batchMode, isArchive, devMode } = useTodoView();
  const statusClass = getStatusClass(todo);
  const tier = getTaskTier(todo);

  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  const devRenderLabel = devMode ? renderCountRef.current : null;

  const [showEditModal, setShowEditModal] = useState(false);
  const [editText, setEditText] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState({});
  const [collapsed, setCollapsed] = useState(true);
  const dragRef = useRef(null);

  const canCollapse = !isArchive && todo.status === 'active';
  const progressArr = Array.isArray(todo.progress) ? todo.progress : [];
  const progressCount = progressArr.length;

  const prevTodoIdRef = useRef(todo.id);
  if (prevTodoIdRef.current !== todo.id) {
    setCollapsed(true);
    prevTodoIdRef.current = todo.id;
  }

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e) => {
      if (e.target.closest('.more-dropdown') || e.target.closest('.drag-handle')) return;
      setMoreOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [moreOpen]);

  const handleOpenEdit = () => {
    if (batchMode) return;
    setEditText(todo.title || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== todo.title) updateTodo(todo.id, { title: trimmed });
    setShowEditModal(false);
  };

  const isUrgent = (todo.tags || []).includes(URGENT_TAG);

  const handleItemClick = () => {
    if (!batchMode) return;
    handleBatchToggle(todo.id);
  };

  const handleEnterBatch = (e) => {
    e.stopPropagation();
    handleBatchToggle(todo.id);
    setMoreOpen(false);
  };

  const handleComplete = (e) => {
    e.stopPropagation();
    toggleStatus(todo.id, 'completed');
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

  const handleMoveTop = (e) => {
    e.stopPropagation();
    moveTodoToTop(todo.id);
    setMoreOpen(false);
  };

  const handleMoveBottom = (e) => {
    e.stopPropagation();
    moveTodoToBottom(todo.id);
    setMoreOpen(false);
  };

  const handleToggleMore = (e) => {
    e.stopPropagation();
    if (moreOpen) {
      setMoreOpen(false);
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
    setMoreOpen(true);
  };

  return (
    <div
      className={`todo-item ${statusClass} ${tier === 3 ? 'long-term' : ''} ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''} ${batchMode ? 'batch-mode' : ''} ${isUrgent ? 'urgent' : ''}`}
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
            <button className="more-item" onClick={() => { setMoreOpen(false); setShowDetail(true); }}>
              详情
            </button>
            <button className="more-item" onClick={handleEnterBatch}>
              选择
            </button>
            <button className="more-item" onClick={handleMoveTop}>
              置顶
            </button>
            <button className="more-item" onClick={handleMoveBottom}>
              置底
            </button>
          </div>,
          document.body
        )}

        <div className="todo-content">
          <div style={{ marginBottom: 3 }}>
            <span
              className="todo-title-text"
              onClick={(e) => { e.stopPropagation(); handleOpenEdit(); }}
            >
              {todo.title || '待办内容'}
            </span>
            {devRenderLabel != null && !isDragging && (
              <span className="render-counter-badge" title={`渲染次数: ${devRenderLabel}`}>
                {devRenderLabel}
              </span>
            )}
          </div>
          <div className="todo-meta">
            <DateEdit
              value={todo.dueDate}
              onSave={(val) => updateTodo(todo.id, { dueDate: val })}
              overdue={false}
              inBatch={batchMode}
            />
            {todo.status === 'active' && todo.dueDate && (
              <Countdown dueDate={todo.dueDate} />
            )}
            <TagsEdit
              tags={todo.tags}
              onSave={(tags) => updateTodo(todo.id, { tags })}
              inBatch={batchMode}
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
                  onClick={(e) => { e.stopPropagation(); setCollapsed(v => !v); }}
                  title={collapsed ? '展开进度' : '收起进度'}
                >
                  {collapsed ? '\u25BC' : '\u25B2'}
                  {progressCount > 0 && collapsed && (
                    <span className="expand-count">{progressCount}</span>
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
        <ProgressLog progress={todo.progress} todoId={todo.id} collapsed={collapsed} />
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
              {p.text}
            </div>
          ))}
        </div>
      )}

      {showEditModal && (
        <div
          className="modal-full-overlay"
          onClick={(e) => { e.stopPropagation(); setShowEditModal(false); }}
        >
          <div className="modal-full-sheet" onClick={(e) => e.stopPropagation()}>
            <div className="modal-full-header">
              <span className="modal-full-title">编辑内容</span>
              <button
                className="modal-full-close"
                onClick={(e) => { e.stopPropagation(); setShowEditModal(false); }}
              >
                &times;
              </button>
            </div>
            <div className="modal-full-body">
              <textarea
                className="modal-edit-textarea"
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-full-footer">
              <button
                className="btn-cancel"
                onClick={(e) => { e.stopPropagation(); setShowEditModal(false); }}
              >
                取消
              </button>
              <button
                className="btn-save"
                onClick={(e) => { e.stopPropagation(); handleSaveEdit(); }}
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {showDetail && createPortal(
        <TodoDetail todo={todo} onClose={() => setShowDetail(false)} />,
        document.body
      )}
    </div>
  );
});

export default TodoItem;
