import { URGENT_TAG } from '../constants';
import { isRepeatRule, getRepeatDue } from './repeat';

export function getTaskTier(todo, now = new Date()) {
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  const sevenDaysLater = new Date(now);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  const tags = todo.tags || [];
  const isUrgent = tags.includes(URGENT_TAG);
  const isLongTerm = tags.includes('长期');
  const dueTime = isRepeatRule(todo.repeatRule)
    ? getRepeatDue(todo, now)
    : (todo.dueDate ? new Date(todo.dueDate).getTime() : null);
  const isOverdueTask = dueTime != null && dueTime < now.getTime();
  const isDueSoon = dueTime != null && dueTime <= threeDaysLater.getTime();
  const isDueInWeek = dueTime != null && dueTime <= sevenDaysLater.getTime();

  if (isUrgent || isOverdueTask || isDueSoon) return 1;
  if (!isLongTerm && isDueInWeek) return 2;
  return 3;
}
