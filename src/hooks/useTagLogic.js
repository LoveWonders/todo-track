import { useState, useCallback, useEffect, useMemo } from 'react';

export function useTagLogic(initialTags = []) {
  const [tags, setTags] = useState(initialTags);
  const initialKey = useMemo(() => initialTags.join('\u0000'), [initialTags]);

  useEffect(() => {
    if (!initialKey) return;
    const initial = initialKey.split('\u0000');
    setTags(prev => {
      const next = [...new Set([...prev, ...initial])];
      return next.length === prev.length && next.every((t, i) => t === prev[i]) ? prev : next;
    });
  }, [initialKey]);

  const addTag = useCallback((tag) => {
    setTags(prev => prev.includes(tag) ? prev : [...prev, tag]);
  }, []);

  const removeTag = useCallback((tag) => {
    setTags(prev => prev.filter(t => t !== tag));
  }, []);

  const clearTags = useCallback(() => setTags([]), []);

  const hasTag = useCallback((tag) => tags.includes(tag), [tags]);

  const toggleTag = useCallback((tag) => {
    setTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  }, []);

  return { tags, setTags, addTag, removeTag, clearTags, hasTag, toggleTag };
}
