import { URGENT_TAG } from '../constants';

export function getTaskTier(todo, now = new Date()) {
  const threeDaysLater = new Date(now);
  threeDaysLater.setDate(threeDaysLater.getDate() + 3);
  const sevenDaysLater = new Date(now);
  sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

  const tags = todo.tags || [];
  const isUrgent = tags.includes(URGENT_TAG);
  const isLongTerm = tags.includes('长期');
  const dueDate = todo.dueDate ? new Date(todo.dueDate) : null;
  const isOverdueTask = dueDate && dueDate < now;
  const isDueSoon = dueDate && dueDate <= threeDaysLater;
  const isDueInWeek = dueDate && dueDate <= sevenDaysLater;

  if (isUrgent || isOverdueTask || isDueSoon) return 1;
  if (!isLongTerm && isDueInWeek) return 2;
  return 3;
}
