import { useState, useRef, useCallback } from 'react';
import { formatDate, isOverdue } from '../utils/dateParser';
import InlineEdit from './InlineEdit';
import Countdown from './Countdown';
import DateEdit from './DateEdit';
import TagsEdit from './TagsEdit';
import ProgressLog from './ProgressLog';

function getStatusClass(todo) {
  if (todo.status === 'completed') return 'completed';
  if (todo.status === 'cancelled') return 'cancelled';
  if (isOverdue(todo.dueDate)) return 'overdue';
  return '';
}

export default function TodoItem({ todo, onToggleStatus, onAddProgress, onToggleProgressStatus, onDeleteProgress, onUpdateProgress, onUpdateProgressCompletedAt, onUpdateTodo, onDragStart, onBatchToggle, isDragging, isSelected, batchMode, isArchive }) {
  const statusClass = getStatusClass(todo);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editText, setEditText] = useState('');

  const handleOpenEdit = () => {
    if (batchMode) return;
    setEditText(todo.title || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = () => {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== todo.title) onUpdateTodo(todo.id, { title: trimmed });
    setShowEditModal(false);
  };

  const pressTimer = useRef(null);
  const pressMoved = useRef(false);
  const pressCoords = useRef({ x: 0, y: 0 });
  const clickHandled = useRef(false);

  const startPress = useCallback((e) => {
    if (batchMode) return;
    pressMoved.current = false;
    clickHandled.current = false;
    const touch = e.touches ? e.touches[0] : e;
    pressCoords.current = { x: touch.clientX, y: touch.clientY };
    pressTimer.current = setTimeout(() => {
      if (!pressMoved.current && onDragStart) {
        onDragStart(todo.id, pressCoords.current);
        clickHandled.current = true;
      }
    }, 400);
  }, [todo.id, onDragStart, batchMode]);

  const movePress = useCallback(() => { pressMoved.current = true; }, []);

  const cancelPress = useCallback(() => {
    if (!pressTimer.current) return;
    clearTimeout(pressTimer.current);
    pressTimer.current = null;
    if (!pressMoved.current && !clickHandled.current && onBatchToggle) {
      clickHandled.current = true;
      onBatchToggle(todo.id);
    }
  }, [todo.id, onBatchToggle]);

  return (
    <div className={`todo-item ${statusClass} ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''} ${batchMode ? 'batch-mode' : ''} ${todo.tags.includes('紧急') ? 'urgent' : ''}`}
      onClick={batchMode ? () => onBatchToggle(todo.id) : undefined}>
      <div className="todo-header">
        {batchMode && (
          <div className="batch-check">
            <span className={`check-circle ${isSelected ? 'checked' : ''}`}>{isSelected ? '\u2713' : ''}</span>
          </div>
        )}
        <div className="todo-content">
          <div style={{ marginBottom: 3 }}>
            <span className="todo-title-text" onClick={handleOpenEdit}>{todo.title || '待办内容'}</span>
          </div>
          <div className="todo-meta">
            <DateEdit value={todo.dueDate} onSave={(val) => onUpdateTodo(todo.id, { dueDate: val })} overdue={false} inBatch={batchMode} />
            {todo.status === 'active' && todo.dueDate && <Countdown dueDate={todo.dueDate} />}
            <span className="todo-date" style={{ color: '#ccc' }}>{formatDate(todo.createdAt)}</span>
            <TagsEdit tags={todo.tags} onSave={(tags) => onUpdateTodo(todo.id, { tags })} inBatch={batchMode} />
          </div>
        </div>

        <div className="todo-actions">
          {!batchMode && todo.status === 'active' && (
            <>
              <button className="btn-action done" onClick={() => onToggleStatus(todo.id, 'completed')} title="完成">&#x2713;</button>
              <button className="btn-action cancel" onClick={() => onToggleStatus(todo.id, 'cancelled')} title="作废">&#x2717;</button>
              <button className="btn-action urgent" onClick={() => {
                if (!todo.tags.includes('紧急')) onUpdateTodo(todo.id, { tags: [...todo.tags, '紧急'] });
              }} title="紧急"
                style={{ color: todo.tags.includes('紧急') ? '#e74c3c' : '#7f8c8d' }}>!</button>
            </>
          )}
          {!batchMode && todo.status !== 'active' && (
            <button className="btn-action undo" onClick={() => onToggleStatus(todo.id, todo.status)} title="恢复">&#x21A9;</button>
          )}
        </div>

        <div className={`drag-handle ${batchMode ? 'disabled' : ''}`}
          onTouchStart={!batchMode ? startPress : undefined} onTouchMove={!batchMode ? movePress : undefined}
          onTouchEnd={!batchMode ? cancelPress : undefined} onMouseDown={!batchMode ? startPress : undefined}
          onMouseMove={!batchMode ? movePress : undefined} onMouseUp={!batchMode ? cancelPress : undefined}
          onMouseLeave={!batchMode ? cancelPress : undefined} title={batchMode ? '' : '长按拖动排序'}>
          <span className="drag-handle-icon">{batchMode ? '\u2630' : '\u2807'}</span>
        </div>
      </div>

      {!isArchive && todo.status === 'active' && (
        <ProgressLog progress={todo.progress} todoId={todo.id}
          onToggleProgressStatus={onToggleProgressStatus} onDeleteProgress={onDeleteProgress}
          onAddProgress={onAddProgress} onUpdateProgress={onUpdateProgress}
          onUpdateProgressCompletedAt={onUpdateProgressCompletedAt} inBatch={batchMode} />
      )}

      {isArchive && todo.progress && todo.progress.length > 0 && (
        <div className="progress-log">
          {todo.progress.map(p => (
            <div key={p.id} className={`progress-entry ${p.status}`}>
              <span className="progress-status-tag">{p.status === 'completed' ? '已完成' : '已作废'}</span>
              <span className="progress-date">{new Date(p.createdAt || p.time).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
              {p.text}
            </div>
          ))}
        </div>
      )}

      {showEditModal && (
        <div className="modal-full-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-full-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-full-header">
              <span className="modal-full-title">编辑内容</span>
              <button className="modal-full-close" onClick={() => setShowEditModal(false)}>&times;</button>
            </div>
            <div className="modal-full-body">
              <textarea className="modal-edit-textarea" value={editText} onChange={e => setEditText(e.target.value)} autoFocus />
            </div>
            <div className="modal-full-footer">
              <button className="btn-cancel" onClick={() => setShowEditModal(false)}>取消</button>
              <button className="btn-save" onClick={handleSaveEdit}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
