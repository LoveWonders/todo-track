import { useState, useEffect, useRef } from 'react';
import { useSettings } from '../hooks/useSettings';
import TagManager from './TagManager';
import pkg from '../../package.json';
import { clearAllData } from '../utils/storage';
import { checkDataIntegrity } from '../utils/dataIntegrity';

const DEFAULT_TAG_NAMES = ['长期', '个人', '总结'];
const APP_VERSION = pkg.version;

export default function SettingsModal({ onClose, todos, onRenameTag, onDeleteTag, onMergeTag }) {
  const { settings, updateSetting } = useSettings();
  const [presetTags, setPresetTags] = useState(Array.isArray(settings.presetTags) ? settings.presetTags : DEFAULT_TAG_NAMES);
  const [newTag, setNewTag] = useState('');
  const [compactDraft, setCompactDraft] = useState(!!settings.compactMode);
  const [autoArchiveDraft, setAutoArchiveDraft] = useState(settings.autoArchive !== false);
  const [autoClearLogsDraft, setAutoClearLogsDraft] = useState(settings.autoClearLogs !== false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [copied, setCopied] = useState(false);
  const [integrityReport, setIntegrityReport] = useState(null);
  const [factoryResetConfirm, setFactoryResetConfirm] = useState(false);
  const copyTimerRef = useRef(null);

  useEffect(() => {
    if (Array.isArray(settings.presetTags)) setPresetTags(settings.presetTags);
  }, [settings.presetTags]);

  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

  const copyVersion = async () => {
    const text = `v${APP_VERSION}`;
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.cssText = 'position:fixed;top:-9999px;opacity:0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
    }
    setCopied(true);
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = () => {
    updateSetting('presetTags', presetTags.filter(t => t.trim()));
    updateSetting('compactMode', compactDraft);
    updateSetting('autoArchive', autoArchiveDraft);
    updateSetting('autoClearLogs', autoClearLogsDraft);
    onClose();
  };

  const runIntegrityCheck = () => {
    setIntegrityReport(checkDataIntegrity());
  };

  const confirmFactoryReset = async () => {
    setFactoryResetConfirm(false);
    await clearAllData();
    window.location.reload();
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
            <div className="settings-row">
              <span className="settings-row-label">重复任务提醒</span>
              <span className="settings-row-status">已上线</span>
            </div>
            <p className="settings-desc">为重复任务设置提醒时间后，Android 端到期自动推送本地通知；网页端打开应用时到点补发浏览器通知。</p>
            <div className="settings-row settings-row-disabled">
              <span className="settings-row-label">每日晨报推送</span>
              <span className="settings-row-soon">规划中</span>
            </div>
          </div>

          <div className="settings-section-title">数据安全</div>
          <div className="settings-group">
            <div className="settings-row">
              <span className="settings-row-label">自动归档</span>
              <div className="settings-segmented">
                <button
                  className={`settings-seg-item ${autoArchiveDraft ? 'active' : ''}`}
                  onClick={() => setAutoArchiveDraft(true)}
                >
                  开启
                </button>
                <button
                  className={`settings-seg-item ${!autoArchiveDraft ? 'active' : ''}`}
                  onClick={() => setAutoArchiveDraft(false)}
                >
                  关闭
                </button>
              </div>
            </div>
            <p className="settings-desc">开启后，完成超过 30 天的待办在下次启动时自动移入归档。关闭则全部保留。</p>

            <div className="settings-row">
              <span className="settings-row-label">日志自动清理</span>
              <div className="settings-segmented">
                <button
                  className={`settings-seg-item ${autoClearLogsDraft ? 'active' : ''}`}
                  onClick={() => setAutoClearLogsDraft(true)}
                >
                  开启
                </button>
                <button
                  className={`settings-seg-item ${!autoClearLogsDraft ? 'active' : ''}`}
                  onClick={() => setAutoClearLogsDraft(false)}
                >
                  关闭
                </button>
              </div>
            </div>
            <p className="settings-desc">开启后调试日志最多保留 200 条，自动清理最旧记录。关闭则不限制数量。</p>
          </div>

          <div className="settings-section-title">数据管理</div>
          <div className="settings-group">
            <button className="settings-link-row" onClick={runIntegrityCheck}>
              <span>检查数据完整性</span>
              <span className="settings-link-arrow">&rsaquo;</span>
            </button>
            <button
              className="settings-link-row settings-danger-row"
              onClick={() => setFactoryResetConfirm(true)}
            >
              <span>恢复出厂设置</span>
              <span className="settings-link-arrow">&rsaquo;</span>
            </button>
          </div>

          <div className="settings-section-title">关于</div>
          <div className="settings-group">
            <div className="settings-field">
              <label className="settings-label">TodoTrack</label>
              <p className="settings-desc">轻量待办管理工具，数据仅存储在本设备，不上传任何服务器。</p>
            </div>
            <button
              className={`settings-link-row settings-version-row ${copied ? 'copied' : ''}`}
              onClick={copyVersion}
            >
              <span>版本 v{APP_VERSION}</span>
              <span className={`settings-version-copy ${copied ? 'copied' : ''}`}>
                {copied ? '已复制' : '点击复制'}
              </span>
            </button>
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

        {integrityReport && (
          <div className="modal-overlay" onClick={() => setIntegrityReport(null)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <span className="modal-title">数据完整性检查</span>
              </div>
              <div className="modal-body">
                <p className="modal-desc">
                  已检查：{integrityReport.checked['待办数据'] ?? 0} 条待办、
                  {integrityReport.checked['归档数据'] ?? 0} 条归档、
                  {integrityReport.checked['设置'] ?? 0} 份设置。
                </p>
                {integrityReport.problems.length === 0 ? (
                  <p className="modal-desc">未发现异常，数据完整。</p>
                ) : (
                  <div className="integrity-list">
                    {integrityReport.problems.map((p, i) => (
                      <div key={i} className="integrity-item">
                        <span className="integrity-item-title">
                          {p.source}
                          {p.title ? `：${p.title}` : ''}
                          {p.id != null ? `（id:${p.id}）` : ''}
                        </span>
                        {p.issues.map((issue, j) => (
                          <span key={j} className="integrity-item-issue">- {issue}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn-mini btn-mini-save" onClick={() => setIntegrityReport(null)}>知道了</button>
              </div>
            </div>
          </div>
        )}

        {factoryResetConfirm && (
          <div className="modal-overlay" onClick={() => setFactoryResetConfirm(false)}>
            <div className="modal-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <span className="modal-title">恢复出厂设置</span>
              </div>
              <div className="modal-body">
                <p className="modal-desc">
                  此操作将清空全部待办、归档、标签设置与调试日志，且无法恢复。确定继续？
                </p>
              </div>
              <div className="modal-footer">
                <button className="btn-mini btn-mini-cancel" onClick={() => setFactoryResetConfirm(false)}>取消</button>
                <button className="btn-mini btn-mini-save" onClick={confirmFactoryReset} style={{ background: 'var(--danger)' }}>确认重置</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
