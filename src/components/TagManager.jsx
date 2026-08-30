import { useState, useMemo } from 'react';
import { TAG_COLOR_PALETTE, getTagColor, findDuplicateGroups, isSafeTagName } from '../utils/tagMeta';
import { useTagMeta } from '../hooks/useTagMeta';
import ModalShell from './ModalShell';

export default function TagManager({ todos, onClose, onRenameTag, onDeleteTag, onMergeTag }) {
  const { tagMeta, setTagColor, renameTagMeta, removeTagMeta } = useTagMeta();
  const [editingTag, setEditingTag] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [renameError, setRenameError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [showDuplicates, setShowDuplicates] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createColor, setCreateColor] = useState(TAG_COLOR_PALETTE[0]);
  const [createError, setCreateError] = useState('');

  const allTags = useMemo(() => {
    const set = new Set();
    todos.forEach(t => (t.tags || []).forEach(tg => set.add(tg)));
    return [...set];
  }, [todos]);

  const countByTag = useMemo(() => {
    const m = {};
    todos.forEach(t => (t.tags || []).forEach(tg => { m[tg] = (m[tg] || 0) + 1; }));
    return m;
  }, [todos]);

  const definedTags = useMemo(() => {
    const set = new Set([...allTags, ...Object.keys(tagMeta)]);
    return [...set];
  }, [allTags, tagMeta]);

  const sortedTags = useMemo(() => (
    [...definedTags].sort((a, b) => (countByTag[b] || 0) - (countByTag[a] || 0) || a.localeCompare(b))
  ), [definedTags, countByTag]);

  const duplicateGroups = useMemo(() => findDuplicateGroups(allTags), [allTags]);

  const openEdit = (tag) => {
    setEditingTag(tag);
    setEditingName(tag);
    setRenameError('');
    setDeleteConfirm(null);
  };

  const closeEdit = () => {
    setEditingTag(null);
    setEditingName('');
    setRenameError('');
    setDeleteConfirm(null);
  };

  const handleSaveRename = () => {
    const newName = editingName.trim();
    if (!newName || newName === editingTag) { closeEdit(); return; }
    if (!isSafeTagName(newName)) {
      setRenameError('该标签名不可用');
      return;
    }
    if (definedTags.some(t => t !== editingTag && t === newName)) {
      setRenameError('该标签已存在');
      return;
    }
    renameTagMeta(editingTag, newName);
    onRenameTag(editingTag, newName);
    closeEdit();
  };

  const handleDelete = (removeFromTodos) => {
    if (!deleteConfirm) return;
    removeTagMeta(deleteConfirm);
    onDeleteTag(deleteConfirm, removeFromTodos);
    setDeleteConfirm(null);
    closeEdit();
  };

  const handleMerge = (canonical, duplicate) => {
    if (tagMeta[duplicate] && !tagMeta[canonical]) {
      renameTagMeta(duplicate, canonical);
    } else {
      removeTagMeta(duplicate);
    }
    onMergeTag(canonical, duplicate);
  };

  const startCreate = () => {
    setCreating(true);
    setCreateName('');
    setCreateColor(TAG_COLOR_PALETTE[0]);
    setCreateError('');
  };

  const handleSaveCreate = () => {
    const name = createName.trim();
    if (!name) { setCreateError('请输入标签名称'); return; }
    if (!isSafeTagName(name)) { setCreateError('该标签名不可用'); return; }
    if (definedTags.includes(name)) { setCreateError('该标签已存在'); return; }
    setTagColor(name, createColor);
    setCreating(false);
    openEdit(name);
  };

  return (
    <ModalShell
      title="标签管理"
      onClose={onClose}
      bodyClassName="tag-manager-body"
    >
          {duplicateGroups.length > 0 && (
            <div className="tag-merge-banner">
              <div className="tag-merge-banner-title">
                发现 {duplicateGroups.length} 组相似标签
                <button className="btn-mini btn-mini-save" onClick={() => setShowDuplicates(v => !v)}>
                  {showDuplicates ? '收起' : '查看'}
                </button>
              </div>
              {showDuplicates && (
                <div className="tag-merge-groups">
                  {duplicateGroups.map((g, i) => (
                    <div key={i} className="tag-merge-group">
                      <span className="tag-merge-labels">
                        {g.duplicates.map(d => <span key={d} className="tag-merge-chip">#{d}</span>)}
                        <span className="tag-merge-arrow">→</span>
                        <span className="tag-merge-chip">#{g.canonical}</span>
                      </span>
                      <button
                        className="btn-mini btn-mini-save"
                        onClick={() => handleMerge(g.canonical, g.duplicates[0])}
                      >
                        合并
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="tag-manager-toolbar">
            <button className="tag-manager-add-btn" onClick={startCreate}>+ 新增标签</button>
          </div>

          {creating && (
            <div className="tag-manager-create">
              <div className="tag-manager-edit-field">
                <input
                  className="settings-input"
                  value={createName}
                  onChange={e => { setCreateName(e.target.value); setCreateError(''); }}
                  onKeyDown={e => { if (e.key === 'Enter') handleSaveCreate(); }}
                  placeholder="新标签名称"
                  autoFocus
                />
                {createError && <span className="tag-rename-error">{createError}</span>}
              </div>
              <div className="tag-color-palette">
                {TAG_COLOR_PALETTE.map(c => (
                  <button
                    key={c.name}
                    title={c.name}
                    className={`tag-color-swatch ${createColor.bg === c.bg ? 'active' : ''}`}
                    style={{ background: c.bg, borderColor: c.fg }}
                    onClick={() => setCreateColor(c)}
                  >
                    <span style={{ color: c.fg }}>#</span>
                  </button>
                ))}
              </div>
              <div className="tag-manager-edit-actions">
                <button className="btn-mini btn-mini-cancel" onClick={() => setCreating(false)}>取消</button>
                <button className="btn-mini btn-mini-save" onClick={handleSaveCreate}>保存</button>
              </div>
            </div>
          )}

          {sortedTags.length === 0 ? (
            <div className="tag-manager-empty">暂无标签</div>
          ) : (
            <div className="tag-manager-list">
              {sortedTags.map(tag => {
                const color = getTagColor(tag, tagMeta);
                const isEditing = editingTag === tag;
                return (
                  <div key={tag} className={`tag-manager-item ${isEditing ? 'editing' : ''}`}>
                    <div className="tag-manager-row" onClick={() => openEdit(tag)}>
                      <span className="tag-manager-chip" style={{ background: color.bg, color: color.fg }}>
                        #{tag}
                      </span>
                      <span className="tag-manager-name">{tag}</span>
                      <span className="tag-manager-count">{countByTag[tag] || 0} 项</span>
                    </div>

                    {isEditing && (
                      <div className="tag-manager-edit">
                        <div className="tag-manager-edit-field">
                          <input
                            className="settings-input"
                            value={editingName}
                            onChange={e => { setEditingName(e.target.value); setRenameError(''); }}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveRename(); }}
                            placeholder="标签名称"
                          />
                          {renameError && <span className="tag-rename-error">{renameError}</span>}
                        </div>

                        <div className="tag-color-palette">
                          {TAG_COLOR_PALETTE.map(c => {
                            const active = tagMeta[tag] && tagMeta[tag].bg === c.bg;
                            return (
                              <button
                                key={c.name}
                                title={c.name}
                                className={`tag-color-swatch ${active ? 'active' : ''}`}
                                style={{ background: c.bg, borderColor: c.fg }}
                                onClick={() => setTagColor(tag, { bg: c.bg, fg: c.fg })}
                              >
                                <span style={{ color: c.fg }}>#</span>
                              </button>
                            );
                          })}
                        </div>

                        {deleteConfirm === tag ? (
                          <div className="tag-delete-confirm">
                            <span className="tag-delete-confirm-text">同时从任务中移除该标签？</span>
                            <div className="tag-delete-confirm-actions">
                              <button className="btn-mini btn-mini-save" onClick={() => handleDelete(true)}>移除并删除</button>
                              <button className="btn-mini btn-mini-cancel" onClick={() => handleDelete(false)}>仅删除</button>
                              <button className="btn-mini btn-mini-cancel" onClick={() => setDeleteConfirm(null)}>取消</button>
                            </div>
                          </div>
                        ) : (
                          <div className="tag-manager-edit-actions">
                            <button className="btn-mini btn-mini-cancel" style={{ color: 'var(--danger)' }} onClick={() => setDeleteConfirm(tag)}>
                              删除
                            </button>
                            <button className="btn-mini btn-mini-cancel" onClick={closeEdit}>取消</button>
                            <button className="btn-mini btn-mini-save" onClick={handleSaveRename}>保存</button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
          </div>
        )}
    </ModalShell>
  );
}
