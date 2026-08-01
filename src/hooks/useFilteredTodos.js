import { useMemo } from 'react';
import sortTodos from '../utils/sortTodos';

export default function useFilteredTodos(source, filterConfig, isManualMode) {
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

    return sortTodos(base, isManualMode);
  }, [source, filterConfig, isManualMode]);
}
