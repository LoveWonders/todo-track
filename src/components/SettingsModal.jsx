import { useState } from 'react';
import { useSettings } from '../hooks/useSettings';

export default function SettingsModal({ onClose }) {
  const { settings, updateSetting } = useSettings();
  const [minute, setMinute] = useState(String(settings.defaultDueMinute));

  const handleSave = () => {
    const num = parseInt(minute, 10);
    if (isNaN(num) || num < 0 || num > 59) return;
    updateSetting('defaultDueMinute', num);
    onClose();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    else if (e.key === 'Escape') onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">设置</span>
        </div>
        <div className="modal-body">
          <div className="settings-field">
            <label className="settings-label">默认分钟设置</label>
            <p className="settings-desc">
              未手动设置截止时间时，默认截止时间为当天 21:{settings.defaultDueMinute.toString().padStart(2, '0')}。
              修改此值可调整默认分钟数（0-59）。
            </p>
            <input
              type="number"
              className="settings-input"
              min="0"
              max="59"
              value={minute}
              onChange={e => setMinute(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn-mini btn-mini-cancel" onClick={onClose}>取消</button>
          <button className="btn-mini btn-mini-save" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
}
