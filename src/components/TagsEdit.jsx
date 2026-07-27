import { useState, useRef, useEffect, useCallback } from 'react';
import { URGENT_TAG } from '../constants';

export default function TagsEdit({ tags = [], onSave, inBatch }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const [showAll, setShowAll] = useState(false);
  const inputRef = useRef(null);

  const MAX_VISIBLE = 3;
  const shouldCollapse = tags.length > MAX_VISIBLE;
  const visibleTags = showAll || !shouldCollapse ? tags : tags.slice(0, MAX_VISIBLE);
  const hiddenCount = shouldCollapse && !showAll ? tags.length - MAX_VISIBLE : 0;

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const addTag = useCallback((t) => {
    const tag = t.trim();
    if (tag && !tags.includes(tag)) onSave([...tags, tag]);
    setText('');
  }, [tags, onSave]);

  const removeTag = useCallback((tag) => {
    onSave(tags.filter(t => t !== tag));
  }, [tags, onSave]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(text); }
    else if (e.key === 'Escape') { setEditing(false); setText(''); setShowAll(false); }
    else if (e.key === 'Backspace' && !text && tags.length > 0) { removeTag(tags[tags.length - 1]); }
  }, [addTag, removeTag, text, tags]);

  const handleBlur = useCallback(() => {
    if (text.trim()) addTag(text);
    setEditing(false);
    setShowAll(false);
  }, [addTag, text]);

  const handleClick = useCallback((e) => {
    if (inBatch) { e.stopPropagation(); return; }
    e.stopPropagation();
    setEditing(true);
    setShowAll(false);
  }, [inBatch]);

  if (editing) {
    return (
      <span className="tags-edit" onClick={e => e.stopPropagation()}>
        {tags.map(tag => (
          <span key={tag} className="tag-chip edit-mode">
            #{tag}
            <span className="tag-remove" onMouseDown={(e) => { e.preventDefault(); removeTag(tag); }}>&times;</span>
          </span>
        ))}
        <input ref={inputRef} className="tag-input" placeholder="+ 标签" value={text}
          onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown} onBlur={handleBlur} />
      </span>
    );
  }

  return (
    <span className="todo-tags clickable" onClick={handleClick} title="点击编辑标签">
      {tags.length > 0 ? (
        <>
          {visibleTags.map(tag => (
            <span key={tag} className={`todo-tag ${tag === URGENT_TAG ? 'urgent' : ''}`}>
              #{tag}
            </span>
          ))}
          {hiddenCount > 0 && (
            <span
              className="todo-tag tag-expander"
              onClick={(e) => { e.stopPropagation(); setShowAll(true); }}
            >
              +{hiddenCount}
            </span>
          )}
        </>
      ) : (
        <span className="todo-tag placeholder">+ 标签</span>
      )}
    </span>
  );
}
