import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { anchorDateInWindow, getWindowStart, getCycleKey, isRepeatRule, anchorLabel } from './repeat';
import { nextReminderAt, parseReminderTime } from './reminder';
import { readJSON, save } from './storage';

const REMINDER_ACK_KEY = 'todo_reminder_ack';
const PROGRESS_NOTIF_MAP = 'todo_progress_notif_ids';

let progressNotifSeq = 1000000;

export function isNative() {
  return Capacitor.isNativePlatform();
}

export async function requestNotificationPermission() {
  try {
    if (isNative()) {
      const perm = await LocalNotifications.requestPermissions();
      return perm.permissions?.notifications === 'granted';
    }
    if (typeof Notification !== 'undefined') {
      if (Notification.permission === 'granted') return true;
      const p = await Notification.requestPermission();
      return p === 'granted';
    }
  } catch { /* ignore */ }
  return false;
}

export async function scheduleReminder(todo) {
  if (!isNative()) return;
  if (!todo.repeatRule || !todo.reminderTime) return;
  const at = nextReminderAt(todo.repeatRule, todo.reminderTime, todo.repeatAnchor);
  if (!at) return;
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: todo.id,
        title: todo.title || '待办',
        body: `${anchorLabel(todo.repeatRule, todo.repeatAnchor)}待办提醒`,
        schedule: { at },
      }],
    });
  } catch { /* ignore */ }
}

export async function cancelReminder(todoId) {
  if (!isNative()) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id: todoId }] });
  } catch { /* ignore */ }
}

function loadProgressNotifMap() {
  const parsed = readJSON(PROGRESS_NOTIF_MAP, {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function saveProgressNotifMap(map) {
  save(PROGRESS_NOTIF_MAP, map);
}

function progressNotifId(progressId) {
  const map = loadProgressNotifMap();
  let id = map[progressId];
  if (id == null) {
    id = progressNotifSeq++;
    map[progressId] = id;
    saveProgressNotifMap(map);
  }
  return id;
}

function todoNotifId(todoId) {
  const map = loadProgressNotifMap();
  const key = `todo:${todoId}`;
  let id = map[key];
  if (id == null) {
    id = progressNotifSeq++;
    map[key] = id;
    saveProgressNotifMap(map);
  }
  return id;
}

export async function scheduleProgressReminder(todo, progress) {
  if (!isNative()) return;
  if (!progress || progress.status !== 'active' || !progress.reminderTime) return;
  const at = new Date(progress.reminderTime);
  if (isNaN(at.getTime()) || at.getTime() <= Date.now()) return;
  const id = progressNotifId(progress.id);
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id,
        title: todo.title || '待办',
        body: `进度提醒：${String(progress.text || '').slice(0, 80)}`,
        schedule: { at },
      }],
    });
  } catch { /* ignore */ }
}

export async function cancelProgressReminder(progressId) {
  if (!isNative()) return;
  const map = loadProgressNotifMap();
  const id = map[progressId];
  if (id == null) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch { /* ignore */ }
  delete map[progressId];
  saveProgressNotifMap(map);
}

export async function cancelTodoProgressReminders(todo) {
  if (!isNative()) return;
  const ids = (todo.progress || [])
    .filter(p => p.status === 'active' && p.reminderTime)
    .map(p => p.id);
  for (const progressId of ids) {
    await cancelProgressReminder(progressId);
  }
}

export async function scheduleTodoReminder(todo) {
  if (!isNative()) return;
  if (!todo || todo.status !== 'active' || !todo.reminderAt) return;
  const at = new Date(todo.reminderAt);
  if (isNaN(at.getTime()) || at.getTime() <= Date.now()) return;
  const id = todoNotifId(todo.id);
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id,
        title: todo.title || '待办',
        body: '待办提醒',
        schedule: { at },
      }],
    });
  } catch { /* ignore */ }
}

export async function cancelTodoReminder(todoId) {
  if (!isNative()) return;
  const map = loadProgressNotifMap();
  const id = map[`todo:${todoId}`];
  if (id == null) return;
  try {
    await LocalNotifications.cancel({ notifications: [{ id }] });
  } catch { /* ignore */ }
  delete map[`todo:${todoId}`];
  saveProgressNotifMap(map);
}

export async function rescheduleAll(todos) {
  if (!isNative()) return;
  const targets = todos.filter(t => t.status === 'active' && t.repeatRule && t.reminderTime);
  try {
    if (targets.length > 0) {
      await LocalNotifications.cancel({ notifications: targets.map(t => ({ id: t.id })) });
    }
  } catch { /* ignore */ }
  for (const t of targets) {
    await scheduleReminder(t);
  }
  for (const t of todos) {
    if (t.status === 'active' && t.reminderAt) {
      await scheduleTodoReminder(t);
    }
    for (const p of (t.progress || [])) {
      await scheduleProgressReminder(t, p);
    }
  }
}

function loadAck() {
  const parsed = readJSON(REMINDER_ACK_KEY, {});
  return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
}

function saveAck(ack) {
  save(REMINDER_ACK_KEY, ack);
}

export function checkDueReminders(todos) {
  if (isNative()) return;
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  const now = new Date();
  const ack = loadAck();
  let changed = false;
  for (const t of todos) {
    if (t.status !== 'active') continue;
    if (isRepeatRule(t.repeatRule) && t.reminderTime) {
      const tm = parseReminderTime(t.reminderTime);
      if (tm) {
        const winStart = getWindowStart(t.repeatRule, now);
        const dueAt = anchorDateInWindow(t.repeatRule, t.repeatAnchor, winStart);
        dueAt.setHours(tm.h, tm.min, 0, 0);
        const key = `${getCycleKey(t.repeatRule, now)}:${t.reminderTime}`;
        if (now.getTime() >= dueAt.getTime() && ack[t.id] !== key) {
          try {
            new Notification(t.title || '待办', {
              body: `${anchorLabel(t.repeatRule, t.repeatAnchor)}待办提醒`,
              tag: `todo-${t.id}-${key}`,
            });
          } catch { /* ignore */ }
          ack[t.id] = key;
          changed = true;
        }
      }
    }
    if (t.reminderAt) {
      const at = new Date(t.reminderAt);
      if (!isNaN(at.getTime())) {
        const key = `todo:${t.id}:${t.reminderAt}`;
        if (now.getTime() >= at.getTime() && ack[key] !== '1') {
          try {
            new Notification(t.title || '待办', {
              body: '待办提醒',
              tag: key,
            });
          } catch { /* ignore */ }
          ack[key] = '1';
          changed = true;
        }
      }
    }
    for (const p of (t.progress || [])) {
      if (p.status !== 'active' || !p.reminderTime) continue;
      const at = new Date(p.reminderTime);
      if (isNaN(at.getTime())) continue;
      const key = `progress:${t.id}:${p.id}:${p.reminderTime}`;
      if (now.getTime() >= at.getTime() && ack[key] !== '1') {
        try {
          new Notification(t.title || '待办', {
            body: `进度提醒：${String(p.text || '').slice(0, 80)}`,
            tag: key,
          });
        } catch { /* ignore */ }
        ack[key] = '1';
        changed = true;
      }
    }
  }
  if (changed) saveAck(ack);
}
