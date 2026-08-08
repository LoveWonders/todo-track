import { Capacitor } from '@capacitor/core';
import { LocalNotifications } from '@capacitor/local-notifications';
import { getWindowStart, getCycleKey, isRepeatRule, CYCLE_LABELS } from './repeat';
import { nextReminderAt, parseReminderTime } from './reminder';

const REMINDER_ACK_KEY = 'todo_reminder_ack';

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
  const at = nextReminderAt(todo.repeatRule, todo.reminderTime);
  if (!at) return;
  try {
    await LocalNotifications.schedule({
      notifications: [{
        id: todo.id,
        title: todo.title || '待办',
        body: `${CYCLE_LABELS[todo.repeatRule]}待办提醒`,
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
}

function loadAck() {
  try {
    const raw = localStorage.getItem(REMINDER_ACK_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveAck(ack) {
  try {
    localStorage.setItem(REMINDER_ACK_KEY, JSON.stringify(ack));
  } catch { /* ignore */ }
}

export function checkDueReminders(todos) {
  if (isNative()) return;
  if (typeof Notification === 'undefined') return;
  if (Notification.permission !== 'granted') return;
  const now = new Date();
  const ack = loadAck();
  let changed = false;
  for (const t of todos) {
    if (t.status !== 'active' || !isRepeatRule(t.repeatRule) || !t.reminderTime) continue;
    const tm = parseReminderTime(t.reminderTime);
    if (!tm) continue;
    const winStart = getWindowStart(t.repeatRule, now);
    const dueAt = new Date(winStart);
    dueAt.setHours(tm.h, tm.min, 0, 0);
    const key = `${getCycleKey(t.repeatRule, now)}:${t.reminderTime}`;
    if (now.getTime() >= dueAt.getTime() && ack[t.id] !== key) {
      try {
        new Notification(t.title || '待办', {
          body: `${CYCLE_LABELS[t.repeatRule]}待办提醒`,
          tag: `todo-${t.id}-${key}`,
        });
      } catch { /* ignore */ }
      ack[t.id] = key;
      changed = true;
    }
  }
  if (changed) saveAck(ack);
}
