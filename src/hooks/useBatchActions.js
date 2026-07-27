import { useState, useCallback, useEffect } from 'react';

export default function useBatchActions(filteredTodos, sourceTodos, deleteTodo, toggleStatus, updateTodo, addProgress, updateCompletedAt) {
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [batchMode, setBatchMode] = useState(false);

  useEffect(() => {
    if (selectedIds.size > 0 && !batchMode) {
      setBatchMode(true);
    } else if (selectedIds.size === 0 && batchMode) {
      setBatchMode(false);
    }
  }, [selectedIds, batchMode]);

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

  const batchDelete = useCallback(() => {
    if (selectedIds.size === 0) return;
    if (!window.confirm(`确认删除 ${selectedIds.size} 个任务？`)) return;
    selectedIds.forEach(id => deleteTodo(id));
    exitBatch();
  }, [selectedIds, deleteTodo, exitBatch]);

  const batchComplete = useCallback(() => {
    selectedIds.forEach(id => toggleStatus(id, 'completed'));
    exitBatch();
  }, [selectedIds, toggleStatus, exitBatch]);

  const batchCancel = useCallback(() => {
    selectedIds.forEach(id => toggleStatus(id, 'cancelled'));
    exitBatch();
  }, [selectedIds, toggleStatus, exitBatch]);

  const batchSetDate = useCallback((date) => {
    selectedIds.forEach(id => updateTodo(id, { dueDate: date }));
  }, [selectedIds, updateTodo]);

  const batchSetTags = useCallback((tags) => {
    selectedIds.forEach(id => {
      const todo = sourceTodos.find(t => t.id === id);
      if (todo) {
        const existing = new Set(todo.tags || []);
        tags.forEach(t => existing.add(t));
        updateTodo(id, { tags: [...existing] });
      }
    });
  }, [selectedIds, sourceTodos, updateTodo]);

  const batchAddProgress = useCallback((text) => {
    selectedIds.forEach(id => addProgress(id, text));
  }, [selectedIds, addProgress]);

  const batchCompleteAt = useCallback((dateString) => {
    selectedIds.forEach(id => updateCompletedAt(id, dateString));
    exitBatch();
  }, [selectedIds, updateCompletedAt, exitBatch]);

  const selectAll = useCallback(() => {
    setSelectedIds(new Set(filteredTodos.map(t => t.id)));
  }, [filteredTodos]);

  const invertSelection = useCallback(() => {
    setSelectedIds(prev => {
      const next = new Set();
      for (const t of filteredTodos) {
        if (!prev.has(t.id)) next.add(t.id);
      }
      return next;
    });
  }, [filteredTodos]);

  return {
    batchMode,
    selectedIds,
    exitBatch,
    handleBatchToggle,
    batchDelete,
    batchComplete,
    batchCancel,
    batchSetDate,
    batchSetTags,
    batchAddProgress,
    batchCompleteAt,
    selectAll,
    invertSelection,
  };
}
