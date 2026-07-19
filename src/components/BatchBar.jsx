import { useState, useRef, useEffect } from 'react';
import { parseDateText } from '../utils/dateParser';

export default function BatchBar({ count, total, onCancel, onDelete, onComplete, onCancelItems, onSetDate, onSetTags, onAddProgress, onOpenCompleteDateModal, onSelectAll, onInvertSelection }) {
  const [activeAction, setActiveAction] = useState(null);
  const [inputText, setInputText] = useState('');
  const [dateText, setDateText] = useState('');
  const inputRef = useRef(null);

  useEffect(() => {
    setActiveAction(null);
    setInputText('');
    setDateText('');
  }, [count]);

  useEffect(() => {
    if (activeAction && inputRef.current) {
      inputRef.current.focus();
    }
  }, [activeAction]);

  const handleDateSubmit = () => {
    const trimmed = dateText.trim();
    if (trimmed) {
      const parsed = parseDateText(trimmed);
      if (parsed) {
        onSetDate(parsed);
        setActiveAction(null);
        return;
      }
    }
    onSetDate(null);
    setActiveAction(null);
  };

  const handleTagsSubmit = () => {
    const tags = inputText.split(/\s+/).filter(Boolean).map(t => t.replace(/^#/, ''));
    if (tags.length > 0) {
      onSetTags(tags);
    }
    setActiveAction(null);
  };

  const handleProgressSubmit = () => {
    if (inputText.trim()) {
      onAddProgress(inputText.trim());
    }
    setActiveAction(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeAction === 'date') handleDateSubmit();
      else if (activeAction === 'tags') handleTagsSubmit();
      else if (activeAction === 'progress') handleProgressSubmit();
    } else if (e.key === 'Escape') {
      setActiveAction(null);
    }
  };

  return (
    <div className="batch-bar">
      {activeAction ? (
        <div className="batch-action-panel">
          <button className="batch-action-back" onClick={() => setActiveAction(null)}>&#x2190; 返回</button>

          {activeAction === 'date' && (
            <div className="batch-action-row">
              <input
                ref={inputRef}
                className="batch-input batch-input-date"
                placeholder="输入日期：明天、下周一、20260710"
                value={dateText}
                onChange={e => setDateText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="calendar-btn" onClick={() => inputRef.current?.focus()}>&#x1F4C5;</button>
              <button className="btn-mini btn-mini-save" onClick={handleDateSubmit}>确认</button>
            </div>
          )}

          {activeAction === 'tags' && (
            <div className="batch-action-row">
              <input
                ref={inputRef}
                className="batch-input"
                placeholder="输入标签（空格分隔），如 #工作 #紧急"
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="btn-mini btn-mini-save" onClick={handleTagsSubmit}>添加</button>
            </div>
          )}

          {activeAction === 'progress' && (
            <div className="batch-action-row">
              <input
                ref={inputRef}
                className="batch-input"
                placeholder="输入工作进度..."
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="btn-mini btn-mini-save" onClick={handleProgressSubmit}>添加</button>
            </div>
          )}

          {activeAction === 'confirm_delete' && (
            <div className="batch-action-row">
              <span style={{ color: 'var(--danger)', fontWeight: 500, fontSize: 14 }}>确认删除 {count} 项待办？</span>
              <button className="btn-mini btn-mini-save" onClick={() => { onDelete(); setActiveAction(null); }} style={{ background: 'var(--danger)' }}>确认删除</button>
              <button className="btn-mini btn-mini-cancel" onClick={() => setActiveAction(null)}>取消</button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="batch-top-row">
            <span className="batch-count">已选 {count} 项</span>
            <button className="batch-cancel" onClick={onCancel}>取消</button>
          </div>
          <div className="batch-select-row">
            <button className="batch-select-btn" onClick={onSelectAll}>全选</button>
            <button className="batch-select-btn" onClick={onInvertSelection}>反选</button>
          </div>
          <div className="batch-actions">
            <button className="batch-btn done" onClick={onComplete}>完成</button>
            <button className="batch-btn cancel" onClick={onCancelItems}>作废</button>
            <button className="batch-btn date" onClick={() => { setInputText(''); setDateText(''); setActiveAction('date'); }}>时间</button>
            <button className="batch-btn tags" onClick={() => { setInputText(''); setActiveAction('tags'); }}>标签</button>
            <button className="batch-btn progress" onClick={() => { setInputText(''); setActiveAction('progress'); }}>进度</button>
            <button className="batch-btn date" onClick={onOpenCompleteDateModal}>修改完成时间</button>
            <button className="batch-btn danger" onClick={() => setActiveAction('confirm_delete')}>删除</button>
          </div>
        </>
      )}
    </div>
  );
}
