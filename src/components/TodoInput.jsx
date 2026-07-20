import { useRef, useState, useCallback } from 'react';
import * as chrono from 'chrono-node';
import { useSmartInput } from '../hooks/useSmartInput';
import { useTagLogic } from '../hooks/useTagLogic';
import { formatDateRange } from '../utils/dateParser';
import { toISODateTime, extractDatePart, parseLocalDate } from '../utils/datePatterns';

function tryParseDateText(text) {
  if (!text || !text.trim()) return null;

  try {
    const results = chrono.zh.parse(text, new Date(), { forwardDate: true });
    if (results.length > 0) {
      const parsed = results[0];
      if (!parsed.start) return null;
      const hasRange = parsed.end && parsed.end.date().getTime() !== parsed.start.date().getTime();
      const end = toISODateTime((parsed.end || parsed.start).date());
      const start = hasRange ? toISODateTime(parsed.start.date()) : null;
      return { start, end };
    }
  } catch { /* fall through */ }

  const fallback = parseLocalDate(text);
  if (fallback) {
    return { start: null, end: toISODateTime(fallback) };
  }
  return null;
}

export default function TodoInput({ onAdd }) {
  const inputRef = useRef(null);
  const pickerRef = useRef(null);
  const pickTargetRef = useRef('end');
  const [pickedStart, setPickedStart] = useState(null);
  const [pickedEnd, setPickedEnd] = useState(null);
  const [isUrgent, setIsUrgent] = useState(false);

  const { text, setText, parsed, clear: clearSmart } = useSmartInput();
  const { tags, removeTag, clearTags } = useTagLogic([]);

  const effectiveStart = pickedStart != null ? pickedStart : parsed.startDate;
  const effectiveEnd = pickedEnd != null ? pickedEnd : parsed.dueDate;
  const displayText = formatDateRange(effectiveStart, effectiveEnd);
  const submittedTags = [...new Set([...tags, ...parsed.tags, ...(isUrgent ? ['紧急'] : [])])];

  const canSubmit = parsed.cleanContent.trim() || effectiveEnd || submittedTags.length > 0;

  const openPicker = useCallback((target) => {
    const input = pickerRef.current;
    if (!input) return;
    pickTargetRef.current = target;
    const current = target === 'start' ? effectiveStart : effectiveEnd;
    input.value = current ? extractDatePart(current) : '';
    requestAnimationFrame(() => {
      typeof input.showPicker === 'function' ? input.showPicker() : input.focus();
    });
  }, [effectiveStart, effectiveEnd]);

  const handleCalendarPick = useCallback((e) => {
    const picked = e.target.value;
    if (!picked) return;
    const iso = picked + 'T23:59:59';
    if (pickTargetRef.current === 'start') {
      setPickedStart(iso);
    } else {
      setPickedEnd(iso);
    }
  }, []);

  const handleDateTextBlur = useCallback((e) => {
    const val = e.target.value;
    if (!val || val === displayText) return;
    const result = tryParseDateText(val);
    if (result) {
      if (result.start) setPickedStart(result.start);
      setPickedEnd(result.end);
    }
  }, [displayText]);

  const handleDateTextKeyDown = useCallback((e) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = e.target.value;
    if (!val) return;
    const result = tryParseDateText(val);
    if (result) {
      if (result.start) setPickedStart(result.start);
      setPickedEnd(result.end);
    }
  }, []);

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    const final = parsed.cleanContent.trim();
    const title = final || formatDateRange(null, effectiveEnd) || '待办';

    onAdd({ title, startDate: effectiveStart, dueDate: effectiveEnd, tags: submittedTags });
    clearSmart();
    clearTags();
    setIsUrgent(false);
    setPickedStart(null);
    setPickedEnd(null);
  }, [canSubmit, parsed, effectiveStart, effectiveEnd, submittedTags, onAdd, clearSmart, clearTags]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  return (
    <div className="bottom-input">
      <div className="bottom-input-inner">
        {(effectiveEnd || submittedTags.length > 0) && (
          <div className="parsed-info">
            {effectiveEnd && (
              <div className="parsed-date">
                <input type="text" defaultValue={displayText} key={displayText}
                  onBlur={handleDateTextBlur} onKeyDown={handleDateTextKeyDown} />
                <button className="calendar-btn" onClick={() => openPicker('end')} title="选择日期">&#x1F4C5;</button>
              </div>
            )}
            <div className="parsed-tags">
              {submittedTags.map(tag => (
                <span key={tag} className="parsed-tag">
                  #{tag}
                  <button className="tag-remove" onClick={() => removeTag(tag)}>&times;</button>
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="input-row">
          <input ref={inputRef} type="text" value={text}
            onChange={e => setText(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="添加待办... @日期 #标签" />
          <button type="button" className={`btn-urgent ${isUrgent ? 'active' : ''}`}
            onClick={() => setIsUrgent(v => !v)} title="紧急">!</button>
          <button type="button" className="btn-add" onClick={handleSubmit}
            disabled={!canSubmit}>+</button>
        </div>

        <input ref={pickerRef} type="date"
          style={{ position: 'fixed', top: '-9999px', left: '-9999px', width: 1, height: 1, opacity: 0 }}
          onChange={handleCalendarPick} />
      </div>
    </div>
  );
}
