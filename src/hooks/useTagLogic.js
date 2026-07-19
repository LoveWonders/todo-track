import { useState, useCallback, useEffect } from 'react';

export function useTagLogic(initialTags = []) {
  const [tags, setTags] = useState(initialTags);

  useEffect(() => {
    if (initialTags.length === 0) return;
    setTags(prev => [...new Set([...prev, ...initialTags])]);
  }, [initialTags]);

  const addTag = useCallback((tag) => {
    setTags(prev => prev.includes(tag) ? prev : [...prev, tag]);
  }, []);

  const removeTag = useCallback((tag) => {
    setTags(prev => prev.filter(t => t !== tag));
  }, []);

  const clearTags = useCallback(() => setTags([]), []);

  const hasTag = useCallback((tag) => tags.includes(tag), [tags]);

  return { tags, setTags, addTag, removeTag, clearTags, hasTag };
}
