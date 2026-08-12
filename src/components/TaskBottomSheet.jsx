import { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import { formatDateOnly } from '../utils/dateParser';
import { useSmartInput } from '../hooks/useSmartInput';
import { useTagLogic } from '../hooks/useTagLogic';
import { useSettings } from '../hooks/useSettings';
import { isSafeTagName, mergeSubmitTags } from '../utils/tagMeta';
import { readJSON } from '../utils/storage';
import { CYCLE_LABELS, WEEKDAY_LABELS, anchorLabel } from '../utils/repeat';

const DEFAULT_PRESET_TAGS = ['工作', '长期', '个人'];
const PRESET_TAGS_STORAGE_KEY = 'todo_preset_tags';

function loadPresetTags() {
  return readJSON(PRESET_TAGS_STORAGE_KEY, null);
}

function savePresetTags(tags) {
  localStorage.setItem(PRESET_TAGS_STORAGE_KEY, JSON.stringify(tags));
}

export default function TaskBottomSheet({ isOpen, onClose, onAdd }) {
  const { settings, updateSetting } = useSettings();
  const { text, setText, parsed, clear: clearSmart } = useSmartInput();
  const { tags, toggleTag, clearTags } = useTagLogic([]);
  const [isUrgent, setIsUrgent] = useState(false);
  const [isChecklist, setIsChecklist] = useState(false);
  const [repeatRule, setRepeatRule] = useState(null);
  const [repeatAnchor, setRepeatAnchor] = useState(null);
  const [presetTags, setPresetTags] = useState(() => {
    const loaded = loadPresetTags();
    if (Array.isArray(loaded)) return loaded;
    if (Array.isArray(settings.presetTags)) return settings.presetTags;
    return DEFAULT_PRESET_TAGS;
  });
  const [editMode, setEditMode] = useState(false);
  const [editingTagIndex, setEditingTagIndex] = useState(-1);
  const [editText, setEditText] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);
  const [newTagText, setNewTagText] = useState('');
  const editInputRef = useRef(null);
  const addInputRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    if (Array.isArray(presetTags)) {
      savePresetTags(presetTags);
      updateSetting('presetTags', presetTags);
    }
  }, [presetTags]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    if (editingTagIndex >= 0 && editInputRef.current) {
      editInputRef.current.focus();
      editInputRef.current.select();
    }
  }, [editingTagIndex]);

  useEffect(() => {
    if (showAddInput && addInputRef.current) {
      addInputRef.current.focus();
    }
  }, [showAddInput]);

  const pickedStart = parsed.startDate;
  const pickedEnd = parsed.dueDate;
  const submittedTags = useMemo(() => mergeSubmitTags(tags, parsed.tags, isUrgent), [tags, parsed.tags, isUrgent]);

  const handlePresetTagClick = useCallback((tag) => {
    if (editMode) return;
    toggleTag(tag);
  }, [editMode, toggleTag]);

  const handleDeleteTag = useCallback((index) => {
    setPresetTags(prev => {
      if (!Array.isArray(prev)) return prev;
      return prev.filter((_, i) => i !== index);
    });
    setEditingTagIndex(-1);
  }, []);

  const handleStartEditTag = useCallback((index, currentText) => {
    setEditingTagIndex(index);
    setEditText(currentText);
  }, []);

  const handleSaveEditTag = useCallback(() => {
    if (editingTagIndex < 0) return;
    const trimmed = editText.trim();
    if (trimmed && isSafeTagName(trimmed)) {
      setPresetTags(prev => {
        if (!Array.isArray(prev) || editingTagIndex >= prev.length) return prev;
        const updated = [...prev];
        updated[editingTagIndex] = trimmed;
        return updated;
      });
    }
    setEditingTagIndex(-1);
    setEditText('');
  }, [editingTagIndex, editText]);

  const handleKeyDownEdit = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSaveEditTag();
    } else if (e.key === 'Escape') {
      setEditingTagIndex(-1);
      setEditText('');
    }
  }, [handleSaveEditTag]);

  const handleAddTag = useCallback(() => {
    const trimmed = newTagText.trim();
    if (!trimmed) return;
    if (!isSafeTagName(trimmed)) { setNewTagText(''); return; }
    if (!presetTags.includes(trimmed)) {
      setPresetTags(prev => [...prev, trimmed]);
      setNewTagText('');
    }
  }, [newTagText, presetTags]);

  const handleKeyDownAdd = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    } else if (e.key === 'Escape') {
      setShowAddInput(false);
      setNewTagText('');
    }
  }, [handleAddTag]);

  const handleBlurAdd = useCallback(() => {
    if (newTagText.trim()) {
      handleAddTag();
    }
    setShowAddInput(false);
  }, [newTagText, handleAddTag]);

  const handleSubmit = useCallback(() => {
    const final = parsed.cleanContent.trim();
    const finalDueDate = pickedEnd || null;
    const title = final || formatDateOnly(finalDueDate) || '待办';
    onAdd({ title, startDate: pickedStart, dueDate: finalDueDate, tags: submittedTags, checklistMode: isChecklist, repeatRule, repeatAnchor });
    clearSmart();
    clearTags();
    setIsUrgent(false);
    setIsChecklist(false);
    setRepeatRule(null);
    setRepeatAnchor(null);
    onClose();
  }, [pickedStart, pickedEnd, submittedTags, parsed, onAdd, clearSmart, clearTags, isChecklist, repeatRule, repeatAnchor, onClose]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const canSubmit = parsed.cleanContent.trim() || pickedEnd || submittedTags.length > 0;

  const safePresetTags = Array.isArray(presetTags) ? presetTags : [];

  const openCalendar = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'datetime-local';
    if (pickedEnd) {
      input.value = pickedEnd.slice(0, 16);
    }
    input.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0';
    document.body.appendChild(input);
    input.addEventListener('change', (e) => {
      const picked = e.target.value;
      if (picked) {
        const iso = picked + ':00';
        onAdd({ 
          title: text.trim() || formatDateOnly(iso) || '待办',
          startDate: pickedStart,
          dueDate: iso,
          tags: submittedTags,
          checklistMode: isChecklist,
          repeatRule,
          repeatAnchor,
        });
        clearSmart();
        clearTags();
        setIsUrgent(false);
        setIsChecklist(false);
        setRepeatRule(null);
        setRepeatAnchor(null);
        onClose();
      }
      if (document.body.contains(input)) document.body.removeChild(input);
    }, { once: true });
    requestAnimationFrame(() => {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.focus();
      }
    });
  }, [pickedEnd, pickedStart, submittedTags, text, onAdd, clearSmart, clearTags, isChecklist, repeatRule, repeatAnchor, onClose]);

  if (!isOpen) return null;

  return (
    <>
      <div className="bottom-sheet-overlay" onClick={onClose} />
      <div className="bottom-sheet">
        <div className="bottom-sheet-handle" />

        <div className="sheet-section">
          <div className="preset-tags-header">
            <label className="sheet-label">快捷标签</label>
            <button className="btn-edit-tags" onClick={() => setEditMode(v => !v)}>
              {editMode ? '完成' : '编辑'}
            </button>
          </div>
          <div className="preset-tags-scroll">
            {safePresetTags.map((tag, index) => (
              editingTagIndex === index ? (
                <input
                  key={tag}
                  ref={editInputRef}
                  className="preset-tag-edit-input"
                  value={editText}
                  onChange={e => setEditText(e.target.value)}
                  onBlur={handleSaveEditTag}
                  onKeyDown={handleKeyDownEdit}
                />
              ) : (
                <button
                  key={tag}
                  className={`preset-tag ${tags.includes(tag) ? 'active' : ''} ${editMode ? 'editing' : ''}`}
                  onClick={() => editMode ? handleStartEditTag(index, tag) : handlePresetTagClick(tag)}
                >
                  #{tag}
                  {editMode && (
                    <span className="preset-tag-delete" onClick={(e) => { e.stopPropagation(); handleDeleteTag(index); }}>
                      ×
                    </span>
                  )}
                </button>
              )
            ))}
            {editMode && showAddInput && (
              <input
                ref={addInputRef}
                className="preset-tag-edit-input"
                value={newTagText}
                onChange={e => setNewTagText(e.target.value)}
                onBlur={handleBlurAdd}
                onKeyDown={handleKeyDownAdd}
                placeholder="标签名..."
              />
            )}
            {editMode && !showAddInput && (
              <button className="preset-tag-add" onClick={() => setShowAddInput(true)}>
                + 添加
              </button>
            )}
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
          <label className="sheet-label">清单模式</label>
          <div className="sheet-option-row">
            <button
              className={`detail-toggle ${isChecklist ? 'on' : ''}`}
              onClick={() => setIsChecklist(v => !v)}
              role="switch"
              aria-checked={isChecklist}
            >
              <span className="detail-toggle-knob" />
            </button>
            <span className="detail-toggle-hint">{isChecklist ? '拆解勾选' : '流水账'}</span>
          </div>
        </div>

        <div className="sheet-section">
          <label className="sheet-label">设为重复</label>
          <div className="sheet-option-row">
            <div className="repeat-selector">
              {['daily', 'weekly', 'monthly'].map(rule => (
                <button
                  key={rule}
                  className={`repeat-opt ${repeatRule === rule ? 'active' : ''}`}
                  onClick={() => {
                    setRepeatRule(prev => (prev === rule ? null : rule));
                    setRepeatAnchor(null);
                  }}
                >
                  {CYCLE_LABELS[rule]}
                </button>
              ))}
            </div>
            <span className="detail-toggle-hint">
              {repeatRule ? `重复任务 · ${anchorLabel(repeatRule, repeatAnchor)}` : '不重复'}
            </span>
          </div>
          {repeatRule === 'weekly' && (
            <div className="repeat-anchor-row">
              {WEEKDAY_LABELS.map((label, i) => (
                <button
                  key={i}
                  className={`repeat-anchor-opt ${repeatAnchor === i + 1 ? 'active' : ''}`}
                  onClick={() => setRepeatAnchor(repeatAnchor === i + 1 ? null : i + 1)}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          {repeatRule === 'monthly' && (
            <div className="repeat-anchor-row">
              <input
                type="number"
                min="1"
                max="31"
                className="repeat-anchor-input"
                value={Number.isInteger(repeatAnchor) ? repeatAnchor : ''}
                placeholder="号数"
                onChange={e => {
                  const raw = e.target.value;
                  if (raw === '') { setRepeatAnchor(null); return; }
                  const v = Math.min(31, Math.max(1, Number(raw)));
                  setRepeatAnchor(Number.isNaN(v) ? null : v);
                }}
              />
              <button
                className={`repeat-anchor-opt ${repeatAnchor === 'last' ? 'active' : ''}`}
                onClick={() => setRepeatAnchor(repeatAnchor === 'last' ? null : 'last')}
              >
                月末
              </button>
              <span className="detail-toggle-hint">不选则每月最后一天到期</span>
            </div>
          )}
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
            {pickedEnd && (
              <span className="parsed-date-preview" onClick={openCalendar} title="点击修改日期">
                📅 {formatDateOnly(pickedEnd)}
              </span>
            )}
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
