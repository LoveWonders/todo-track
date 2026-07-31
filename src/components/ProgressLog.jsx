import { useState, useMemo, useCallback } from 'react';
import { useTodoActions, useTodoView } from '../hooks/TodoContext';
import CompleteDateModal from './CompleteDateModal';
import ProgressManageBar from './ProgressManageBar';
import ProgressDefaultBar from './ProgressDefaultBar';

export default function ProgressLog({ progress, todoId, collapsed }) {
  const { toggleProgressStatus, deleteProgress, addProgress, updateProgress, updateProgressCompletedAt } = useTodoActions();
  const { batchMode } = useTodoView();
  const [progressText, setProgressText] = useState('');
  const [showInput, setShowInput] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [manageMode, setManageMode] = useState(false);
  const [selectedPIds, setSelectedPIds] = useState(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const items = Array.isArray(progress) ? progress : [];
  const progressCount = items.length;

  // 折叠时不渲染
  if (collapsed) {
    return null;
  }

  // 无进度时显示"添加进度"按钮
  if (progressCount === 0) {
    return (
      <div className="progress-section">
        {!inBatch && (
          <div className="todo-progress-bar">
            <div className="progress-empty-prompt">
              <span className="progress-empty-text">暂无进度记录</span>
              {!showInput ? (
                <button
                  className="btn-add-progress"
                  onClick={() => setShowInput(true)}
                  disabled={!!inBatch}
                >
                  + 添加进度
                </button>
              ) : (
                <div className="progress-input-row">
                  <input
                    type="text"
                    className="progress-input-field"
                    value={progressText}
                    onChange={(e) => setProgressText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="输入进度内容..."
                    autoFocus
                  />
                  <button
                    className="btn-progress-submit"
                    onClick={handleSubmit}
                    disabled={!progressText.trim()}
                  >
                    确定
                  </button>
                  <button
                    className="btn-progress-cancel"
                    onClick={() => { setShowInput(false); setProgressText(''); }}
                  >
                    取消
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  }

  const inBatch = batchMode;

  const { activeProgress, archivedProgress } = useMemo(() => {
    const active = [];
    const archived = [];
    for (const p of items) {
      (p.status === 'active' ? active : archived).push(p);
    }
    return { activeProgress: active, archivedProgress: archived };
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

  const handleSubmit = useCallback(() => {
    const trimmed = progressText.trim();
    if (!trimmed) return;
    addProgress(todoId, trimmed);
    setProgressText('');
    setShowInput(false);
  }, [progressText, todoId, addProgress]);

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
      updateProgress(todoId, editing.progress.id, trimmed);
    }
    setEditing(null);
  }, [editing, todoId, updateProgress]);

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
                      <button className="p-action undo" onClick={(e) => { e.stopPropagation(); toggleProgressStatus(todoId, p.id, p.status); }} title="恢复">&#x21A9;</button>
                    </span>
                  )}
                  {manageMode && (
                    <span className={`progress-check-circle ${selectedPIds.has(p.id) ? 'checked' : ''}`}>
                      {selectedPIds.has(p.id) ? '\u2713' : ''}
                    </span>
                  )}
                  <span className="progress-status-tag">{p.status === 'completed' ? '已完成' : '已作废'}</span>
                  <span className="progress-date">{new Date(p.createdAt ?? p.time).toLocaleDateString('zh-CN', { month: 'numeric', day: 'numeric' })}</span>
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
