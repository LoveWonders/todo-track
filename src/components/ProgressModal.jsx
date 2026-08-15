function formatDateTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString('zh-CN', { month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

export default function ProgressModal({ modal, onChange, onSave, onCancel, onSetReminder }) {
  const isAdd = modal.mode === 'add';
  return (
    <div className="modal-full-overlay" onClick={onCancel}>
      <div className="modal-full-sheet progress-modal-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-full-header">
          <span className="modal-full-title">{isAdd ? '添加进度' : '编辑进度'}</span>
          <button className="modal-full-close" onClick={onCancel}>&times;</button>
        </div>
        <div className="modal-full-body">
          <textarea
            className="modal-edit-textarea"
            value={modal.text}
            onChange={e => onChange({ text: e.target.value })}
            placeholder="输入进度内容..."
            autoFocus
          />
          <label className="temp-edit-option">
            <input
              type="checkbox"
              checked={modal.temporary === true}
              onChange={e => onChange({ temporary: e.target.checked })}
            />
            临时子项（完成后不带到下一期）
          </label>
          <div className="progress-modal-row">
            <button
              className={`progress-modal-urgent-btn ${modal.urgent ? 'active' : ''}`}
              onClick={() => onChange({ urgent: !modal.urgent })}
            >
              急
            </button>
            <span className="progress-modal-hint">{modal.urgent ? '已标记紧急：卡片红色高亮，父待办显示「急」角标' : '标记为紧急'}</span>
          </div>
          <div className="progress-modal-row">
            <button className="progress-modal-reminder-btn" onClick={onSetReminder}>
              {modal.reminderTime ? `提醒 ${formatDateTime(modal.reminderTime)}` : '设置提醒'}
            </button>
            {modal.reminderTime && (
              <button className="progress-modal-reminder-clear" onClick={() => onChange({ reminderTime: null })}>清除</button>
            )}
          </div>
        </div>
        <div className="modal-full-footer">
          <button className="btn-cancel" onClick={onCancel}>取消</button>
          <button className="btn-save" onClick={onSave} disabled={!modal.text.trim()}>保存</button>
        </div>
      </div>
    </div>
  );
}
