import { useState, useCallback, useRef, useEffect } from 'react';
import { toISODateTime } from '../utils/datePatterns';
import { formatDateOnly } from '../utils/dateParser';
import { useSmartInput } from '../hooks/useSmartInput';
import { useTagLogic } from '../hooks/useTagLogic';
import { URGENT_TAG } from '../constants';
import { useSettings } from '../hooks/useSettings';

const DEFAULT_PRESET_TAGS = ['长期', '个人', '总结'];

export default function TaskBottomSheet({ isOpen, onClose, onAdd }) {
  const { settings } = useSettings();
  const { text, setText, parsed, clear: clearSmart } = useSmartInput();
  const { tags, toggleTag, clearTags } = useTagLogic([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [presetTags, setPresetTags] = useState(settings.presetTags || DEFAULT_PRESET_TAGS);
  const inputRef = useRef(null);

  useEffect(() => {
    if (settings.presetTags) setPresetTags(settings.presetTags);
  }, [settings.presetTags]);

  const pickedStart = parsed.startDate;
  const pickedEnd = parsed.dueDate;
  const submittedTags = [...new Set([...tags, ...parsed.tags, ...(isUrgent ? [URGENT_TAG] : [])])];

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  const handlePresetTagClick = useCallback((tag) => {
    toggleTag(tag);
  }, [toggleTag]);

  const handleSubmit = useCallback(() => {
    const final = parsed.cleanContent.trim();
    let finalDueDate = pickedEnd;
    if (!finalDueDate) {
      finalDueDate = makeDefaultDueDate(settings.defaultDueMinute);
    }
    const title = final || formatDateOnly(finalDueDate) || '待办';
    onAdd({ title, startDate: pickedStart, dueDate: finalDueDate, tags: submittedTags });
    clearSmart();
    clearTags();
    setIsUrgent(false);
    onClose();
  }, [pickedStart, pickedEnd, submittedTags, parsed, onAdd, clearSmart, clearTags, settings.defaultDueMinute, onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const canSubmit = parsed.cleanContent.trim() || pickedEnd || submittedTags.length > 0;

  if (!isOpen) return null;

  return (
    <>
      <div className="bottom-sheet-overlay" onClick={onClose} />
      <div className="bottom-sheet">
        <div className="bottom-sheet-handle" />

        <div className="sheet-section">
          <label className="sheet-label">快捷标签</label>
          <div className="preset-tags-scroll">
            {presetTags.map(tag => (
              <button
                key={tag}
                className={`preset-tag ${tags.includes(tag) ? 'active' : ''}`}
                onClick={() => handlePresetTagClick(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        </div>

        <div className="sheet-section">
          <label className="sheet-label">紧急程度</label>
          <button
            className={`urgent-toggle ${isUrgent ? 'active' : ''}`}
            onClick={() => setIsUrgent(v => !v)}
          >
            <span className="urgent-icon">!</span>
            <span className="urgent-text">{isUrgent ? '已设为紧急' : '设为紧急'}</span>
          </button>
        </div>

        <div className="sheet-section">
          <label className="sheet-label">任务内容</label>
          <textarea
            ref={inputRef}
            className="task-input-textarea"
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入任务内容... (支持 @日期 #标签)"
            rows={4}
          />
        </div>

        {(pickedEnd || submittedTags.length > 0) && (
          <div className="parsed-preview">
            {pickedEnd && <span className="parsed-date-preview">📅 {formatDateOnly(pickedEnd)}</span>}
            {submittedTags.map(tag => (
              <span key={tag} className="parsed-tag-preview">#{tag}</span>
            ))}
          </div>
        )}

        <div className="sheet-actions">
          <button className="btn-sheet-cancel" onClick={onClose}>取消</button>
          <button className="btn-sheet-submit" onClick={handleSubmit} disabled={!canSubmit}>添加</button>
        </div>
      </div>
    </>
  );
}

function makeDefaultDueDate(defaultDueMinute) {
  const now = new Date();
  now.setHours(21, defaultDueMinute, 0, 0);
  return toISODateTime(now);
}
