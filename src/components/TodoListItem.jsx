import TodoItem from './TodoItem';

export default function TodoListItem({ todo, dragId, dropIdx, dragFromIdx, filteredTodos, setItemRef, onToggleStatus, onAddProgress, onToggleProgressStatus, onDeleteProgress, onUpdateProgress, onUpdateProgressCompletedAt, onUpdateTodo, onDragStart, onBatchToggle, isSelected, batchMode, isArchive }) {
  const isDragged = dragId === todo.id;
  const itemIdx = filteredTodos.findIndex(t => t.id === todo.id);

  const showInsertBefore = dragId && !isDragged && dropIdx === itemIdx && dropIdx < dragFromIdx;
  const showInsertAfter = dragId && !isDragged && dropIdx >= 0 && dropIdx === itemIdx && dropIdx >= dragFromIdx;

  return (
    <div key={todo.id}>
      {showInsertBefore && <div className="drop-indicator" />}
      <div ref={(el) => setItemRef(todo.id, el)}>
        <TodoItem
          todo={todo}
          onToggleStatus={onToggleStatus}
          onAddProgress={onAddProgress}
          onToggleProgressStatus={onToggleProgressStatus}
          onDeleteProgress={onDeleteProgress}
          onUpdateProgress={onUpdateProgress}
          onUpdateProgressCompletedAt={onUpdateProgressCompletedAt}
          onUpdateTodo={onUpdateTodo}
          onDragStart={onDragStart}
          onBatchToggle={onBatchToggle}
          isDragging={isDragged}
          isSelected={isSelected}
          batchMode={batchMode}
          isArchive={isArchive}
        />
      </div>
      {showInsertAfter && !showInsertBefore && <div className="drop-indicator" />}
    </div>
  );
}
