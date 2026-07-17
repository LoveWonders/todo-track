import { useState, useRef, useEffect } from 'react';
import { exportTodos, exportTodosNative, shareExportedFile, parseImportFile, findConflicts } from '../utils/exportImport';
import { getIsNative } from '../utils/storage';
import { getLogs, clearLogs } from '../utils/logger';

export default function DataMenu({ todos, onImport }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [conflictModal, setConflictModal] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [toast, setToast] = useState(null);
  const [logModal, setLogModal] = useState(false);
  const [logs, setLogs] = useState([]);
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
        const result = await exportTodosNative(todos);
        setToast({ type: 'success', filename: result.filename, path: result.path });
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

  const openLogs = () => {
    setMenuOpen(false);
    setLogs(getLogs());
    setLogModal(true);
  };

  const handleClearLogs = () => {
    clearLogs();
    setLogs([]);
    setLogModal(false);
  };

  const logTypeLabel = (type) => {
    switch (type) {
      case 'error': return '错误';
      case 'success': return '成功';
      case 'info': return '信息';
      default: return type;
    }
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
            <button className="data-menu-item" onClick={openLogs}>
              调试日志
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

      {logModal && (
        <div className="modal-overlay" onClick={() => setLogModal(false)}>
          <div className="modal-card log-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">调试日志</span>
              <button className="modal-close" onClick={() => setLogModal(false)}>&times;</button>
            </div>
            <div className="modal-body log-body">
              {logs.length === 0 ? (
                <div className="log-empty">暂无日志</div>
              ) : (
                logs.map(entry => (
                  <div key={entry.id} className={`log-entry log-${entry.type}`}>
                    <div className="log-head">
                      <span className={`log-badge log-badge-${entry.type}`}>{logTypeLabel(entry.type)}</span>
                      <span className="log-ts">{entry.ts}</span>
                    </div>
                    <div className="log-msg">{entry.message}</div>
                    {entry.detail && (
                      <pre className="log-detail">{JSON.stringify(entry.detail, null, 2)}</pre>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-mini btn-mini-cancel" onClick={() => setLogModal(false)}>关闭</button>
              {logs.length > 0 && (
                <button className="btn-mini btn-mini-save" style={{ background: 'var(--warn)' }} onClick={handleClearLogs}>清空日志</button>
              )}
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
                <div className="toast-msg">
                  <span className="toast-msg-title">备份已保存</span>
                  {toast.path && <span className="toast-msg-path">{toast.path}</span>}
                </div>
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
