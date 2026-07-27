import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import TodoItem from './TodoItem';

const TodoListItem = memo(function TodoListItem({ todo, selectedIds }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: todo.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };

  const isSelected = selectedIds.has(todo.id);

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <TodoItem
        todo={todo}
        isDragging={isDragging}
        isSelected={isSelected}
        dragListeners={listeners}
      />
    </div>
  );
}, areEqual);

function areEqual(prev, next) {
  if (prev.todo !== next.todo) return false;
  if (prev.selectedIds.has(prev.todo.id) !== next.selectedIds.has(next.todo.id)) return false;
  return true;
}

export default TodoListItem;
