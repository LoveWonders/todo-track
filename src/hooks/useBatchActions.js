import { useState, useCallback, useEffect } from 'react';

export default function useBatchActions(filteredTodos, sourceTodos, batchUpdateTodos, batchDeleteTodos, batchToggleStatus, addProgress, batchUpdateCompletedAt) {
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
    batchDeleteTodos(selectedIds);
    exitBatch();
  }, [selectedIds, batchDeleteTodos, exitBatch]);

  const batchComplete = useCallback(() => {
    batchToggleStatus([...selectedIds].map(id => ({ id, newStatus: 'completed' })));
    exitBatch();
  }, [selectedIds, batchToggleStatus, exitBatch]);

  const batchCancel = useCallback(() => {
    batchToggleStatus([...selectedIds].map(id => ({ id, newStatus: 'cancelled' })));
    exitBatch();
  }, [selectedIds, batchToggleStatus, exitBatch]);

  const batchSetDate = useCallback((date) => {
    batchUpdateTodos([...selectedIds].map(id => ({ id, updates: { dueDate: date } })));
  }, [selectedIds, batchUpdateTodos]);

  const batchSetTags = useCallback((tags) => {
    const byId = new Map(sourceTodos.map(t => [t.id, t]));
    const entries = [...selectedIds]
      .map(id => {
        const todo = byId.get(id);
        if (!todo) return null;
        const existing = new Set(todo.tags || []);
        tags.forEach(t => existing.add(t));
        return { id, updates: { tags: [...existing] } };
      })
      .filter(Boolean);
    batchUpdateTodos(entries);
  }, [selectedIds, sourceTodos, batchUpdateTodos]);

  const batchAddProgress = useCallback((text) => {
    selectedIds.forEach(id => addProgress(id, text));
  }, [selectedIds, addProgress]);

  const batchCompleteAt = useCallback((dateString) => {
    batchUpdateCompletedAt([...selectedIds].map(id => ({ id, dateString })));
    exitBatch();
  }, [selectedIds, batchUpdateCompletedAt, exitBatch]);

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
