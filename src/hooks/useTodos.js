import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { loadData, saveData, migrateFromLocalStorage, readJSON } from '../utils/storage';
import { mergeAndArchive } from '../utils/autoArchive';
import { normalizeImportedTodo } from '../utils/normalizeTodo';
import { removeProgressCollapsed } from '../utils/progressViewState';
import { getCycleKey, getWindowStart, isRepeatRule, isValidAnchor } from '../utils/repeat';
import { scheduleReminder, cancelReminder, rescheduleAll, checkDueReminders, requestNotificationPermission, scheduleProgressReminder, cancelProgressReminder, cancelTodoProgressReminders } from '../utils/notification';

const MANUAL_SORT_KEY = 'todo_manual_sort';
const SETTINGS_KEY = 'todo_app_settings';

function autoArchiveEnabled() {
  const settings = readJSON(SETTINGS_KEY, null);
  return settings && typeof settings === 'object' ? settings.autoArchive !== false : true;
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

  const addTodo = useCallback(({ title, startDate, dueDate, tags, checklistMode, repeatRule, repeatAnchor }) => {
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
      repeatAnchor: rule ? (isValidAnchor(rule, repeatAnchor) ? repeatAnchor : null) : null,
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
    const target = todosRef.current.find(t => t.id === id);
    if (target) {
      cancelTodoProgressReminders(target);
      if (target.reminderTime) cancelReminder(id);
    }
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

  const batchToggleStatus = useCallback((entries) => {
    if (!entries || entries.length === 0) return;
    const nowIso = new Date().toISOString();
    const emap = new Map(entries.map(e => [e.id, e.newStatus]));
    setTodos(prev => prev.map(t => {
      const newStatus = emap.get(t.id);
      if (newStatus === undefined) return t;
      const willBeArchived = t.status === 'active' && newStatus !== 'active';
      const willBeRestored = t.status !== 'active' && newStatus !== t.status;
      return {
        ...t,
        status: t.status === newStatus ? 'active' : newStatus,
        completedAt: willBeArchived ? nowIso
          : willBeRestored ? null
          : t.completedAt,
      };
    }));
    for (const { id, newStatus } of entries) {
      const target = todosRef.current.find(t => t.id === id);
      if (target?.repeatRule) {
        if (target.status === 'active' && newStatus !== 'active') {
          cancelReminder(id);
        } else if (target.status !== 'active' && newStatus !== target.status) {
          scheduleReminder(target);
        }
      }
    }
  }, []);

  const toggleStatus = useCallback((id, newStatus) => {
    batchToggleStatus([{ id, newStatus }]);
  }, [batchToggleStatus]);

  const batchUpdateTodos = useCallback((entries) => {
    if (!entries || entries.length === 0) return;
    const updates = new Map(entries.map(e => [e.id, e.updates]));
    setTodos(prev => prev.map(t => {
      const u = updates.get(t.id);
      return u ? { ...t, ...u } : t;
    }));
  }, []);

  const batchDeleteTodos = useCallback((ids) => {
    const idSet = ids instanceof Set ? ids : new Set(ids);
    if (idSet.size === 0) return;
    for (const t of todosRef.current) {
      if (idSet.has(t.id)) cancelTodoProgressReminders(t);
    }
    idSet.forEach(id => removeProgressCollapsed(id));
    setTodos(prev => prev.filter(t => !idSet.has(t.id)));
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
    if (!target) return;
    if (target.status === 'active') {
      cancelTodoProgressReminders(target);
    }
    if (target?.repeatRule && target.reminderTime) {
      scheduleReminder(target);
    }
  }, []);

  const setRepeatRule = useCallback((id, rule, anchor) => {
    setTodos(prev => prev.map(t => {
      if (t.id !== id) return t;
      if (!isRepeatRule(rule)) {
        return { ...t, repeatRule: null, repeatAnchor: null, cycleKey: null };
      }
      return {
        ...t,
        repeatRule: rule,
        repeatAnchor: isValidAnchor(rule, anchor) ? anchor : null,
        cycleKey: t.cycleKey || getCycleKey(rule),
      };
    }));
    const target = todosRef.current.find(t => t.id === id);
    if (!target) return;
    if (!isRepeatRule(rule)) {
      cancelReminder(id);
    } else if (target.reminderTime) {
      scheduleReminder({ ...target, repeatRule: rule, repeatAnchor: isValidAnchor(rule, anchor) ? anchor : null });
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

  const addProgress = useCallback((id, text, temporary, options) => {
    if (!text.trim()) return;
    const opts = options || {};
    const newId = progressIdRef.current++;
    setTodos(prev => prev.map(t =>
      t.id === id ? {
        ...t,
        progress: [...(t.progress || []), {
          id: newId,
          text: text.trim(),
          createdAt: new Date().toISOString(),
          status: 'active',
          temporary: temporary === true,
          urgent: opts.urgent === true,
          reminderTime: opts.reminderTime || null,
        }]
      } : t
    ));
    if (opts.reminderTime) {
      const target = todosRef.current.find(t => t.id === id);
      if (target) {
        scheduleProgressReminder({ ...target }, {
          id: newId,
          text: text.trim(),
          status: 'active',
          reminderTime: opts.reminderTime,
        });
      }
    }
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
    const target = todosRef.current.find(t => t.id === todoId);
    if (target) {
      const p = (target.progress || []).find(x => x.id === progressId);
      if (p && p.status === 'active' && newStatus !== 'active') {
        cancelProgressReminder(progressId);
      }
    }
  }, []);

  const deleteProgress = useCallback((todoId, progressId) => {
    cancelProgressReminder(progressId);
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

  const setProgressUrgent = useCallback((todoId, progressId, urgent) => {
    setTodos(prev => prev.map(t =>
      t.id === todoId ? {
        ...t,
        progress: (t.progress || []).map(p =>
          p.id === progressId ? { ...p, urgent: urgent === true } : p
        )
      } : t
    ));
  }, []);

  const setProgressReminder = useCallback(async (todoId, progressId, timeStr) => {
    const normalized = timeStr ? String(timeStr) : null;
    setTodos(prev => prev.map(t =>
      t.id === todoId ? {
        ...t,
        progress: (t.progress || []).map(p =>
          p.id === progressId ? { ...p, reminderTime: normalized } : p
        )
      } : t
    ));
    const target = todosRef.current.find(t => t.id === todoId);
    if (!target) return;
    const p = (target.progress || []).find(x => x.id === progressId);
    if (!p) return;
    if (!normalized) {
      cancelProgressReminder(progressId);
      return;
    }
    const granted = await requestNotificationPermission();
    if (granted) {
      scheduleProgressReminder({ ...target }, { ...p, reminderTime: normalized });
    }
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
    batchUpdateTodos([{ id, updates: { status: 'completed', completedAt: isoString } }]);
  }, [batchUpdateTodos]);

  const batchUpdateCompletedAt = useCallback((entries) => {
    const mapped = [];
    for (const { id, dateString } of entries) {
      const isoString = toSafeIso(dateString);
      if (isoString) mapped.push({ id, updates: { status: 'completed', completedAt: isoString } });
    }
    batchUpdateTodos(mapped);
  }, [batchUpdateTodos]);

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

  const activeTodos = useMemo(() => todos.filter(t => t.status === 'active'), [todos]);
  const archivedTodos = useMemo(() => todos.filter(t => t.status !== 'active'), [todos]);
  const allTags = useMemo(() => [...new Set(todos.flatMap(t => t.tags))].sort(), [todos]);

  return { todos, activeTodos, archivedTodos, loaded, isManualMode, setManualMode, addTodo, updateTodo, batchUpdateTodos, batchDeleteTodos, deleteTodo, commitReorder, setPinStatus, toggleStatus, batchToggleStatus, completeTodo, setRepeatRule, setReminderTime, addProgress, toggleProgressStatus, deleteProgress, updateProgress, setProgressUrgent, setProgressReminder, updateProgressCompletedAt, updateCompletedAt, batchUpdateCompletedAt, importTodos, allTags };
}
