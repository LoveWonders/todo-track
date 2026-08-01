import { URGENT_TAG } from '../constants';

const TOP = 'top';
const BOTTOM = 'bottom';

export default function sortTodos(list, isManualMode) {
  if (!Array.isArray(list)) return [];

  const pinned = [];
  const bottom = [];
  let normal = [];

  for (const t of list) {
    const pinStatus = t && t.pinStatus;
    if (pinStatus === TOP) pinned.push(t);
    else if (pinStatus === BOTTOM) bottom.push(t);
    else normal.push(t);
  }

  if (!isManualMode) {
    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    const byDue = (a, b) => {
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDue - bDue;
    };

    const tier1 = [];
    const tier2 = [];
    const tier3 = [];

    for (const t of normal) {
      const tags = t.tags || [];
      const isUrgent = tags.includes(URGENT_TAG);
      const isLongTerm = tags.includes('长期');
      const dueDate = t.dueDate ? new Date(t.dueDate) : null;
      const isOverdueTask = dueDate && dueDate < now;
      const isDueSoon = dueDate && dueDate <= threeDaysLater;
      const isDueInWeek = dueDate && dueDate <= sevenDaysLater;

      if (isUrgent || isOverdueTask || isDueSoon) {
        tier1.push(t);
      } else if (!isLongTerm && isDueInWeek) {
        tier2.push(t);
      } else {
        tier3.push(t);
      }
    }

    tier1.sort(byDue);
    tier2.sort(byDue);
    tier3.sort(byDue);

    normal = [...tier1, ...tier2, ...tier3];
  }

  return [...pinned, ...normal, ...bottom];
}
