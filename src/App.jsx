import { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { DndContext, DragOverlay, PointerSensor, TouchSensor, KeyboardSensor, useSensor, useSensors, closestCenter } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useTodos } from './hooks/useTodos';
import { useBackButton } from './hooks/useBackButton';
import useFilteredTodos from './hooks/useFilteredTodos';
import useBatchActions from './hooks/useBatchActions';
import useModalManager from './hooks/useModalManager';
import { TodoProvider } from './hooks/TodoContext';
import { SettingsProvider } from './hooks/useSettings';
import TodoInput from './components/TodoInput';
import TodoListItem from './components/TodoListItem';
import TagFilterBar from './components/TagFilterBar';
import WeeklyReport from './components/WeeklyReport';
import CompleteDateModal from './components/CompleteDateModal';
import DataMenu from './components/DataMenu';
import BatchBar from './components/BatchBar';
import PerformanceTester from './components/PerformanceTester';
import SettingsModal from './components/SettingsModal';
import { loadArchive, saveArchive } from './utils/autoArchive';
import { formatDate } from './utils/dateParser';

export default function App() {
  const { todos, activeTodos, archivedTodos, addTodo, updateTodo, deleteTodo, moveTodoTo, toggleStatus, addProgress, toggleProgressStatus, deleteProgress, updateProgress, updateProgressCompletedAt, updateCompletedAt, importTodos, allTags } = useTodos();
  const [filterConfig, setFilterConfig] = useState({ includeTags: [], excludeTags: [] });
  const [view, setView] = useState('active');
  const [dragId, setDragId] = useState(null);
  const [devMode, setDevMode] = useState(false);
  const [archiveData, setArchiveData] = useState([]);
  const [showArchivedHistory, setShowArchivedHistory] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    const stored = loadArchive();
    if (stored.length > 0) setArchiveData(stored);
  }, []);

  const source = view === 'active' ? activeTodos : archivedTodos;
  const isArchive = view === 'archive';
  const filteredTodos = useFilteredTodos(source, filterConfig);

  const {
    batchMode, selectedIds, exitBatch, handleBatchToggle,
    batchDelete, batchComplete, batchCancel, batchSetDate,
    batchSetTags, batchAddProgress, batchCompleteAt, selectAll, invertSelection,
  } = useBatchActions(filteredTodos, source, deleteTodo, toggleStatus, updateTodo, addProgress, updateCompletedAt);

  const exitPrompt = useBackButton({ view, setView, batchMode, exitBatch });
  const { showCompleteDateModal, openCompleteDateModal, closeCompleteDateModal } = useModalManager();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 400, tolerance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const todosRef = useRef(todos);
  todosRef.current = todos;

  const handleDragStart = useCallback((event) => {
    setDragId(event.active.id);
  }, []);

  const handleDragEnd = useCallback((event) => {
    setDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const newIndex = todosRef.current.findIndex(t => t.id === over.id);
    if (newIndex === -1) return;
    moveTodoTo(active.id, newIndex);
  }, [moveTodoTo]);

  const handleDragCancel = useCallback(() => {
    setDragId(null);
  }, []);

  const moveTodoToTop = useCallback((id) => {
    moveTodoTo(id, 0);
  }, [moveTodoTo]);

  const moveTodoToBottom = useCallback((id) => {
    moveTodoTo(id, todosRef.current.length - 1);
  }, [moveTodoTo]);

  const restoreFromArchive = useCallback((item) => {
    const archive = loadArchive();
    const updated = archive.filter(a => a.id !== item.id);
    saveArchive(updated);
    setArchiveData(updated);
    const restored = { ...item, status: 'active', completedAt: null };
    importTodos([restored], 'skip');
  }, [importTodos]);

  const actionsValue = useMemo(() => ({
    updateTodo, toggleStatus, addProgress, toggleProgressStatus,
    deleteProgress, updateProgress, updateProgressCompletedAt,
    handleBatchToggle, moveTodoToTop, moveTodoToBottom,
  }), [updateTodo, toggleStatus, addProgress, toggleProgressStatus,
    deleteProgress, updateProgress, updateProgressCompletedAt,
    handleBatchToggle, moveTodoToTop, moveTodoToBottom]);

  const viewValue = useMemo(() => ({
    batchMode, isArchive, devMode,
  }), [batchMode, isArchive, devMode]);

  const sortableIds = useMemo(() => filteredTodos.map(t => t.id), [filteredTodos]);

  const draggedTodo = dragId ? todos.find(t => t.id === dragId) : null;

  return (
    <SettingsProvider>
    <div className="app-shell">
      <header className="app-header">
        <h1>待办</h1>
        <div className="app-header-right">
          {dragId && (
            <span style={{ fontSize: 12, color: 'var(--accent)' }}>拖动排序中...</span>
          )}
          {batchMode && (
            <span style={{ fontSize: 12, color: 'var(--accent)' }}>批量操作</span>
          )}
          <DataMenu todos={todos} onImport={importTodos} devMode={devMode} onToggleDev={setDevMode} onOpenSettings={() => setSettingsOpen(true)} />
        </div>
      </header>

      <div className="view-tabs">
        <button
          className={`view-tab ${view === 'active' ? 'active' : ''}`}
          onClick={() => { setView('active'); exitBatch(); setShowArchivedHistory(false); }}
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
          onClick={() => { setView('weekly'); exitBatch(); setShowArchivedHistory(false); }}
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
        <TodoProvider actions={actionsValue} view={viewValue}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            <div className="todo-scroll">
              <div className="todo-list">
                {filteredTodos.length === 0 && !showArchivedHistory ? (
                  <div className="empty-state">
                    <div className="empty-icon">&#x1F4CB;</div>
                    <p>{isArchive ? '暂无归档待办' : '暂无待办事项'}</p>
                    {!isArchive && <p style={{ fontSize: 12, marginTop: 8 }}>长按待办可拖动排序</p>}
                  </div>
                ) : (
                  <>
                    {filteredTodos.length > 0 && (
                      <SortableContext items={sortableIds} strategy={verticalListSortingStrategy}>
                        {filteredTodos.map((todo) => (
                          <TodoListItem
                            key={todo.id}
                            todo={todo}
                            selectedIds={selectedIds}
                          />
                        ))}
                      </SortableContext>
                    )}

                    {isArchive && showArchivedHistory && (
                      <div className="archive-history-section">
                        <div className="archive-history-header">
                          <span>归档历史记录 ({archiveData.length})</span>
                        </div>
                        {archiveData.length === 0 ? (
                          <div className="archive-history-empty">暂无已归档的待办记录</div>
                        ) : (
                          archiveData.map((item) => (
                            <div key={item.id} className="archive-history-item">
                              <div className="archive-history-content">
                                <div className="archive-history-title">{item.title}</div>
                                <div className="archive-history-meta">
                                  <span className="archive-history-date">
                                    {formatDate(item.completedAt || item.createdAt)}
                                  </span>
                                  <span className="archive-history-status">
                                    {item.status === 'completed' ? '已完成' : '已作废'}
                                  </span>
                                </div>
                              </div>
                              <button
                                className="archive-history-restore"
                                onClick={() => restoreFromArchive(item)}
                                title="恢复"
                              >
                                &#x21A9;
                              </button>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}

                {isArchive && (
                  <div className="archive-more-wrap">
                    <button
                      className="archive-more-btn"
                      onClick={() => setShowArchivedHistory(!showArchivedHistory)}
                    >
                      {showArchivedHistory ? '收起归档历史' : `更多归档记录 (${archiveData.length})`}
                    </button>
                  </div>
                )}
              </div>
              <div className="scroll-spacer" />
            </div>
            <DragOverlay dropAnimation={null}>
              {draggedTodo ? (
                <div
                  className="todo-item drag-flying"
                  style={{
                    width: 'calc(min(480px, 100vw) - 24px)',
                    opacity: 0.92,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                    borderLeftColor: 'var(--accent)',
                  }}
                >
                  <div className="todo-text">{draggedTodo.title}</div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </TodoProvider>
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
            onOpenCompleteDateModal={openCompleteDateModal}
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
          onConfirm={(dateString) => { batchCompleteAt(dateString); closeCompleteDateModal(); }}
          onCancel={closeCompleteDateModal}
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

      <PerformanceTester
        todos={todos}
        importTodos={importTodos}
        deleteTodo={deleteTodo}
        visible={devMode}
      />

      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
    </div>
    </SettingsProvider>
  );
}
