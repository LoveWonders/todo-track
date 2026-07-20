import { useMemo } from 'react';

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

    const urgent = [];
    const normal = [];
    for (const t of base) {
      (      (t.tags || []).includes('紧急') ? urgent : normal).push(t);
    }
    return [...urgent, ...normal];
  }, [source, filterConfig]);
}
