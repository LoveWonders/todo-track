import { useRef, useState } from 'react';
import { useSmartInput } from '../hooks/useSmartInput';
import { useCalendarLogic } from '../hooks/useCalendarLogic';
import { useTagLogic } from '../hooks/useTagLogic';
import { formatDateRange } from '../utils/dateParser';

export default function TodoInput({ onAdd }) {
  const inputRef = useRef(null);
  const [pickedStart, setPickedStart] = useState(null);
  const [pickedEnd, setPickedEnd] = useState(null);

  const {
    text, setText, parsed, clear: clearSmart
  } = useSmartInput();

  const {
    startDate, dueDate, pickerRef, openPicker, handleCalendarPick
  } = useCalendarLogic(parsed.startDate, parsed.dueDate, ({ start, end }) => {
    setPickedStart(start);
    setPickedEnd(end);
  });

  const {
    tags, setTags, addTag, removeTag, clearTags
  } = useTagLogic([]);

  const handleTextChange = (e) => {
    setText(e.target.value);
  };

  const handleSubmit = () => {
    const final = parsed.cleanContent.trim();
    if (!final) return;
    const submittedTags = [...new Set([...tags, ...parsed.tags])];
    onAdd({
      title: final,
      startDate: pickedStart || startDate,
      dueDate: pickedEnd || dueDate,
      tags: submittedTags
    });
    clearSmart();
    clearTags();
    setPickedStart(null);
    setPickedEnd(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const displayStart = pickedStart !== null ? pickedStart : startDate;
  const displayEnd = pickedEnd !== null ? pickedEnd : dueDate;

  return (
    <div className="todo-input">
      <div className="input-row">
        <input
          ref={inputRef}
          type="text"
          className="input-main"
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          placeholder="添加待办... @日期 #标签"
        />
        <button
          type="button"
          className="btn-submit"
          onClick={handleSubmit}
          disabled={!parsed.cleanContent.trim()}
        >
          +
        </button>
      </div>

      {(displayEnd || tags.length > 0) && (
        <div className="input-preview">
          {displayEnd && (
            <span
              className="preview-date"
              onClick={() => openPicker('end')}
              title="点击选择日期"
            >
              {formatDateRange(displayStart, displayEnd)}
            </span>
          )}
          {[...new Set([...tags, ...parsed.tags])].map(tag => (
            <span key={tag} className="preview-tag">
              #{tag}
              <button
                type="button"
                className="tag-remove"
                onClick={() => removeTag(tag)}
              >
                &times;
              </button>
            </span>
          ))}
        </div>
      )}

      <input
        ref={pickerRef}
        type="date"
        style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: 1, height: 1, opacity: 0 }}
        onChange={handleCalendarPick}
      />
    </div>
  );
}
