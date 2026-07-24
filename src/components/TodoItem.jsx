import { useState, useRef, useEffect, memo } from 'react';
import { isOverdue } from '../utils/dateParser';
import { URGENT_TAG } from '../constants';
import { useTodoActions, useTodoView } from '../hooks/TodoContext';
import Countdown from './Countdown';
import DateEdit from './DateEdit';
import TagsEdit from './TagsEdit';
import ProgressLog from './ProgressLog';
import TodoDetail from './TodoDetail';

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

  const renderCountRef = useRef(0);
  renderCountRef.current += 1;
  const devRenderLabel = devMode ? renderCountRef.current : null;

  const [showEditModal, setShowEditModal] = useState(false);
  const [editText, setEditText] = useState('');
  const [moreOpen, setMoreOpen] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    if (!moreOpen) return;
    const close = (e) => {
      if (!e.target.closest('.more-dropdown')) setMoreOpen(false);
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

  const isUrgent = todo.tags.includes(URGENT_TAG);

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
    if (isUrgent) {
      updateTodo(todo.id, { tags: todo.tags.filter(t => t !== URGENT_TAG) });
    } else {
      updateTodo(todo.id, { tags: [...todo.tags, URGENT_TAG] });
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

  return (
    <div
      className={`todo-item ${statusClass} ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''} ${batchMode ? 'batch-mode' : ''} ${isUrgent ? 'urgent' : ''}`}
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
          className={`drag-handle ${batchMode ? 'disabled' : ''}`}
          {...(!batchMode ? dragListeners : {})}
          onClick={!batchMode ? (e) => { e.stopPropagation(); setMoreOpen(!moreOpen); } : undefined}
          title={batchMode ? '' : '长按拖动 / 点击菜单'}
        >
          <span className="drag-handle-icon">
            {batchMode ? '\u2630' : '\u2807'}
          </span>
          {moreOpen && (
            <div className="more-dropdown">
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
            </div>
          )}
        </div>

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
            <>
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
            </>
          )}
          {!batchMode && todo.status !== 'active' && (
            <button className="btn-action undo" onClick={handleUndo} title="恢复">
              &#x21A9;
            </button>
          )}
        </div>

      </div>

      {!isArchive && todo.status === 'active' && (
        <ProgressLog progress={todo.progress} todoId={todo.id} />
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

      {showDetail && (
        <TodoDetail todo={todo} onClose={() => setShowDetail(false)} />
      )}
    </div>
  );
});

export default TodoItem;
