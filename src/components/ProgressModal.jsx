import ModalShell from './ModalShell';
import { formatCompactDateTime } from '../utils/dateParser';

export default function ProgressModal({ modal, onChange, onSave, onCancel, onSetReminder }) {
  const isAdd = modal.mode === 'add';
  return (
    <ModalShell
      title={isAdd ? '添加进度' : '编辑进度'}
      overlayClassName="nested"
      onClose={onCancel}
      footer={
        <>
          <button className="btn-secondary" onClick={onCancel}>取消</button>
          <button className="btn-primary" onClick={onSave} disabled={!modal.text.trim()}>保存</button>
        </>
      }
    >
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
          {modal.reminderTime ? `提醒 ${formatCompactDateTime(modal.reminderTime)}` : '设置提醒'}
        </button>
        {modal.reminderTime && (
          <button className="progress-modal-reminder-clear" onClick={() => onChange({ reminderTime: null })}>清除</button>
        )}
      </div>
    </ModalShell>
  );
}
