import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEY = 'todo_app_data';

let nextId = Date.now();

function loadTodos() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (data.length > 0) {
        nextId = Math.max(...data.map(t => t.id), nextId) + 1;
      }
      return data;
    }
  } catch { /* ignore */ }
  return [];
}

function saveTodos(todos) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
  } catch { /* ignore */ }
}

export function useTodos() {
  const [todos, setTodos] = useState(loadTodos);

  useEffect(() => {
    saveTodos(todos);
  }, [todos]);

  const addTodo = useCallback(({ title, dueDate, tags }) => {
    const todo = {
      id: nextId++,
      title,
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

  const activeTodos = todos.filter(t => t.status === 'active');
  const archivedTodos = todos.filter(t => t.status !== 'active');
  const allTags = [...new Set(todos.flatMap(t => t.tags))].sort();

  return { todos, activeTodos, archivedTodos, addTodo, updateTodo, deleteTodo, moveTodoTo, toggleStatus, addProgress, toggleProgressStatus, deleteProgress, allTags };
}
