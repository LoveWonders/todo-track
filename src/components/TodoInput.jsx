import { useState, useRef, useEffect } from 'react';
import { parseInput, toDateString } from '../utils/dateParser';

export default function TodoInput({ onAdd }) {
  const [text, setText] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    if (!text.trim()) {
      if (!tags.length) setDueDate('');
      return;
    }
    const timer = setTimeout(() => {
      const result = parseInput(text);
      if (result.dueDate) setDueDate(toDateString(result.dueDate));
      setTags(prev => {
        const keepTags = prev.filter(t => !t.startsWith('#'));
        const merged = [...new Set([...keepTags, ...result.tags])];
        return merged;
      });
    }, 400);
    return () => clearTimeout(timer);
  }, [text, tags.length]);

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const handleSubmit = () => {
    const combined = text + (tags.length ? ' ' + tags.map(t => '#' + t).join(' ') : '');
    const parsed = parseInput(combined);
    if (!parsed.title.trim()) return;
    onAdd({
      title: parsed.title,
      dueDate: dueDate || (parsed.dueDate ? toDateString(parsed.dueDate) : null),
      tags: [...new Set([...tags, ...parsed.tags])],
    });
    setText('');
    setDueDate('');
    setTags([]);
    setTagInput('');
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const addTag = (t) => {
    const tag = t.trim();
    if (tag && !tags.includes(tag)) {
      setTags(prev => [...prev, tag]);
    }
    setTagInput('');
  };

  const removeTag = (tag) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  return (
    <div className="bottom-input">
      <div className="bottom-input-inner">
        {(dueDate || tags.length > 0) && (
          <div className="parsed-info">
            {dueDate && (
              <div className="parsed-date">
                <input
                  type="date"
                  value={dueDate}
                  onChange={e => setDueDate(e.target.value)}
                />
              </div>
            )}
            <div className="parsed-tags">
              {tags.map(tag => (
                <span key={tag} className="tag-chip">
                  #{tag}
                  <span className="tag-remove" onClick={() => removeTag(tag)}>&times;</span>
                </span>
              ))}
              <input
                className="tag-input"
                placeholder="+ 标签"
                value={tagInput}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addTag(tagInput);
                  }
                }}
                onBlur={() => { if (tagInput.trim()) addTag(tagInput); }}
              />
            </div>
          </div>
        )}
        <div className="input-row">
          <input
            ref={inputRef}
            type="text"
            placeholder="输入待办，自动提取日期和标签..."
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
          />
          {!tags.includes('紧急') && (
            <button
              className="tag-quick-urgent"
              onClick={() => addTag('紧急')}
              title="添加紧急标签"
            >!</button>
          )}
          <button className="btn btn-primary" onClick={handleSubmit}>&#x2795;</button>
        </div>
      </div>
    </div>
  );
}
