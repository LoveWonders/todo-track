import { useState, useEffect, useCallback, useRef } from 'react';
import { loadData, saveData, migrateFromLocalStorage } from '../utils/storage';

let nextId = Date.now();

export function useTodos() {
  const [todos, setTodos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const saveTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await migrateFromLocalStorage();
      const data = await loadData();
      if (cancelled) return;
      const migrated = data.map(t => {
        let dueDate = t.dueDate;
        if (dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
          dueDate = dueDate + 'T23:59:59';
        }
        let startDate = t.startDate;
        if (startDate == null && dueDate) {
          startDate = dueDate;
        }
        return { ...t, dueDate, startDate };
      });
      if (migrated.length > 0) {
        nextId = Math.max(...migrated.map(t => t.id), nextId) + 1;
      }
      setTodos(migrated);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveData(todos);
    }, 100);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [todos, loaded]);

  const addTodo = useCallback(({ title, startDate, dueDate, tags }) => {
    const todo = {
      id: nextId++,
      title,
      startDate: startDate || null,
      dueDate: dueDate || null,
      tags: tags || [],
      status: 'active',
      createdAt: new Date().toISOString(),
      progress: [],
    };
    setTodos(prev => [...prev, todo]);
  }, []);

  const updateTodo = useCallback((id, updates) => {
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, ...updates } : t
    ));
  }, []);

  const deleteTodo = useCallback((id) => {
    setTodos(prev => prev.filter(t => t.id !== id));
  }, []);

  const moveTodoTo = useCallback((id, toIndex) => {
    setTodos(prev => {
      const fromIdx = prev.findIndex(t => t.id === id);
      if (fromIdx === -1 || fromIdx === toIndex) return prev;
      const next = [...prev];
      const [item] = next.splice(fromIdx, 1);
      next.splice(toIndex, 0, item);
      return next;
    });
  }, []);

  const toggleStatus = useCallback((id, newStatus) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== id) return t;
      const willBeArchived = t.status === 'active' && newStatus !== 'active';
      const willBeRestored = t.status !== 'active' && newStatus !== t.status;
      return {
        ...t,
        status: t.status === newStatus ? 'active' : newStatus,
        completedAt: willBeArchived ? new Date().toISOString()
          : willBeRestored ? null
          : t.completedAt,
      };
    }));
  }, []);

  const addProgress = useCallback((id, text) => {
    if (!text.trim()) return;
    setTodos(prev => prev.map(t =>
      t.id === id ? {
        ...t,
        progress: [...(t.progress || []), {
          id: Date.now(),
          text: text.trim(),
          createdAt: new Date().toISOString(),
          status: 'active',
        }]
      } : t
    ));
  }, []);

  const toggleProgressStatus = useCallback((todoId, progressId, newStatus) => {
    setTodos(prev => prev.map(t =>
      t.id === todoId ? {
        ...t,
        progress: (t.progress || []).map(p => {
          if (p.id !== progressId) return p;
          const willBeArchived = p.status === 'active' && newStatus !== 'active';
          const willBeRestored = p.status !== 'active' && newStatus !== p.status;
          return {
            ...p,
            status: p.status === newStatus ? 'active' : newStatus,
            completedAt: willBeArchived ? new Date().toISOString()
              : willBeRestored ? null
              : p.completedAt,
          };
        })
      } : t
    ));
  }, []);

  const deleteProgress = useCallback((todoId, progressId) => {
    setTodos(prev => prev.map(t =>
      t.id === todoId ? {
        ...t,
        progress: (t.progress || []).filter(p => p.id !== progressId)
      } : t
    ));
  }, []);

  const updateProgress = useCallback((todoId, progressId, text) => {
    setTodos(prev => prev.map(t =>
      t.id === todoId ? {
        ...t,
        progress: (t.progress || []).map(p =>
          p.id === progressId ? { ...p, text: text.trim() } : p
        )
      } : t
    ));
  }, []);

  const updateProgressCompletedAt = useCallback((todoId, progressId, dateString) => {
    const isoString = new Date(dateString + 'T12:00:00').toISOString();
    setTodos(prev => prev.map(t =>
      t.id === todoId ? {
        ...t,
        progress: (t.progress || []).map(p =>
          p.id === progressId ? { ...p, status: 'completed', completedAt: isoString } : p
        )
      } : t
    ));
  }, []);

  const updateCompletedAt = useCallback((id, dateString) => {
    const isoString = new Date(dateString + 'T12:00:00').toISOString();
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'completed', completedAt: isoString } : t
    ));
  }, []);

  const importTodos = useCallback((importData, strategy) => {
    setTodos(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      let merged;
      if (strategy === 'overwrite') {
        const overwriteSet = new Set(importData.filter(t => existingIds.has(t.id)).map(t => t.id));
        merged = [...prev.filter(t => !overwriteSet.has(t.id)), ...importData];
      } else {
        merged = [...prev, ...importData.filter(t => !existingIds.has(t.id))];
      }
      const maxId = Math.max(...merged.map(t => t.id), 0);
      nextId = maxId + 1;
      return merged;
    });
  }, []);

  const activeTodos = todos.filter(t => t.status === 'active');
  const archivedTodos = todos.filter(t => t.status !== 'active');
  const allTags = [...new Set(todos.flatMap(t => t.tags))].sort();

  return { todos, activeTodos, archivedTodos, loaded, addTodo, updateTodo, deleteTodo, moveTodoTo, toggleStatus, addProgress, toggleProgressStatus, deleteProgress, updateProgress, updateProgressCompletedAt, updateCompletedAt, importTodos, allTags };
}
