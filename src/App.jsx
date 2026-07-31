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
import TaskBottomSheet from './components/TaskBottomSheet';
import FloatingActionButton from './components/FloatingActionButton';
import PullToRefresh from './components/PullToRefresh';
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
  const [bottomSheetOpen, setBottomSheetOpen] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    const stored = loadArchive();
    if (stored.length > 0) setArchiveData(stored);
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await new Promise(resolve => setTimeout(resolve, 500));
    const stored = loadArchive();
    if (stored.length > 0) setArchiveData(stored);
    setIsRefreshing(false);
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
  const { showCompleteDateModal, openCompleteDateModal: batchOpenCompleteDateModal, closeCompleteDateModal } = useModalManager();

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
      <TodoProvider>
        <PullToRefresh onRefresh={handleRefresh}>
          <div className="app">
            <header className="app-header">
              <DataMenu
                todos={todos}
                activeTodos={activeTodos}
                archivedTodos={archivedTodos}
                importTodos={importTodos}
                archiveData={archiveData}
                setArchiveData={setArchiveData}
                deleteTodo={deleteTodo}
                toggleStatus={toggleStatus}
                moveTodoTo={moveTodoTo}
                addProgress={addProgress}
                updateProgressCompletedAt={updateProgressCompletedAt}
                deleteProgress={deleteProgress}
                updateCompletedAt={updateCompletedAt}
                showArchivedHistory={showArchivedHistory}
                setShowArchivedHistory={setShowArchivedHistory}
              />
            </header>

            {view === 'report' ? (
              <WeeklyReport todos={todos} onBack={() => setView('active')} />
            ) : (
              <div className="todo-list-container">
                <TagFilterBar
                  allTags={allTags}
                  filterConfig={filterConfig}
                  onFilterChange={setFilterConfig}
                />
                {batchMode && (
                <BatchBar
                  selectedCount={selectedIds.size}
                  onExit={exitBatch}
                  onDelete={batchDelete}
                  onComplete={batchOpenCompleteDateModal}
                  onCancel={batchCancel}
                  onAddProgress={batchAddProgress}
                  onSetDate={batchSetDate}
                  onSetTags={batchSetTags}
                  onSelectAll={selectAll}
                  onInvert={invertSelection}
                />
                )}
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragStart={({ active }) => {
                    if (batchMode) return;
                    setDragId(active.id);
                  }}
                  onDragEnd={({ active, over }) => {
                    setDragId(null);
                    if (batchMode || !over) return;
                    const activeId = active.id;
                    const overId = over.id;
                    if (activeId === overId) return;
                    const fromIndex = source.findIndex(t => t.id === activeId);
                    const toIndex = source.findIndex(t => t.id === overId);
                    moveTodoTo(activeId, toIndex);
                  }}
                >
                  <SortableContext items={source.map(t => t.id)} strategy={verticalListSortingStrategy}>
                    <div className="todo-scroll">
                      {filteredTodos.map(todo => (
                        <TodoListItem
                          key={todo.id}
                          todo={todo}
                          inBatch={batchMode}
                          isSelected={selectedIds.has(todo.id)}
                          onToggleBatch={() => handleBatchToggle(todo.id)}
                          onUpdate={updateTodo}
                          onDelete={deleteTodo}
                          onToggleStatus={toggleStatus}
                          onAddProgress={addProgress}
                          onToggleProgressStatus={toggleProgressStatus}
                          onDeleteProgress={deleteProgress}
                          onUpdateProgress={updateProgress}
                          onUpdateProgressCompletedAt={updateProgressCompletedAt}
                          onUpdateCompletedAt={updateCompletedAt}
                        />
                      ))}
                      {dragId && (
                        <DragOverlay>
                          <TodoListItem
                            todo={source.find(t => t.id === dragId)}
                          />
                        </DragOverlay>
                      )}
                    </div>
                  </SortableContext>
                </DndContext>
                {batchMode ? (
                  <div className="batch-bottom-spacer" />
                ) : (
                  <FloatingActionButton onClick={() => setBottomSheetOpen(true)} />
                )}
              </div>
            )}

            <TaskBottomSheet
              isOpen={bottomSheetOpen}
              onClose={() => setBottomSheetOpen(false)}
              onAdd={addTodo}
            />

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
        </PullToRefresh>
      </TodoProvider>
    </SettingsProvider>
  );
}
