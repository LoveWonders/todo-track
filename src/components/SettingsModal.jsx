import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';

const DEFAULT_TAG_NAMES = ['长期', '个人', '总结'];

export default function SettingsModal({ onClose }) {
  const { settings, updateSetting } = useSettings();
  const [minute, setMinute] = useState(String(settings.defaultDueMinute));
  const [presetTags, setPresetTags] = useState(settings.presetTags || DEFAULT_TAG_NAMES);
  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (settings.presetTags) setPresetTags(settings.presetTags);
  }, [settings.presetTags]);

  const handleSave = () => {
    const num = parseInt(minute, 10);
    if (isNaN(num) || num < 0 || num > 59) return;
    updateSetting('defaultDueMinute', num);
    updateSetting('presetTags', presetTags.filter(t => t.trim()));
    onClose();
  };

  const handleAddTag = () => {
    const trimmed = newTag.trim();
    if (trimmed && !presetTags.includes(trimmed)) {
      setPresetTags([...presetTags, trimmed]);
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag) => {
    setPresetTags(presetTags.filter(t => t !== tag));
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      if (e.target.tagName === 'INPUT' && e.target.placeholder === '添加标签...') {
        handleAddTag();
      } else {
        handleSave();
      }
    } else if (e.key === 'Escape') onClose();
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

          <div className="settings-field">
            <label className="settings-label">快捷标签预设</label>
            <p className="settings-desc">
              在 Bottom Sheet 中显示的快捷标签，点击即可选择/取消。
            </p>
            <div className="preset-tags-edit">
              {presetTags.map(tag => (
                <span key={tag} className="preset-tag-edit">
                  #{tag}
                  <button className="preset-tag-remove" onClick={() => handleRemoveTag(tag)}>&times;</button>
                </span>
              ))}
              <input
                type="text"
                className="settings-input settings-input-tag"
                placeholder="添加标签..."
                value={newTag}
                onChange={e => setNewTag(e.target.value)}
                onKeyDown={handleKeyDown}
              />
              <button className="btn-add-tag" onClick={handleAddTag}>+</button>
            </div>
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
