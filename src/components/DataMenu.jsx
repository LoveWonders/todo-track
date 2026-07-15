import { useState, useRef, useEffect } from 'react';
import { exportTodos, exportTodosNative, shareExportedFile, parseImportFile, findConflicts } from '../utils/exportImport';
import { getIsNative } from '../utils/storage';

export default function DataMenu({ todos, onImport }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [conflictModal, setConflictModal] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [toast, setToast] = useState(null);
  const menuRef = useRef(null);
  const fileRef = useRef(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleExport = async () => {
    setMenuOpen(false);
    if (getIsNative()) {
      try {
        const filename = await exportTodosNative(todos);
        setToast({ type: 'success', filename });
      } catch (err) {
        setToast({ type: 'error', message: '导出失败：' + err.message });
      }
    } else {
      exportTodos(todos);
    }
  };

  const handleShare = async () => {
    if (!toast || !toast.filename) return;
    try {
      await shareExportedFile(toast.filename);
    } catch {
      // user cancelled
    }
    setToast(null);
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setMenuOpen(false);
    try {
      const importData = await parseImportFile(file);
      if (importData.length === 0) {
        alert('文件中没有待办数据');
        return;
      }
      const conflicts = findConflicts(todos, importData);
      if (conflicts.length > 0) {
        setPendingImport(importData);
        setConflictModal(conflicts);
      } else {
        onImport(importData, 'skip');
      }
    } catch (err) {
      alert(err.message);
    }
    e.target.value = '';
  };

  const handleConflictResolve = (strategy) => {
    if (pendingImport) {
      onImport(pendingImport, strategy);
    }
    setConflictModal(null);
    setPendingImport(null);
  };

  return (
    <>
      <div className="data-menu" ref={menuRef}>
        <button
          className="data-menu-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          title="数据管理"
        >
          &#x22EF;
        </button>

        {menuOpen && (
          <div className="data-menu-dropdown">
            <button className="data-menu-item" onClick={handleExport}>
              导出数据
            </button>
            <button className="data-menu-item" onClick={() => fileRef.current?.click()}>
              导入数据
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".json"
              style={{ display: 'none' }}
              onChange={handleFileSelect}
            />
          </div>
        )}
      </div>

      {conflictModal && (
        <div className="modal-overlay" onClick={() => setConflictModal(null)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">ID 冲突</span>
            </div>
            <div className="modal-body">
              <p className="modal-desc">
                有 {conflictModal.length} 个待办的 ID 与现有数据冲突：
              </p>
              <div className="conflict-list">
                {conflictModal.map(t => (
                  <span key={t.id} className="conflict-item">{t.title}</span>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-mini btn-mini-cancel" onClick={() => setConflictModal(null)}>取消</button>
              <button className="btn-mini btn-mini-save" onClick={() => handleConflictResolve('skip')}>跳过重复</button>
              <button className="btn-mini btn-mini-save" onClick={() => handleConflictResolve('overwrite')} style={{ background: 'var(--warn)' }}>覆盖</button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="toast-container" onClick={() => setToast(null)}>
          <div className={`toast-card ${toast.type}`} onClick={e => e.stopPropagation()}>
            {toast.type === 'success' ? (
              <>
                <span className="toast-icon">&#x2705;</span>
                <span className="toast-msg">备份已保存至应用文档目录</span>
                <button className="toast-btn" onClick={handleShare}>分享文件</button>
                <button className="toast-close" onClick={() => setToast(null)}>&times;</button>
              </>
            ) : (
              <>
                <span className="toast-icon">&#x274C;</span>
                <span className="toast-msg">{toast.message}</span>
                <button className="toast-close" onClick={() => setToast(null)}>&times;</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
