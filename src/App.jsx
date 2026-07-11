import { useState, useCallback, useRef, useEffect } from 'react';
import { useTodos } from './hooks/useTodos';
import TodoInput from './components/TodoInput';
import TodoItem from './components/TodoItem';
import TagFilter from './components/TagFilter';
import BatchBar from './components/BatchBar';

export default function App() {
  const { todos, activeTodos, archivedTodos, addTodo, updateTodo, deleteTodo, moveTodoTo, toggleStatus, addProgress, toggleProgressStatus, deleteProgress, allTags } = useTodos();
  const [activeTag, setActiveTag] = useState(null);
  const [view, setView] = useState('active');
  const [dragId, setDragId] = useState(null);
  const [dragY, setDragY] = useState(0);
  const [dropIdx, setDropIdx] = useState(-1);
  const dragFromIdxRef = useRef(-1);
  const lastTargetRef = useRef(-1);
  const itemElsRef = useRef({});
  const throttleTimerRef = useRef(null);
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());

  const source = view === 'active' ? activeTodos : archivedTodos;

  const filteredTodos = activeTag
    ? source.filter(t => t.tags.includes(activeTag))
    : source;

  const isArchive = view === 'archive';

  const exitBatch = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const handleBatchToggle = useCallback((id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (selectedIds.size > 0 && !batchMode) {
      setBatchMode(true);
    } else if (selectedIds.size === 0 && batchMode) {
      setBatchMode(false);
    }
  }, [selectedIds, batchMode]);

  const handleDragStart = useCallback((id, coords) => {
    const idx = filteredTodos.findIndex(t => t.id === id);
    if (idx === -1) return;
    dragFromIdxRef.current = idx;
    lastTargetRef.current = idx;
    setDragId(id);
    setDropIdx(idx);
    setDragY(coords.y);
  }, [filteredTodos]);

  const handleDragMove = useCallback((e) => {
    if (!dragId) return;
    e.preventDefault();
    const y = e.touches ? e.touches[0].clientY : e.clientY;
    setDragY(y);

    if (throttleTimerRef.current) return;
    throttleTimerRef.current = setTimeout(() => {
      throttleTimerRef.current = null;
    }, 50);

    let closest = lastTargetRef.current;
    let minDist = Infinity;
    for (const [id, el] of Object.entries(itemElsRef.current)) {
      if (Number(id) === dragId) continue;
      const rect = el.getBoundingClientRect();
      const mid = rect.top + rect.height / 2;
      const dist = Math.abs(y - mid);
      if (dist < minDist) {
        minDist = dist;
        closest = filteredTodos.findIndex(t => t.id === Number(id));
      }
    }
    if (closest !== lastTargetRef.current) {
      lastTargetRef.current = closest;
      setDropIdx(closest);
    }
  }, [dragId, filteredTodos]);

  const handleDragEnd = useCallback(() => {
    if (!dragId) return;
    const fromIdx = dragFromIdxRef.current;
    let toIdx = lastTargetRef.current;
    if (toIdx > fromIdx && fromIdx >= 0) {
      toIdx = Math.min(toIdx, filteredTodos.length - 1);
    }
    if (toIdx !== fromIdx && fromIdx >= 0) {
      moveTodoTo(dragId, toIdx);
    }
    setDragId(null);
    setDropIdx(-1);
    lastTargetRef.current = -1;
    if (throttleTimerRef.current) {
      clearTimeout(throttleTimerRef.current);
      throttleTimerRef.current = null;
    }
  }, [dragId, filteredTodos.length, moveTodoTo]);

  const setItemRef = useCallback((id, el) => {
    if (el) {
      itemElsRef.current[id] = el;
    } else {
      delete itemElsRef.current[id];
    }
  }, []);

  const batchDelete = () => {
    selectedIds.forEach(id => deleteTodo(id));
    exitBatch();
  };

  const batchComplete = () => {
    selectedIds.forEach(id => toggleStatus(id, 'completed'));
    exitBatch();
  };

  const batchCancel = () => {
    selectedIds.forEach(id => toggleStatus(id, 'cancelled'));
    exitBatch();
  };

  const batchSetDate = (date) => {
    selectedIds.forEach(id => updateTodo(id, { dueDate: date }));
  };

  const batchSetTags = (tags) => {
    selectedIds.forEach(id => {
      const todo = todos.find(t => t.id === id);
      if (todo) {
        const existing = new Set(todo.tags);
        tags.forEach(t => existing.add(t));
        updateTodo(id, { tags: [...existing] });
      }
    });
  };

  const batchAddProgress = (text) => {
    selectedIds.forEach(id => addProgress(id, text));
  };

  const renderItem = (todo) => {
    const isDragged = dragId === todo.id;
    const showInsertBefore = dragId && !isDragged && dropIdx === filteredTodos.findIndex(t => t.id === todo.id) && dropIdx < dragFromIdxRef.current;
    const showInsertAfter = dragId && !isDragged && (() => {
      if (dropIdx < 0) return false;
      const afterIdx = filteredTodos.findIndex(t => t.id === todo.id);
      return dropIdx === afterIdx && dropIdx >= dragFromIdxRef.current;
    })();

    return (
      <div key={todo.id}>
        {showInsertBefore && <div className="drop-indicator" />}
        <div ref={(el) => setItemRef(todo.id, el)}>
          <TodoItem
            todo={todo}
            onToggleStatus={toggleStatus}
            onAddProgress={addProgress}
            onToggleProgressStatus={toggleProgressStatus}
            onDeleteProgress={deleteProgress}
            onUpdateTodo={updateTodo}
            onDragStart={handleDragStart}
            onBatchToggle={handleBatchToggle}
            isDragging={isDragged}
            isSelected={selectedIds.has(todo.id)}
            batchMode={batchMode}
            isArchive={isArchive}
          />
        </div>
        {showInsertAfter && !showInsertBefore && <div className="drop-indicator" />}
      </div>
    );
  };

  return (
    <div
      className="app-shell"
      onTouchMove={handleDragMove}
      onTouchEnd={handleDragEnd}
      onMouseMove={handleDragMove}
      onMouseUp={handleDragEnd}
    >
      <header className="app-header">
        <h1>待办</h1>
        {dragId && (
          <span style={{ fontSize: 12, color: 'var(--accent)' }}>拖动排序中...</span>
        )}
        {batchMode && (
          <span style={{ fontSize: 12, color: 'var(--accent)' }}>批量操作</span>
        )}
      </header>

      <div className="view-tabs">
        <button
          className={`view-tab ${view === 'active' ? 'active' : ''}`}
          onClick={() => { setView('active'); exitBatch(); }}
        >
          进行中 ({activeTodos.length})
        </button>
        <button
          className={`view-tab ${view === 'archive' ? 'active' : ''}`}
          onClick={() => { setView('archive'); exitBatch(); }}
        >
          归档 ({archivedTodos.length})
        </button>
      </div>

      {allTags.length > 0 && !dragId && !batchMode && (
        <TagFilter tags={allTags} activeTag={activeTag} onSelectTag={setActiveTag} />
      )}

      <div className="todo-scroll">
        <div className="todo-list">
          {filteredTodos.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">&#x1F4CB;</div>
              <p>{isArchive ? '暂无归档待办' : '暂无待办事项'}</p>
              {!isArchive && <p style={{ fontSize: 12, marginTop: 8 }}>长按待办可拖动排序</p>}
            </div>
          ) : (
            filteredTodos.map((todo) => renderItem(todo))
          )}
        </div>
        <div className="scroll-spacer" />
      </div>

      {dragId && (
        <div
          className="drag-overlay"
          style={{
            position: 'fixed',
            left: '50%',
            top: dragY - 40,
            transform: 'translateX(-50%)',
            width: 'calc(min(480px, 100vw) - 24px)',
            zIndex: 100,
            pointerEvents: 'none',
            opacity: 0.92,
          }}
        >
          <div className="todo-item drag-floating" style={{ borderLeftColor: 'var(--accent)', boxShadow: '0 8px 24px rgba(0,0,0,0.15)' }}>
            <div className="todo-text">{filteredTodos.find(t => t.id === dragId)?.title}</div>
          </div>
        </div>
      )}

      {batchMode ? (
        <BatchBar
          count={selectedIds.size}
          onCancel={exitBatch}
          onDelete={batchDelete}
          onComplete={batchComplete}
          onCancelItems={batchCancel}
          onSetDate={batchSetDate}
          onSetTags={batchSetTags}
          onAddProgress={batchAddProgress}
        />
      ) : (
        <TodoInput onAdd={addTodo} />
      )}
    </div>
  );
}
