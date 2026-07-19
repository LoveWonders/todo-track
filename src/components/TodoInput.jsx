import { useRef, useState, useCallback } from 'react';
import { useSmartInput } from '../hooks/useSmartInput';
import { useCalendarLogic } from '../hooks/useCalendarLogic';
import { useTagLogic } from '../hooks/useTagLogic';
import { formatDateRange } from '../utils/dateParser';

export default function TodoInput({ onAdd }) {
  const inputRef = useRef(null);
  const [pickedStart, setPickedStart] = useState(null);
  const [pickedEnd, setPickedEnd] = useState(null);
  const [isUrgent, setIsUrgent] = useState(false);

  const {
    text, setText, parsed, clear: clearSmart
  } = useSmartInput();

  const {
    startDate, dueDate, pickerRef, openPicker, handleCalendarPick, tryParseDateText
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
    const finalStart = pickedStart !== null ? pickedStart : startDate;
    const finalEnd = pickedEnd !== null ? pickedEnd : dueDate;
    const submittedTags = [...new Set([
      ...tags,
      ...parsed.tags,
      ...(isUrgent ? ['紧急'] : [])
    ])];

    if (!final && !finalEnd && submittedTags.length === 0) return;

    const title = final || formatDateRange(null, finalEnd) || '待办';

    onAdd({
      title,
      startDate: finalStart,
      dueDate: finalEnd,
      tags: submittedTags
    });
    clearSmart();
    clearTags();
    setIsUrgent(false);
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
  const displayText = formatDateRange(displayStart, displayEnd);

  const handleDateTextBlur = useCallback((e) => {
    const val = e.target.value;
    if (val && val !== displayText) {
      tryParseDateText(val);
    }
  }, [displayText, tryParseDateText]);

  const handleDateTextKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = e.target.value;
      if (val) tryParseDateText(val);
    }
  }, [tryParseDateText]);

  return (
    <div className="bottom-input">
      <div className="bottom-input-inner">
        {(displayEnd || tags.length > 0 || parsed.tags.length > 0) && (
          <div className="parsed-info">
            {displayEnd && (
              <div className="parsed-date">
                <input
                  type="text"
                  defaultValue={displayText}
                  key={displayText}
                  onBlur={handleDateTextBlur}
                  onKeyDown={handleDateTextKeyDown}
                />
                <button className="calendar-btn" onClick={() => openPicker('end')} title="选择日期">&#x1F4C5;</button>
              </div>
            )}
            <div className="parsed-tags">
              {[...new Set([...tags, ...parsed.tags])].map(tag => (
                <span key={tag} className="parsed-tag">
                  #{tag}
                  <button className="tag-remove" onClick={() => removeTag(tag)}>&times;</button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="input-row">
          <input
            ref={inputRef}
            type="text"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            placeholder="添加待办... @日期 #标签"
          />
          <button
            type="button"
            className={`btn-urgent ${isUrgent ? 'active' : ''}`}
            onClick={() => setIsUrgent(v => !v)}
            title="紧急"
          >
            !
          </button>
          <button
            type="button"
            className="btn-add"
            onClick={handleSubmit}
            disabled={!parsed.cleanContent.trim()}
          >
            +
          </button>
        </div>

        <input
          ref={pickerRef}
          type="date"
          style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: 1, height: 1, opacity: 0 }}
          onChange={handleCalendarPick}
        />
      </div>
    </div>
  );
}
