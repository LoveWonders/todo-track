import { useMemo } from 'react';
import { URGENT_TAG } from '../constants';
import { isOverdue } from '../utils/dateParser';

export default function useFilteredTodos(source, filterConfig) {
  return useMemo(() => {
    const hasFilter = filterConfig.includeTags.length > 0 || filterConfig.excludeTags.length > 0;
    const base = hasFilter
      ? source.filter(t => {
          const tags = t.tags || [];
          if (filterConfig.excludeTags.some(tag => tags.includes(tag))) return false;
          if (filterConfig.includeTags.length > 0) return filterConfig.includeTags.some(tag => tags.includes(tag));
          return true;
        })
      : source;

    const tier1 = [];
    const tier2 = [];
    const tier3 = [];

    const now = new Date();
    const threeDaysLater = new Date(now);
    threeDaysLater.setDate(threeDaysLater.getDate() + 3);
    const sevenDaysLater = new Date(now);
    sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);

    for (const t of base) {
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

    tier1.sort((a, b) => {
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDue - bDue;
    });

    tier2.sort((a, b) => {
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDue - bDue;
    });

    tier3.sort((a, b) => {
      const aDue = a.dueDate ? new Date(a.dueDate).getTime() : Infinity;
      const bDue = b.dueDate ? new Date(b.dueDate).getTime() : Infinity;
      return aDue - bDue;
    });

    return [...tier1, ...tier2, ...tier3];
  }, [source, filterConfig]);
}
