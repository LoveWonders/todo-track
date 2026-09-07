import { useMemo } from 'react';
import sortTodos from '../utils/sortTodos';
import { matchTodo } from '../utils/highlight';

export default function useFilteredTodos(source, filterConfig, sortMode, searchQuery = '') {
  return useMemo(() => {
    const q = (searchQuery || '').trim();

    const base = source.filter(t => {
      if (!matchTodo(t, q)) return false;
      const tags = t.tags || [];
      if (filterConfig.excludeTags.some(tag => tags.includes(tag))) return false;
      if (filterConfig.includeTags.length > 0) return filterConfig.includeTags.some(tag => tags.includes(tag));
      return true;
    });

    return sortTodos(base, sortMode);
  }, [source, filterConfig, sortMode, searchQuery]);
}
