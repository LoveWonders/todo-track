import { useState } from 'react';
import { formatDateTime, isOverdue } from '../utils/dateParser';
import { URGENT_TAG } from '../constants';
import Countdown from './Countdown';
import DateEdit from './DateEdit';
import TagsEdit from './TagsEdit';
import ProgressLog from './ProgressLog';
import { useTodoActions } from '../hooks/TodoContext';

export default function TodoDetail({ todo, onClose }) {
  const { updateTodo, toggleStatus, moveTodoToTop, moveTodoToBottom } = useTodoActions();
  const [editTitle, setEditTitle] = useState(false);
  const [title, setTitle] = useState(todo.title);

  const handleSaveTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== todo.title) updateTodo(todo.id, { title: trimmed });
    setEditTitle(false);
  };

  const statusLabels = {
    active: '进行中',
    completed: '已完成',
    cancelled: '已作废',
  };

  return (
    <div className="modal-full-overlay" onClick={onClose}>
      <div className="modal-full-sheet" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
        <div className="modal-full-header">
          <span className="modal-full-title">待办详情</span>
          <button className="modal-full-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-full-body" style={{ padding: '12px 16px' }}>
          <div className="detail-section">
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
              <div
                className="detail-title"
                onClick={() => { setEditTitle(true); setTitle(todo.title); }}
              >
                {todo.title || '待办内容'}
              </div>
            )}
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
                  onSave={(val) => updateTodo(todo.id, { dueDate: val })}
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
                  onSave={(tags) => updateTodo(todo.id, { tags })}
                />
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
            <ProgressLog progress={todo.progress} todoId={todo.id} />
          </div>
        </div>

        <div className="modal-full-footer" style={{ justifyContent: 'space-between', padding: '10px 16px' }}>
          <div style={{ display: 'flex', gap: 6 }}>
            {todo.status === 'active' && (
              <>
                <button className="btn-mini btn-mini-save" onClick={() => { toggleStatus(todo.id, 'completed'); onClose(); }}>
                  完成
                </button>
                <button className="btn-mini btn-mini-cancel" onClick={() => { toggleStatus(todo.id, 'cancelled'); onClose(); }}>
                  作废
                </button>
              </>
            )}
            {todo.status !== 'active' && (
              <button className="btn-mini btn-mini-save" onClick={() => { toggleStatus(todo.id, todo.status); onClose(); }}>
                恢复
              </button>
            )}
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn-mini btn-mini-cancel" onClick={() => { moveTodoToTop(todo.id); onClose(); }}>
              置顶
            </button>
            <button className="btn-mini btn-mini-cancel" onClick={() => { moveTodoToBottom(todo.id); onClose(); }}>
              置底
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
