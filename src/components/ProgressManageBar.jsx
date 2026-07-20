const DISABLED_STYLE = (selectedCount) => ({
  opacity: selectedCount === 0 ? 0.4 : 1,
  fontSize: 11,
});

export default function ProgressManageBar({ selectedCount, confirmDelete, onComplete, onCancelItems, onDelete, onExit, onCancelConfirm, hasSelection, onSetDate }) {
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
