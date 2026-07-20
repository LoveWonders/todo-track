import { useState, useRef, useEffect } from 'react';

export default function TagsEdit({ tags, onSave, inBatch }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const addTag = (t) => {
    const tag = t.trim();
    if (tag && !tags.includes(tag)) onSave([...tags, tag]);
    setText('');
  };

  const removeTag = (tag) => { onSave(tags.filter(t => t !== tag)); };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(text); }
    else if (e.key === 'Escape') { setEditing(false); setText(''); }
    else if (e.key === 'Backspace' && !text && tags.length > 0) { removeTag(tags[tags.length - 1]); }
  };

  if (editing) {
    return (
      <span className="tags-edit">
        {tags.map(tag => (
          <span key={tag} className="tag-chip edit-mode">
            #{tag}
            <span className="tag-remove" onMouseDown={(e) => { e.preventDefault(); removeTag(tag); }}>&times;</span>
          </span>
        ))}
        <input ref={inputRef} className="tag-input" placeholder="+ 标签" value={text}
          onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown}
          onBlur={() => { if (text.trim()) addTag(text); setEditing(false); }} />
      </span>
    );
  }

  return (
    <span className="todo-tags clickable" onClick={(e) => { if (inBatch) { e.stopPropagation(); return; } setEditing(true); }} title="点击编辑标签">
      {tags.length > 0
        ? tags.map(tag => <span key={tag} className={`todo-tag ${tag === '紧急' ? 'urgent' : ''}`}>#{tag}</span>)
        : <span className="todo-tag placeholder">+ 标签</span>
      }
    </span>
  );
}
