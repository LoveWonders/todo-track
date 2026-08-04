import { useState, useEffect } from 'react';
import { useSettings } from '../hooks/useSettings';
import TagManager from './TagManager';

const DEFAULT_TAG_NAMES = ['长期', '个人', '总结'];

export default function SettingsModal({ onClose, todos, onRenameTag, onDeleteTag, onMergeTag }) {
  const { settings, updateSetting } = useSettings();
  const [minute, setMinute] = useState(String(settings.defaultDueMinute));
  const [presetTags, setPresetTags] = useState(Array.isArray(settings.presetTags) ? settings.presetTags : DEFAULT_TAG_NAMES);
  const [newTag, setNewTag] = useState('');
  const [compactDraft, setCompactDraft] = useState(!!settings.compactMode);
  const [showTagManager, setShowTagManager] = useState(false);

  useEffect(() => {
    if (Array.isArray(settings.presetTags)) setPresetTags(settings.presetTags);
  }, [settings.presetTags]);

  const handleSave = () => {
    const num = parseInt(minute, 10);
    if (isNaN(num) || num < 0 || num > 59) return;
    updateSetting('defaultDueMinute', num);
    updateSetting('presetTags', presetTags.filter(t => t.trim()));
    updateSetting('compactMode', compactDraft);
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
    <div className="modal-full-overlay" onClick={onClose}>
      <div className="modal-full-sheet settings-full-sheet" onClick={e => e.stopPropagation()}>
        <div className="modal-full-header">
          <span className="modal-full-title">设置</span>
          <button className="modal-full-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-full-body settings-scroll">
          <div className="settings-section-title">内容管理</div>
          <div className="settings-group">
            <div className="settings-field">
              <label className="settings-label">标签管理</label>
              <p className="settings-desc">编辑标签名称、颜色，合并重复标签</p>
              <button className="settings-link-row" onClick={() => setShowTagManager(true)}>
                <span>管理标签</span>
                <span className="settings-link-arrow">&rsaquo;</span>
              </button>
            </div>

            <div className="settings-field">
              <label className="settings-label">快捷标签预设</label>
              <p className="settings-desc">在 Bottom Sheet 中显示的快捷标签，点击即可选择/取消。</p>
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
              />
            </div>
          </div>

          <div className="settings-section-title">个性化外观</div>
          <div className="settings-group">
            <div className="settings-row">
              <span className="settings-row-label">界面紧凑度</span>
              <div className="settings-segmented">
                <button
                  className={`settings-seg-item ${!compactDraft ? 'active' : ''}`}
                  onClick={() => setCompactDraft(false)}
                >
                  标准
                </button>
                <button
                  className={`settings-seg-item ${compactDraft ? 'active' : ''}`}
                  onClick={() => setCompactDraft(true)}
                >
                  紧凑
                </button>
              </div>
            </div>
            <p className="settings-desc">紧凑模式缩小待办条目间距与字号，单屏可容纳更多任务。</p>
          </div>

          <div className="settings-section-title">提醒与通知</div>
          <div className="settings-group">
            <div className="settings-row settings-row-disabled">
              <span className="settings-row-label">任务到期提醒</span>
              <span className="settings-row-soon">即将推出</span>
            </div>
            <div className="settings-row settings-row-disabled">
              <span className="settings-row-label">每日晨报推送</span>
              <span className="settings-row-soon">即将推出</span>
            </div>
          </div>
        </div>

        <div className="modal-full-footer">
          <button className="btn-mini btn-mini-cancel" onClick={onClose}>取消</button>
          <button className="btn-mini btn-mini-save" onClick={handleSave}>保存</button>
        </div>

        {showTagManager && (
          <TagManager
            todos={todos}
            onClose={() => setShowTagManager(false)}
            onRenameTag={onRenameTag}
            onDeleteTag={onDeleteTag}
            onMergeTag={onMergeTag}
          />
        )}
      </div>
    </div>
  );
}
