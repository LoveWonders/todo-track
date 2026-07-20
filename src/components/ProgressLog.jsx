import { useState, useMemo, useCallback } from 'react';
import CompleteDateModal from './CompleteDateModal';

export default function ProgressLog({ progress, todoId, onToggleProgressStatus, onDeleteProgress, onAddProgress, onUpdateProgress, onUpdateProgressCompletedAt, inBatch }) {
  const [progressText, setProgressText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [selectedPIds, setSelectedPIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const items = progress ?? [];

  const { activeProgress, archivedProgress, allCount } = useMemo(() => {
    const active = [];
    const archived = [];
    for (const p of items) {
      (p.status === 'active' ? active : archived).push(p);
    }
    return { activeProgress: active, archivedProgress: archived, allCount: items.length };
  }, [items]);

  const toggleSelect = useCallback((pid) => {
    setSelectedPIds(prev => {
      const next = new Set(prev);
      next.has(pid) ? next.delete(pid) : next.add(pid);
      return next;
    });
  }, []);

  const exitManage = useCallback(() => {
    setManageMode(false);
    setSelectedPIds(new Set());
    setConfirmDelete(false);
    setShowDateModal(false);
  }, []);

  const handleBatchDelete = useCallback(() => {
    if (!confirmDelete) { setConfirmDelete(true); return; }
    selectedPIds.forEach(pid => onDeleteProgress(todoId, pid));
    exitManage();
  }, [confirmDelete, selectedPIds, todoId, onDeleteProgress, exitManage]);

  const handleBatchComplete = useCallback(() => {
    selectedPIds.forEach(pid => onToggleProgressStatus(todoId, pid, 'completed'));
    exitManage();
  }, [selectedPIds, todoId, onToggleProgressStatus, exitManage]);

  const handleBatchCancel = useCallback(() => {
    selectedPIds.forEach(pid => onToggleProgressStatus(todoId, pid, 'cancelled'));
    exitManage();
  }, [selectedPIds, todoId, onToggleProgressStatus, exitManage]);

  const handleSubmit = useCallback(() => {
    const trimmed = progressText.trim();
    if (!trimmed) return;
    onAddProgress(todoId, trimmed);
    setProgressText('');
    setShowInput(false);
  }, [progressText, todoId, onAddProgress]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
  }, [handleSubmit]);

  const handleOpenEdit = useCallback((p) => {
    setEditing({ progress: p, text: p.text ?? '' });
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (!editing) return;
    const trimmed = editing.text.trim();
    if (trimmed && trimmed !== editing.progress.text) {
      onUpdateProgress(todoId, editing.progress.id, trimmed);
    }
    setEditing(null);
  }, [editing, todoId, onUpdateProgress]);

  const hasSelection = selectedPIds.size > 0;

  return (
    <div className="progress-section" onClick={inBatch ? e => e.stopPropagation() : undefined}>
      {activeProgress.length > 0 && (
        <div className="progress-active-row">
          {activeProgress.map(p => (
            <div key={p.id}
              className={`progress-entry active progress-card ${manageMode ? 'progress-manage' : 'progress-clickable'} ${selectedPIds.has(p.id) ? 'progress-selected' : ''}`}
              onClick={manageMode ? () => toggleSelect(p.id) : () => handleOpenEdit(p)}>
              {!inBatch && !manageMode && (
                <span className="progress-actions">
                  <button className="p-action done" onClick={(e) => { e.stopPropagation(); onToggleProgressStatus(todoId, p.id, 'completed'); }} title="完成">&#x2713;</button>
                </span>
              )}
              {manageMode && (
                <span className={`progress-check-circle ${selectedPIds.has(p.id) ? 'checked' : ''}`}>
                  {selectedPIds.has(p.id) ? '\u2713' : ''}
                </span>
              )}
              <span className="progress-date">{new Date(p.createdAt ?? p.time).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
              <span className="progress-text">{p.text}</span>
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
              allCount={allCount}
              onShowInput={() => setShowInput(true)} onTextChange={setProgressText}
              onKeyDown={handleKeyDown} onSubmit={handleSubmit}
              onCancelInput={() => setShowInput(false)}
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
              {archivedProgress.map(p => (
                <div key={p.id}
                  className={`progress-entry ${p.status} ${manageMode ? 'progress-manage' : 'progress-clickable'} ${selectedPIds.has(p.id) ? 'progress-selected' : ''}`}
                  onClick={manageMode ? () => toggleSelect(p.id) : () => handleOpenEdit(p)}>
                  {!inBatch && !manageMode && (
                    <span className="progress-actions">
                      <button className="p-action undo" onClick={(e) => { e.stopPropagation(); onToggleProgressStatus(todoId, p.id, p.status); }} title="恢复">&#x21A9;</button>
                    </span>
                  )}
                  {manageMode && (
                    <span className={`progress-check-circle ${selectedPIds.has(p.id) ? 'checked' : ''}`}>
                      {selectedPIds.has(p.id) ? '\u2713' : ''}
                    </span>
                  )}
                  <span className="progress-status-tag">{p.status === 'completed' ? '已完成' : '已作废'}</span>
                  <span className="progress-date">{new Date(p.createdAt ?? p.time).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
                  {p.text}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {showDateModal && (
        <CompleteDateModal count={selectedPIds.size}
          onConfirm={(dateString) => { selectedPIds.forEach(pid => onUpdateProgressCompletedAt(todoId, pid, dateString)); exitManage(); }}
          onCancel={() => setShowDateModal(false)} />
      )}

      {editing && (
        <div className="modal-full-overlay" onClick={() => setEditing(null)}>
          <div className="modal-full-sheet" onClick={e => e.stopPropagation()}>
            <div className="modal-full-header">
              <span className="modal-full-title">编辑进度</span>
              <button className="modal-full-close" onClick={() => setEditing(null)}>&times;</button>
            </div>
            <div className="modal-full-body">
              <textarea className="modal-edit-textarea" value={editing.text} onChange={e => setEditing(prev => ({ ...prev, text: e.target.value }))} autoFocus />
            </div>
            <div className="modal-full-footer">
              <button className="btn-cancel" onClick={() => setEditing(null)}>取消</button>
              <button className="btn-save" onClick={handleSaveEdit}>保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const DISABLED_STYLE = (selectedCount) => ({
  opacity: selectedCount === 0 ? 0.4 : 1,
  fontSize: 11,
});

function ProgressManageBar({ selectedCount, confirmDelete, onComplete, onCancelItems, onDelete, onSetDate, onExit, onCancelConfirm, hasSelection }) {
  if (confirmDelete) {
    return (
      <div className="progress-manage-bar">
        <span style={{ color: 'var(--danger)', fontWeight: 500, fontSize: 12 }}>确认删除 {selectedCount} 条进度？</span>
        <button className="btn-mini btn-mini-save" onClick={onDelete} style={{ background: 'var(--danger)', fontSize: 11 }}>确认删除</button>
        <button className="btn-mini btn-mini-cancel" onClick={onCancelConfirm}>取消</button>
      </div>
    );
  }

  return (
    <div className="progress-manage-bar">
      <button className="btn-mini btn-mini-save" onClick={onComplete} disabled={!hasSelection}
        style={{ ...DISABLED_STYLE(selectedCount), background: 'var(--success)' }}>完成 ({selectedCount})</button>
      <button className="btn-mini btn-mini-save" onClick={onCancelItems} disabled={!hasSelection}
        style={{ ...DISABLED_STYLE(selectedCount), background: 'var(--text-secondary)' }}>作废 ({selectedCount})</button>
      <button className="btn-mini btn-mini-save" onClick={onDelete} disabled={!hasSelection}
        style={{ ...DISABLED_STYLE(selectedCount), background: 'var(--danger)' }}>删除 ({selectedCount})</button>
      <button className="btn-mini btn-mini-save" onClick={onSetDate} disabled={!hasSelection}
        style={{ ...DISABLED_STYLE(selectedCount), background: 'var(--accent)', padding: '4px 6px' }}>改时 ({selectedCount})</button>
      <button className="btn-mini btn-mini-cancel" onClick={onExit}>取消</button>
    </div>
  );
}

function ProgressDefaultBar({ showInput, progressText, allCount, onShowInput, onTextChange, onKeyDown, onSubmit, onCancelInput, onManage }) {
  if (showInput) {
    return (
      <>
        <input type="text" placeholder="输入工作进度..." value={progressText}
          onChange={e => onTextChange(e.target.value)} onKeyDown={onKeyDown} autoFocus />
        <button className="btn-mini btn-mini-save" onClick={onSubmit}>保存</button>
        <button className="btn-mini btn-mini-cancel" onClick={onCancelInput}>&times;</button>
      </>
    );
  }

  return (
    <>
      <button className="btn-mini btn-add-progress" onClick={onShowInput}>+ 添加进度</button>
      {allCount > 0 && (
        <button className="btn-mini btn-add-progress" style={{ marginLeft: 'auto' }} onClick={onManage}>管理进度</button>
      )}
    </>
  );
}
