import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import { loadTagMeta, saveTagMeta, isSafeTagName } from '../utils/tagMeta';

const TagMetaContext = createContext(null);

export function TagMetaProvider({ children }) {
  const [tagMeta, setTagMeta] = useState(loadTagMeta);

  useEffect(() => {
    saveTagMeta(tagMeta);
  }, [tagMeta]);

  const setTagColor = useCallback((tag, color) => {
    if (!isSafeTagName(tag)) return;
    setTagMeta(prev => ({
      ...prev,
      [tag]: { ...(prev[tag] || {}), ...color },
    }));
  }, []);

  const removeTagMeta = useCallback((tag) => {
    if (!isSafeTagName(tag)) return;
    setTagMeta(prev => {
      const next = { ...prev };
      delete next[tag];
      return next;
    });
  }, []);

  const renameTagMeta = useCallback((oldName, newName) => {
    if (!isSafeTagName(oldName) || !isSafeTagName(newName)) return;
    setTagMeta(prev => {
      const next = { ...prev };
      const entry = next[oldName];
      delete next[oldName];
      if (entry) next[newName] = { ...entry };
      return next;
    });
  }, []);

  const value = useMemo(() => ({
    tagMeta, setTagColor, removeTagMeta, renameTagMeta,
  }), [tagMeta, setTagColor, removeTagMeta, renameTagMeta]);

  return (
    <TagMetaContext.Provider value={value}>
      {children}
    </TagMetaContext.Provider>
  );
}

export function useTagMeta() {
  const ctx = useContext(TagMetaContext);
  if (!ctx) throw new Error('useTagMeta must be used within TagMetaProvider');
  return ctx;
}
