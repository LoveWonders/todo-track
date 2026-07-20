import { useState, useCallback, useEffect } from 'react';
import { useTodos } from './hooks/useTodos';
import { useBackButton } from './hooks/useBackButton';
import useFilteredTodos from './hooks/useFilteredTodos';
import useDragSort from './hooks/useDragSort';
import useBatchActions from './hooks/useBatchActions';
import TodoInput from './components/TodoInput';
import TodoListItem from './components/TodoListItem';
import TagFilterBar from './components/TagFilterBar';
import WeeklyReport from './components/WeeklyReport';
import CompleteDateModal from './components/CompleteDateModal';
import DataMenu from './components/DataMenu';
import BatchBar from './components/BatchBar';

export default function App() {
  const { todos, activeTodos, archivedTodos, addTodo, updateTodo, deleteTodo, moveTodoTo, toggleStatus, addProgress, toggleProgressStatus, deleteProgress, updateProgress, updateProgressCompletedAt, updateCompletedAt, importTodos, allTags } = useTodos();
  const [filterConfig, setFilterConfig] = useState({ includeTags: [], excludeTags: [] });
  const [view, setView] = useState('active');
  const [batchMode, setBatchMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [showCompleteDateModal, setShowCompleteDateModal] = useState(false);

  const source = view === 'active' ? activeTodos : archivedTodos;
  const isArchive = view === 'archive';

  const filteredTodos = useFilteredTodos(source, filterConfig);

  const exitBatch = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  const exitPrompt = useBackButton({ view, setView, batchMode, exitBatch });

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

  const {
    dragId, dragY, dropIdx, dragFromIdx,
    handleDragStart, handleDragMove, handleDragEnd, setItemRef,
  } = useDragSort(filteredTodos, moveTodoTo);

  const {
    batchDelete, batchComplete, batchCancel, batchSetDate,
    batchSetTags, batchAddProgress, batchCompleteAt, selectAll, invertSelection,
  } = useBatchActions(selectedIds, setSelectedIds, filteredTodos, source, exitBatch, deleteTodo, toggleStatus, updateTodo, addProgress, updateCompletedAt);

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
        <div className="app-header-right">
          {dragId && (
            <span style={{ fontSize: 12, color: 'var(--accent)' }}>拖动排序中...</span>
          )}
          {batchMode && (
            <span style={{ fontSize: 12, color: 'var(--accent)' }}>批量操作</span>
          )}
          <DataMenu todos={todos} onImport={importTodos} />
        </div>
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
        <button
          className={`view-tab ${view === 'weekly' ? 'active' : ''}`}
          onClick={() => { setView('weekly'); exitBatch(); }}
        >
          周报
        </button>
      </div>

      {allTags.length > 0 && !dragId && !batchMode && view !== 'weekly' && (
        <TagFilterBar allTags={allTags} onFilterChange={setFilterConfig} />
      )}

      {view === 'weekly' ? (
        <WeeklyReport todos={todos} />
      ) : (
        <div className="todo-scroll">
          <div className="todo-list">
            {filteredTodos.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">&#x1F4CB;</div>
                <p>{isArchive ? '暂无归档待办' : '暂无待办事项'}</p>
                {!isArchive && <p style={{ fontSize: 12, marginTop: 8 }}>长按待办可拖动排序</p>}
              </div>
            ) : (
              filteredTodos.map((todo) => (
                <TodoListItem
                  key={todo.id}
                  todo={todo}
                  dragId={dragId}
                  dropIdx={dropIdx}
                  dragFromIdx={dragFromIdx}
                  filteredTodos={filteredTodos}
                  setItemRef={setItemRef}
                  onToggleStatus={toggleStatus}
                  onAddProgress={addProgress}
                  onToggleProgressStatus={toggleProgressStatus}
                  onDeleteProgress={deleteProgress}
                  onUpdateProgress={updateProgress}
                  onUpdateProgressCompletedAt={updateProgressCompletedAt}
                  onUpdateTodo={updateTodo}
                  onDragStart={handleDragStart}
                  onBatchToggle={handleBatchToggle}
                  isSelected={selectedIds.has(todo.id)}
                  batchMode={batchMode}
                  isArchive={isArchive}
                />
              ))
            )}
          </div>
          <div className="scroll-spacer" />
        </div>
      )}

      {view !== 'weekly' && dragId && (
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

      {view !== 'weekly' && (
        batchMode ? (
          <BatchBar
            count={selectedIds.size}
            total={filteredTodos.length}
            onCancel={exitBatch}
            onDelete={batchDelete}
            onComplete={batchComplete}
            onCancelItems={batchCancel}
            onSetDate={batchSetDate}
            onSetTags={batchSetTags}
            onAddProgress={batchAddProgress}
            onOpenCompleteDateModal={() => setShowCompleteDateModal(true)}
            onSelectAll={selectAll}
            onInvertSelection={invertSelection}
          />
        ) : (
          <TodoInput onAdd={addTodo} />
        )
      )}

      {showCompleteDateModal && (
        <CompleteDateModal
          count={selectedIds.size}
          onConfirm={(dateString) => { batchCompleteAt(dateString); setShowCompleteDateModal(false); }}
          onCancel={() => setShowCompleteDateModal(false)}
        />
      )}

      {exitPrompt && (
        <div className="exit-toast-wrapper" onClick={() => {}}>
          <div className="exit-toast">
            <span className="exit-toast-text">再按一次退出应用</span>
            <div className="exit-toast-bar">
              <div className="exit-toast-bar-inner" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
