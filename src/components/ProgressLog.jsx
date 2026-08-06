import { useState, useMemo, useCallback } from 'react';
import { useTodoActions, useTodoView } from '../hooks/TodoContext';
import CompleteDateModal from './CompleteDateModal';
import ProgressManageBar from './ProgressManageBar';
import ProgressDefaultBar from './ProgressDefaultBar';

const LONG_TEXT_THRESHOLD = 20;

function isLongProgressText(text) {
  return String(text).length > LONG_TEXT_THRESHOLD;
}

export default function ProgressLog({ progress, todoId, collapsed }) {
  const { toggleProgressStatus, toggleStatus, deleteProgress, addProgress, updateProgress, updateProgressCompletedAt, setFabHidden } = useTodoActions();
  const { batchMode } = useTodoView();
  
  // 状态定义
  const [progressText, setProgressText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [selectedPIds, setSelectedPIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [editing, setEditing] = useState(null);

  // 数据预处理（所有变量定义必须在条件 return 之前）
  const items = Array.isArray(progress) ? progress : [];
  const progressCount = items.length;
  const inBatch = batchMode;

  // 事件处理函数（必须在条件 return 之前定义）
  const exitManage = useCallback(() => {
    setManageMode(false);
    setSelectedPIds(new Set());
    setConfirmDelete(false);
    setShowDateModal(false);
  }, []);

  const handleSubmit = useCallback(() => {
    const trimmed = progressText.trim();
    if (!trimmed) return;
    addProgress(todoId, trimmed);
    setProgressText('');
    setShowInput(false);
    setFabHidden(false);
  }, [progressText, todoId, addProgress, setFabHidden]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  }, [handleSubmit]);

  const toggleSelect = useCallback((pid) => {
    setSelectedPIds(prev => {
      const next = new Set(prev);
      if (next.has(pid)) {
        next.delete(pid);
      } else {
        next.add(pid);
      }
      return next;
    });
  }, []);

  const handleOpenEdit = useCallback((p) => {
    setEditing({ progress: p, text: p.text ?? '' });
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editing) return;
    const trimmed = editing.text.trim();
    if (trimmed && trimmed !== editing.progress.text) {
      updateProgress(todoId, editing.progress.id, trimmed);
    }
    setEditing(null);
    setFabHidden(false);
  }, [editing, todoId, updateProgress, setFabHidden]);

  const handleBatchDelete = useCallback(() => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    selectedPIds.forEach(pid => deleteProgress(todoId, pid));
    exitManage();
  }, [confirmDelete, selectedPIds, todoId, deleteProgress, exitManage]);

  const handleBatchComplete = useCallback(() => {
    selectedPIds.forEach(pid => toggleProgressStatus(todoId, pid, 'completed'));
    exitManage();
  }, [selectedPIds, todoId, toggleProgressStatus, exitManage]);

  const handleBatchCancel = useCallback(() => {
    selectedPIds.forEach(pid => toggleProgressStatus(todoId, pid, 'cancelled'));
    exitManage();
  }, [selectedPIds, todoId, toggleProgressStatus, exitManage]);

  const hasSelection = selectedPIds.size > 0;

  const { activeProgress, archivedProgress } = useMemo(() => {
    const active = [];
    const archived = [];
    for (const p of items) {
      (p.status === 'active' ? active : archived).push(p);
    }
    return { activeProgress: active, archivedProgress: archived };
  }, [items]);

  const completedCount = items.filter(p => p.status === 'completed').length;
  const allCompleted = progressCount > 0 && completedCount === progressCount;
  const summaryPct = progressCount > 0 ? Math.round((completedCount / progressCount) * 100) : 0;

  const sortedArchived = useMemo(() => {
    const completed = [];
    const cancelled = [];
    for (const p of archivedProgress) {
      (p.status === 'completed' ? completed : cancelled).push(p);
    }
    const ts = p => new Date(p.completedAt ?? p.createdAt ?? p.time ?? 0).getTime();
    completed.sort((a, b) => ts(b) - ts(a));
    return [...completed, ...cancelled];
  }, [archivedProgress]);

  // 安全渲染：折叠时不渲染
  if (collapsed) {
    return null;
  }

  // 安全渲染：无进度时显示添加界面（与有进度时相同的布局结构）
  if (progressCount === 0) {
    return (
      <div className="progress-section">
        {!inBatch && (
          <div className="todo-progress-bar">
            {!showInput ? (
              <ProgressDefaultBar
                showInput={false}
                progressText=""
                allCount={0}
                onShowInput={() => setShowInput(true)}
                onTextChange={setProgressText}
                onKeyDown={handleKeyDown}
                onSubmit={handleSubmit}
                onCancelInput={() => setShowInput(false)}
                onManage={() => {}}
              />
            ) : (
              <>
                <input
                  type="text"
                  className="progress-input-field-compact"
                  value={progressText}
                  onChange={(e) => setProgressText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onFocus={() => setFabHidden(true)}
                  onBlur={() => setFabHidden(false)}
                  placeholder="输入进度内容..."
                  autoFocus
                />
                <button
                  className="btn-progress-submit-compact"
                  onClick={handleSubmit}
                  disabled={!progressText.trim()}
                >
                  确定
                </button>
                <button
                  className="btn-progress-cancel-compact"
                  onClick={() => { setShowInput(false); setProgressText(''); setFabHidden(false); }}
                >
                  取消
                </button>
              </>
            )}
          </div>
        )}
      </div>
    );
  }

  // 安全渲染：有进度时显示列表
  return (
    <div className="progress-section" onClick={inBatch ? e => e.stopPropagation() : undefined}>
      {!inBatch && progressCount > 0 && (
        <div className={`progress-summary ${allCompleted ? 'all-done' : ''}`}>
          <span className="progress-summary-text">已完成 {completedCount}/{progressCount}</span>
          <div className="progress-summary-bar">
            <div className="progress-summary-fill" style={{ width: `${summaryPct}%` }} />
          </div>
          {allCompleted && (
            <button
              className="btn-mini btn-mini-save progress-finish-btn"
              onClick={(e) => { e.stopPropagation(); toggleStatus(todoId, 'completed'); }}
              title="全部子项已完成，一键完成待办"
            >
              完成待办
            </button>
          )}
        </div>
      )}

      {activeProgress.length > 0 && (
        <div className="progress-active-row">
          {activeProgress.map(p => (
            <div key={p.id}
              className={`progress-entry active progress-card ${isLongProgressText(p.text) ? 'progress-long' : 'progress-short'} ${manageMode ? 'progress-manage' : 'progress-clickable'} ${selectedPIds.has(p.id) ? 'progress-selected' : ''}`}
              onClick={manageMode ? () => toggleSelect(p.id) : () => handleOpenEdit(p)}>
              {!inBatch && !manageMode && (
                <span className="progress-actions">
                  <button className="p-action done" onClick={(e) => { e.stopPropagation(); toggleProgressStatus(todoId, p.id, 'completed'); }} title="完成">&#x2713;</button>
                </span>
              )}
              {manageMode && (
                <span className={`progress-check-circle ${selectedPIds.has(p.id) ? 'checked' : ''}`}>
                  {selectedPIds.has(p.id) ? '\u2713' : ''}
                </span>
              )}
              <span className="progress-date">{new Date(p.createdAt ?? p.time).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
              <span className="progress-text">{String(p.text)}</span>
            </div>
          ))}
        </div>
      )}

      {!inBatch && (
        <div className="todo-progress-bar">
          {manageMode ? (
            <ProgressManageBar
              selectedCount={selectedPIds.size} confirmDelete={confirmDelete}
              onComplete={handleBatchComplete} onCancelItems={handleBatchCancel}
              onDelete={handleBatchDelete} onSetDate={() => setShowDateModal(true)}
              onExit={exitManage} onCancelConfirm={() => setConfirmDelete(false)}
              hasSelection={hasSelection}
            />
          ) : (
            <ProgressDefaultBar
              showInput={showInput} progressText={progressText}
              allCount={progressCount}
              onShowInput={() => setShowInput(true)} onTextChange={setProgressText}
              onKeyDown={handleKeyDown} onSubmit={handleSubmit}
              onCancelInput={() => { setShowInput(false); setFabHidden(false); }}
              onManage={() => { setManageMode(true); setConfirmDelete(false); }}
            />
          )}
        </div>
      )}

      {archivedProgress.length > 0 && (
        <div className="progress-archive">
          <div className="archive-toggle" onClick={() => setShowArchived(v => !v)}>
            <span className={`triangle ${showArchived ? 'open' : ''}`}>&#x25B6;</span>
            <span>已归档进度 ({archivedProgress.length})</span>
          </div>
          {showArchived && (
            <div className="progress-log archived">
              {sortedArchived.map(p => (
                <div key={p.id}
                  className={`progress-entry ${p.status} ${manageMode ? 'progress-manage' : 'progress-clickable'} ${selectedPIds.has(p.id) ? 'progress-selected' : ''}`}
                  onClick={manageMode ? () => toggleSelect(p.id) : () => handleOpenEdit(p)}>
                  {!inBatch && !manageMode && (
                    <span className="progress-actions">
                      <button className="p-action undo" onClick={(e) => { e.stopPropagation(); toggleProgressStatus(todoId, p.id, p.status); }} title="恢复">&#x21A9;</button>
                    </span>
                  )}
                  {manageMode && (
                    <span className={`progress-check-circle ${selectedPIds.has(p.id) ? 'checked' : ''}`}>
                      {selectedPIds.has(p.id) ? '\u2713' : ''}
                    </span>
                  )}
                  <span className="progress-status-tag">{p.status === 'completed' ? '已完成' : '已作废'}</span>
                  <span className="progress-date">{new Date(p.completedAt ?? p.createdAt ?? p.time).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
                  {String(p.text)}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showDateModal && (
        <CompleteDateModal count={selectedPIds.size}
          onConfirm={(dateString) => { selectedPIds.forEach(pid => updateProgressCompletedAt(todoId, pid, dateString)); exitManage(); }}
          onCancel={() => setShowDateModal(false)} />
      )}

      {editing && (
        <div className="modal-full-overlay" onClick={() => { setEditing(null); setFabHidden(false); }}>
          <div className="modal-full-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-full-header">
              <span className="modal-full-title">编辑进度</span>
              <button className="modal-full-close" onClick={() => { setEditing(null); setFabHidden(false); }}>&times;</button>
            </div>
            <div className="modal-full-body">
              <textarea
                className="modal-edit-textarea"
                value={editing.text}
                onChange={e => setEditing(prev => ({ ...prev, text: e.target.value }))}
                onFocus={() => setFabHidden(true)}
                onBlur={() => setFabHidden(false)}
                autoFocus
              />
            </div>
            <div className="modal-full-footer">
              <button className="btn-cancel" onClick={() => { setEditing(null); setFabHidden(false); }}>取消</button>
              <button className="btn-save" onClick={handleSaveEdit}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
