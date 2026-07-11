import { useState, useRef, useEffect, useCallback } from 'react';
import { formatDate, isOverdue, parseDateText } from '../utils/dateParser';

function InlineEdit({ value, onSave, className, placeholder, style, inBatch }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (trimmed && trimmed !== value) {
      onSave(trimmed);
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setText(value || '');
      setEditing(false);
    }
  };

  const handleClick = (e) => {
    if (inBatch) { e.stopPropagation(); return; }
    setText(value || '');
    setEditing(true);
  };

  if (editing) {
    return (
      <input
        ref={inputRef}
        className={`inline-edit-input ${className || ''}`}
        value={text}
        onChange={e => setText(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={style}
      />
    );
  }

  return (
    <span className={`inline-edit-text ${className || ''}`} onClick={handleClick} style={style}>
      {value || placeholder || '点击设置'}
    </span>
  );
}

function DateEdit({ value, onSave, overdue, inBatch }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleSave = () => {
    const trimmed = text.trim();
    if (!trimmed) {
      onSave(null);
    } else {
      const parsed = parseDateText(trimmed);
      if (parsed) {
        onSave(parsed);
      }
    }
    setEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      setText(value || '');
      setEditing(false);
    }
  };

  const openCalendar = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'date';
    input.value = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : '';
    input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0';
    document.body.appendChild(input);

    const cleanup = () => {
      if (document.body.contains(input)) {
        document.body.removeChild(input);
      }
      setEditing(false);
    };

    input.addEventListener('change', (e) => {
      const picked = e.target.value;
      if (picked) {
        onSave(picked);
        setText(picked);
      }
      cleanup();
    });

    input.addEventListener('blur', () => {
      setTimeout(cleanup, 200);
    });

    requestAnimationFrame(() => {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.focus();
      }
    });
  }, [value, onSave]);

  const handleDateClick = (e) => {
    if (inBatch) { e.stopPropagation(); return; }
    setText(value || '');
    setEditing(true);
  };

  if (editing) {
    return (
      <span className="date-edit-wrap" onClick={inBatch ? e => e.stopPropagation() : undefined}>
        <input
          ref={inputRef}
          className="inline-edit-input date-edit"
          value={text}
          onChange={e => setText(e.target.value)}
          onBlur={handleSave}
          onKeyDown={handleKeyDown}
          placeholder="明天、5月前"
        />
        <button type="button" className="calendar-btn" onMouseDown={e => e.preventDefault()} onClick={openCalendar} title="选择日期">&#x1F4C5;</button>
      </span>
    );
  }

  return (
    <span
      className={`todo-date clickable ${overdue ? 'overdue-label' : ''}`}
      onClick={handleDateClick}
      title="点击编辑日期"
    >
      {value ? formatDate(value) : '+ 日期'}
    </span>
  );
}

function TagsEdit({ tags, onSave, inBatch }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  const addTag = (t) => {
    const tag = t.trim();
    if (tag && !tags.includes(tag)) {
      onSave([...tags, tag]);
    }
    setText('');
  };

  const removeTag = (tag) => {
    onSave(tags.filter(t => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag(text);
    } else if (e.key === 'Escape') {
      setEditing(false);
      setText('');
    } else if (e.key === 'Backspace' && !text && tags.length > 0) {
      removeTag(tags[tags.length - 1]);
    }
  };

  if (editing) {
    return (
      <span className="tags-edit">
        {tags.map(tag => (
          <span key={tag} className="tag-chip edit-mode">
            #{tag}
            <span className="tag-remove" onClick={() => removeTag(tag)}>&times;</span>
          </span>
        ))}
        <input
          ref={inputRef}
          className="tag-input"
          placeholder="+ 标签"
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (text.trim()) addTag(text);
            setEditing(false);
          }}
        />
      </span>
    );
  }

  return (
    <span className="todo-tags clickable" onClick={(e) => { if (inBatch) { e.stopPropagation(); return; } setEditing(true); }} title="点击编辑标签">
      {tags.length > 0 ? (
        tags.map(tag => (
          <span key={tag} className="todo-tag">#{tag}</span>
        ))
      ) : (
        <span className="todo-tag placeholder">+ 标签</span>
      )}
    </span>
  );
}

