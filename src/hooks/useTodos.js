import { useState, useEffect, useCallback, useRef } from 'react';
import { loadData, saveData, migrateFromLocalStorage } from '../utils/storage';
import { mergeAndArchive } from '../utils/autoArchive';
import { normalizeImportedTodo } from '../utils/normalizeTodo';
import { removeProgressCollapsed } from '../utils/progressViewState';
import { getCycleKey, getWindowStart, isRepeatRule } from '../utils/repeat';
import { scheduleReminder, cancelReminder, rescheduleAll, checkDueReminders, requestNotificationPermission } from '../utils/notification';

const MANUAL_SORT_KEY = 'todo_manual_sort';
const SETTINGS_KEY = 'todo_app_settings';

function autoArchiveEnabled() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) {
      const settings = JSON.parse(raw);
      if (settings && typeof settings === 'object') return settings.autoArchive !== false;
    }
  } catch { /* ignore */ }
  return true;
}

function toSafeIso(dateString) {
  const d = new Date(String(dateString) + 'T12:00:00');
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function applyRepeatTick(list, now, allocateId) {
  const nowIso = now.toISOString();
  let mutated = false;
  const next = list.map(t => {
    if (t.status !== 'active' || !isRepeatRule(t.repeatRule)) return t;
    const key = getCycleKey(t.repeatRule, now);
    if (t.cycleKey === key) return t;
    mutated = true;
    if (!t.cycleKey) {
      return { ...t, cycleKey: key };
    }
    let progress = (t.progress || []).map(p =>
      p.status === 'active' ? { ...p, status: 'cancelled', completedAt: nowIso } : p
    );
    if (t.checklistMode) {
      const templates = [...new Set(
        progress.filter(p => p.status === 'completed' && p.kind !== 'cycle-done' && !p.temporary).map(p => p.text)
      )];
      if (templates.length > 0) {
        progress = [...progress, ...templates.map(text => ({
          id: allocateId(),
          text,
          createdAt: nowIso,
          status: 'active',
        }))];
      }
    }
    return { ...t, cycleKey: key, progress };
  });
  return mutated ? next : list;
}

export function useTodos() {
  const [todos, setTodos] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [isManualMode, setIsManualMode] = useState(() => {
    try {
      return localStorage.getItem(MANUAL_SORT_KEY) === '1';
    } catch {
      return false;
    }
  });
  const saveTimerRef = useRef(null);
  const todoIdRef = useRef(Date.now());
  const progressIdRef = useRef(Date.now());
  const todosRef = useRef(todos);
  todosRef.current = todos;

  useEffect(() => {
    // 首次加载：从 localStorage 恢复数据（仅一次）
    // 组件卸载时取消异步操作，防止内存泄漏
    let cancelled = false;
    (async () => {
      await migrateFromLocalStorage();
      const data = await loadData();
      if (cancelled) return;
      const migrated = data.map(normalizeImportedTodo).filter(Boolean).map(t => {
        let dueDate = t.dueDate;
        if (dueDate && /^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
          dueDate = dueDate + 'T23:59:59';
        }
        let startDate = t.startDate;
        if (startDate == null && dueDate) {
          startDate = dueDate;
        }
        return {
          ...t,
          dueDate,
          startDate,
        };
      });
      const afterArchive = autoArchiveEnabled() ? mergeAndArchive(migrated) : migrated;
      if (afterArchive.length > 0) {
        todoIdRef.current = Math.max(...afterArchive.map(t => t.id), todoIdRef.current) + 1;
        const maxProgressId = Math.max(...afterArchive.flatMap(t => (t.progress || []).map(p => p.id)), 0);
        if (maxProgressId > 0) progressIdRef.current = maxProgressId + 1;
      }
      const afterTick = applyRepeatTick(afterArchive, new Date(), () => progressIdRef.current++);
      setTodos(afterTick);
      rescheduleAll(afterTick);
      checkDueReminders(afterTick);
      setLoaded(true);
    })();
    return () => { cancelled = true; };
  }, []);  // 空依赖数组，仅在组件首次挂载时执行

  useEffect(() => {
    if (!loaded) return;
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveData(todos);
    }, 100);
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [todos, loaded]);

  useEffect(() => {
    try {
      localStorage.setItem(MANUAL_SORT_KEY, isManualMode ? '1' : '0');
    } catch { /* ignore */ }
  }, [isManualMode]);

  const addTodo = useCallback(({ title, startDate, dueDate, tags, checklistMode, repeatRule }) => {
    const rule = isRepeatRule(repeatRule) ? repeatRule : null;
    const todo = {
      id: todoIdRef.current++,
      title,
      startDate: startDate || null,
      dueDate: dueDate || null,
      tags: tags || [],
      status: 'active',
      pinStatus: null,
      createdAt: new Date().toISOString(),
      progress: [],
      checklistMode: checklistMode === true,
      repeatRule: rule,
      cycleKey: rule ? getCycleKey(rule) : null,
      reminderTime: null,
    };
    setTodos(prev => [...prev, todo]);
  }, []);

  const updateTodo = useCallback((id, updates) => {
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, ...updates } : t
    ));
  }, []);

  const deleteTodo = useCallback((id) => {
    removeProgressCollapsed(id);
    setTodos(prev => prev.filter(t => t.id !== id));
  }, []);

  const commitReorder = useCallback((idOrder, movedId, manual) => {
    const orderSet = new Set(idOrder);
    setTodos(prev => {
      const prevById = new Map(prev.map(t => [t.id, t]));
      const next = [];
      let ptr = 0;
      for (const t of prev) {
        if (orderSet.has(t.id)) {
          const targetId = idOrder[ptr];
          const target = prevById.get(targetId);
          next.push(target ? { ...target, pinStatus: target.id === movedId ? null : target.pinStatus } : null);
          ptr++;
        } else {
          next.push(t);
        }
      }
      if (ptr < idOrder.length) {
        for (let i = ptr; i < idOrder.length; i++) {
          const target = prevById.get(idOrder[i]);
          if (target) next.push({ ...target, pinStatus: target.id === movedId ? null : target.pinStatus });
        }
      }
      return next.filter(Boolean);
    });
    if (manual) setIsManualMode(true);
  }, []);

  const setPinStatus = useCallback((id, pinStatus) => {
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, pinStatus } : t
    ));
  }, []);

  const setManualMode = useCallback((mode) => {
    setIsManualMode(!!mode);
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
    const target = todosRef.current.find(t => t.id === id);
    if (target?.repeatRule) {
      if (target.status === 'active' && newStatus !== 'active') {
        cancelReminder(id);
      } else if (target.status !== 'active' && newStatus !== target.status) {
        scheduleReminder(target);
      }
    }
  }, []);

  const completeTodo = useCallback((id) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== id) return t;
      const now = new Date();
      const nowIso = now.toISOString();
      if (isRepeatRule(t.repeatRule)) {
        const ws = getWindowStart(t.repeatRule, now);
        const hasCycleDone = (t.progress || []).some(p =>
          p.kind === 'cycle-done' && new Date(p.completedAt ?? p.createdAt).getTime() >= ws.getTime()
        );
        let progress = (t.progress || []).map(p =>
          p.status === 'active' ? { ...p, status: 'completed', completedAt: nowIso } : p
        );
        if (!hasCycleDone) {
          progress = [...progress, {
            id: progressIdRef.current++,
            text: '✓ 本期完成',
            createdAt: nowIso,
            status: 'completed',
            completedAt: nowIso,
            kind: 'cycle-done',
          }];
        }
        return { ...t, status: 'active', completedAt: nowIso, progress };
      }
      const willBeArchived = t.status === 'active';
      return {
        ...t,
        status: t.status === 'completed' ? 'active' : 'completed',
        completedAt: willBeArchived ? nowIso : null,
      };
    }));
    const target = todosRef.current.find(t => t.id === id);
    if (target?.repeatRule && target.reminderTime) {
      scheduleReminder(target);
    }
  }, []);

  const setRepeatRule = useCallback((id, rule) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (!isRepeatRule(rule)) {
        return { ...t, repeatRule: null, cycleKey: null };
      }
      return { ...t, repeatRule: rule, cycleKey: t.cycleKey || getCycleKey(rule) };
    }));
    const target = todosRef.current.find(t => t.id === id);
    if (!target) return;
    if (!isRepeatRule(rule)) {
      cancelReminder(id);
    } else if (target.reminderTime) {
      scheduleReminder(target);
    }
  }, []);

  const setReminderTime = useCallback(async (id, timeStr) => {
    const normalized = timeStr ? String(timeStr) : null;
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, reminderTime: normalized } : t
    ));
    const target = todosRef.current.find(t => t.id === id);
    if (!target) return;
    if (!normalized) {
      cancelReminder(id);
      return;
    }
    const granted = await requestNotificationPermission();
    if (granted && isRepeatRule(target.repeatRule)) {
      scheduleReminder({ ...target, reminderTime: normalized });
    }
  }, []);

  const addProgress = useCallback((id, text, temporary) => {
    if (!text.trim()) return;
    setTodos(prev => prev.map(t =>
      t.id === id ? {
        ...t,
        progress: [...(t.progress || []), {
          id: progressIdRef.current++,
          text: text.trim(),
          createdAt: new Date().toISOString(),
          status: 'active',
          temporary: temporary === true,
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

  const updateProgress = useCallback((todoId, progressId, text, temporary) => {
    setTodos(prev => prev.map(t =>
      t.id === todoId ? {
        ...t,
        progress: (t.progress || []).map(p =>
          p.id === progressId ? { ...p, text: text.trim(), temporary: temporary !== undefined ? temporary === true : p.temporary } : p
        )
      } : t
    ));
  }, []);

  const updateProgressCompletedAt = useCallback((todoId, progressId, dateString) => {
    const isoString = toSafeIso(dateString);
    if (!isoString) return;
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
    const isoString = toSafeIso(dateString);
    if (!isoString) return;
    setTodos(prev => prev.map(t =>
      t.id === id ? { ...t, status: 'completed', completedAt: isoString } : t
    ));
  }, []);

  const importTodos = useCallback((importData, strategy) => {
    setTodos(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const normalized = importData.map(normalizeImportedTodo).filter(Boolean);
      let merged;
      if (strategy === 'overwrite') {
        const overwriteSet = new Set(normalized.filter(t => existingIds.has(t.id)).map(t => t.id));
        merged = [...prev.filter(t => !overwriteSet.has(t.id)), ...normalized];
      } else {
        merged = [...prev, ...normalized.filter(t => !existingIds.has(t.id))];
      }
      const maxId = Math.max(...merged.map(t => t.id), 0);
      todoIdRef.current = maxId + 1;
      return merged;
    });
  }, []);

  const activeTodos = todos.filter(t => t.status === 'active');
  const archivedTodos = todos.filter(t => t.status !== 'active');
  const allTags = [...new Set(todos.flatMap(t => t.tags))].sort();

  return { todos, activeTodos, archivedTodos, loaded, isManualMode, setManualMode, addTodo, updateTodo, deleteTodo, commitReorder, setPinStatus, toggleStatus, completeTodo, setRepeatRule, setReminderTime, addProgress, toggleProgressStatus, deleteProgress, updateProgress, updateProgressCompletedAt, updateCompletedAt, importTodos, allTags };
}