function ProgressLog({ progress, todoId, onToggleProgressStatus, onDeleteProgress, onAddProgress, inBatch }) {
  const [progressText, setProgressText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [selectedPIds, setSelectedPIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const activeProgress = (progress || []).filter(p => p.status === 'active');
  const archivedProgress = (progress || []).filter(p => p.status !== 'active');

  const toggleSelect = (pid) => {
    setSelectedPIds(prev => {
      const next = new Set(prev);
      if (next.has(pid)) next.delete(pid);
      else next.add(pid);
      return next;
    });
  };

  const exitManage = () => {
    setManageMode(false);
    setSelectedPIds(new Set());
    setConfirmDelete(false);
  };

  const handleBatchDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    selectedPIds.forEach(pid => onDeleteProgress(todoId, pid));
    exitManage();
  };

  const handleBatchComplete = () => {
    selectedPIds.forEach(pid => onToggleProgressStatus(todoId, pid, 'completed'));
    exitManage();
  };

  const handleBatchCancel = () => {
    selectedPIds.forEach(pid => onToggleProgressStatus(todoId, pid, 'cancelled'));
    exitManage();
  };

  const handleSubmit = () => {
    if (progressText.trim()) {
      onAddProgress(todoId, progressText);
      setProgressText('');
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  const allCount = (progress || []).length;

  return (
    <div className="progress-section" onClick={inBatch ? e => e.stopPropagation() : undefined}>
      {activeProgress.length > 0 && (
        <div className="progress-active-row">
          {activeProgress.map(p => (
            <div
              key={p.id}
              className={`progress-entry active ${manageMode ? 'progress-manage' : ''} ${selectedPIds.has(p.id) ? 'progress-selected' : ''}`}
              onClick={manageMode ? () => toggleSelect(p.id) : undefined}
            >
              {!inBatch && !manageMode && (
                <span className="progress-actions">
                  <button className="p-action done" onClick={(e) => { e.stopPropagation(); onToggleProgressStatus(todoId, p.id, 'completed'); }} title="完成">&#x2713;</button>
                  <button className="p-action cancel" onClick={(e) => { e.stopPropagation(); onToggleProgressStatus(todoId, p.id, 'cancelled'); }} title="作废">&#x2717;</button>
                </span>
              )}
              {manageMode && (
                <span className={`progress-check-circle ${selectedPIds.has(p.id) ? 'checked' : ''}`}>
                  {selectedPIds.has(p.id) ? '\u2713' : ''}
                </span>
              )}
              <span className="progress-date">
                {new Date(p.createdAt || p.time).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
              </span>
              <span className="progress-text">{p.text}</span>
            </div>
          ))}
        </div>
      )}

      {!inBatch && (
        <div className="todo-progress-bar">
          {manageMode ? (
            <div className="progress-manage-bar">
              {confirmDelete ? (
                <>
                  <span style={{ color: 'var(--danger)', fontWeight: 500, fontSize: 12 }}>确认删除 {selectedPIds.size} 条进度？</span>
                  <button className="btn-mini btn-mini-save" onClick={handleBatchDelete} style={{ background: 'var(--danger)', fontSize: 11 }}>确认删除</button>
                  <button className="btn-mini btn-mini-cancel" onClick={() => setConfirmDelete(false)}>取消</button>
                </>
              ) : (
                <>
                  <button
                    className="btn-mini btn-mini-save"
                    onClick={handleBatchComplete}
                    disabled={selectedPIds.size === 0}
                    style={{ opacity: selectedPIds.size === 0 ? 0.4 : 1, fontSize: 11, background: 'var(--success)' }}
                  >
                    完成 ({selectedPIds.size})
                  </button>
                  <button
                    className="btn-mini btn-mini-save"
                    onClick={handleBatchCancel}
                    disabled={selectedPIds.size === 0}
                    style={{ opacity: selectedPIds.size === 0 ? 0.4 : 1, fontSize: 11, background: 'var(--text-secondary)' }}
                  >
                    作废 ({selectedPIds.size})
                  </button>
                  <button
                    className="btn-mini btn-mini-save"
                    onClick={handleBatchDelete}
                    disabled={selectedPIds.size === 0}
                    style={{ opacity: selectedPIds.size === 0 ? 0.4 : 1, fontSize: 11, background: 'var(--danger)' }}
                  >
                    删除 ({selectedPIds.size})
                  </button>
                  <button className="btn-mini btn-mini-cancel" onClick={exitManage}>取消</button>
                </>
              )}
            </div>
          ) : (
            <>
              {!showInput ? (
                <>
                  <button className="btn-mini btn-add-progress" onClick={() => setShowInput(true)}>
                    + 添加进度
                  </button>
                  {allCount > 0 && (
                    <button className="btn-mini btn-add-progress" onClick={() => { setManageMode(true); setConfirmDelete(false); }}>
                      管理进度
                    </button>
                  )}
                </>
              ) : (
                <>
                  <input
                    type="text"
                    placeholder="输入工作进度..."
                    value={progressText}
                    onChange={e => setProgressText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    autoFocus
                  />
                  <button className="btn-mini btn-mini-save" onClick={handleSubmit}>保存</button>
                  <button className="btn-mini btn-mini-cancel" onClick={() => setShowInput(false)}>&times;</button>
                </>
              )}
            </>
          )}
        </div>
      )}

      {archivedProgress.length > 0 && (
        <div className="progress-archive">
          <div className="archive-toggle" onClick={() => setShowArchived(!showArchived)}>
            <span className={`triangle ${showArchived ? 'open' : ''}`}>&#x25B6;</span>
            <span>已归档进度 ({archivedProgress.length})</span>
          </div>
          {showArchived && (
            <div className="progress-log archived">
              {archivedProgress.map(p => (
                <div
                  key={p.id}
                  className={`progress-entry ${p.status} ${manageMode ? 'progress-manage' : ''} ${selectedPIds.has(p.id) ? 'progress-selected' : ''}`}
                  onClick={manageMode ? () => toggleSelect(p.id) : undefined}
                >
                  {!inBatch && !manageMode && (
                    <span className="progress-actions">
                      <button className="p-action undo" onClick={(e) => { e.stopPropagation(); onToggleProgressStatus(todoId, p.id, p.status); }} title="恢复">&#x21A9;</button>
                    </span>
                  )}
                  {manageMode && (
                    <span className={`progress-check-circle ${selectedPIds.has(p.id) ? 'checked' : ''}`}>
                      {selectedPIds.has(p.id) ? '\u2713' : ''}
                    </span>
                  )}
                  <span className="progress-status-tag">{p.status === 'completed' ? '已完成' : '已作废'}</span>
                  <span className="progress-date">
                    {new Date(p.createdAt || p.time).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
                  </span>
                  {p.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function TodoItem({ todo, onToggleStatus, onAddProgress, onToggleProgressStatus, onDeleteProgress, onUpdateTodo, onDragStart, onBatchToggle, isDragging, isSelected, batchMode, isArchive }) {
  const overdue = todo.status === 'active' && isOverdue(todo.dueDate);
  const statusClass = todo.status === 'completed' ? 'completed'
    : todo.status === 'cancelled' ? 'cancelled'
    : overdue ? 'overdue'
    : '';

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

  const movePress = useCallback(() => {
    pressMoved.current = true;
  }, []);

  const cancelPress = useCallback(() => {
    if (pressTimer.current) {
      clearTimeout(pressTimer.current);
      pressTimer.current = null;
      if (!pressMoved.current && !clickHandled.current && onBatchToggle) {
        clickHandled.current = true;
        onBatchToggle(todo.id);
      }
    }
  }, [todo.id, onBatchToggle]);

  return (
    <div
      className={`todo-item ${statusClass} ${isDragging ? 'dragging' : ''} ${isSelected ? 'selected' : ''} ${batchMode ? 'batch-mode' : ''}`}
      onClick={batchMode ? () => onBatchToggle(todo.id) : undefined}
    >
      <div className="todo-header">
        {batchMode && (
          <div className="batch-check">
            <span className={`check-circle ${isSelected ? 'checked' : ''}`}>
              {isSelected ? '✓' : ''}
            </span>
          </div>
        )}
        <div className="todo-content">
          <div style={{ marginBottom: 3 }}>
            <InlineEdit
              value={todo.title}
              onSave={(val) => onUpdateTodo(todo.id, { title: val })}
              placeholder="待办内容"
              inBatch={batchMode}
            />
          </div>
          <div className="todo-meta">
            <DateEdit
              value={todo.dueDate}
              onSave={(val) => onUpdateTodo(todo.id, { dueDate: val })}
              overdue={overdue}
              inBatch={batchMode}
            />
            <span className="todo-date" style={{ color: '#ccc' }}>
              {formatDate(todo.createdAt)}
            </span>
            <TagsEdit
              tags={todo.tags}
              onSave={(tags) => onUpdateTodo(todo.id, { tags })}
              inBatch={batchMode}
            />
          </div>
        </div>

        <div className="todo-actions">
          {!batchMode && todo.status === 'active' && (
            <>
              <button className="btn-action done" onClick={() => onToggleStatus(todo.id, 'completed')} title="完成">&#x2713;</button>
              <button className="btn-action cancel" onClick={() => onToggleStatus(todo.id, 'cancelled')} title="作废">&#x2717;</button>
            </>
          )}
          {!batchMode && todo.status !== 'active' && (
            <button className="btn-action undo" onClick={() => onToggleStatus(todo.id, todo.status)} title="恢复">&#x21A9;</button>
          )}
        </div>

        <div
          className={`drag-handle ${batchMode ? 'disabled' : ''}`}
          onTouchStart={!batchMode ? startPress : undefined}
          onTouchMove={!batchMode ? movePress : undefined}
          onTouchEnd={!batchMode ? cancelPress : undefined}
          onMouseDown={!batchMode ? startPress : undefined}
          onMouseMove={!batchMode ? movePress : undefined}
          onMouseUp={!batchMode ? cancelPress : undefined}
          onMouseLeave={!batchMode ? cancelPress : undefined}
          title={batchMode ? '' : '长按拖动排序'}
        >
          <span className="drag-handle-icon">{batchMode ? '☰' : '⠿'}</span>
        </div>
      </div>

      {!isArchive && todo.status === 'active' && (
        <ProgressLog
          progress={todo.progress}
          todoId={todo.id}
          onToggleProgressStatus={onToggleProgressStatus}
          onDeleteProgress={onDeleteProgress}
          onAddProgress={onAddProgress}
          inBatch={batchMode}
        />
      )}

      {isArchive && (todo.progress && todo.progress.length > 0) && (
        <div className="progress-log">
          {todo.progress.map(p => (
            <div key={p.id} className={`progress-entry ${p.status}`}>
              <span className="progress-status-tag">{p.status === 'completed' ? '已完成' : '已作废'}</span>
              <span className="progress-date">
                {new Date(p.createdAt || p.time).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}
              </span>
              {p.text}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
