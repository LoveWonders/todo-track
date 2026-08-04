import { useState, useRef, useEffect } from 'react';
import { exportTodos, exportTodosNative, shareExportedFile, parseImportFile, findConflicts } from '../utils/exportImport';
import { getIsNative, clearAllData } from '../utils/storage';
import LogViewer from './LogViewer';

export default function DataMenu({ todos, onImport, devMode, onToggleDev, onOpenSettings }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [conflictModal, setConflictModal] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [toast, setToast] = useState(null);
  const [logModal, setLogModal] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [devConfirm, setDevConfirm] = useState(false);
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
        setToast({ type: 'success', filename: result.filename, path: result.path, uri: result.uri });
      } catch (err) {
        setToast({ type: 'error', message: '导出失败：' + err.message });
      }
    } else {
      exportTodos(todos);
    }
  };

  const handleShare = async () => {
    if (!toast || !toast.uri) return;
    try {
      await shareExportedFile(toast.uri);
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
    setLogModal(true);
  };

  const handleClearData = () => {
    setMenuOpen(false);
    setClearConfirm(true);
  };

  const confirmClearData = async () => {
    await clearAllData();
    setClearConfirm(false);
    window.location.reload();
  };

  const handleDevToggle = () => {
    setMenuOpen(false);
    setDevConfirm(true);
  };

  const confirmDevToggle = () => {
    onToggleDev(!devMode);
    setDevConfirm(false);
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
            <button className="data-menu-item" onClick={() => { setMenuOpen(false); onOpenSettings(); }}>
              设置
            </button>
            {!import.meta.env.PROD && (
              <button className="data-menu-item" onClick={handleDevToggle}>
                {devMode ? '关闭开发者模式' : '开发者测试模式'}
              </button>
            )}
            <button className="data-menu-item data-menu-item-danger" onClick={handleClearData}>
              清除本地缓存并重置
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

      {devConfirm && (
        <div className="modal-overlay" onClick={() => setDevConfirm(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">开发者测试模式</span>
            </div>
            <div className="modal-body">
              <p className="modal-desc">
                {devMode
                  ? '确认关闭开发者测试面板？关闭后性能测试悬浮窗将隐藏。'
                  : '确认开启开发者测试面板？此模式仅供开发调试使用。'}
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-mini btn-mini-cancel" onClick={() => setDevConfirm(false)}>取消</button>
              <button className="btn-mini btn-mini-save" onClick={confirmDevToggle}>确认</button>
            </div>
          </div>
        </div>
      )}

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

      {clearConfirm && (
        <div className="modal-overlay" onClick={() => setClearConfirm(false)}>
          <div className="modal-card" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">危险操作</span>
            </div>
            <div className="modal-body">
              <p className="modal-desc">
                此操作将清空所有待办数据且无法恢复，是否继续？
              </p>
            </div>
            <div className="modal-footer">
              <button className="btn-mini btn-mini-cancel" onClick={() => setClearConfirm(false)}>取消</button>
              <button className="btn-mini btn-mini-save" onClick={confirmClearData} style={{ background: 'var(--danger)' }}>确认清除</button>
            </div>
          </div>
        </div>
      )}

      <LogViewer open={logModal} onClose={() => setLogModal(false)} onToast={setToast} />

      {toast && (
        <div className="toast-container" onClick={() => setToast(null)}>
          <div className={`toast-card ${toast.type}`} onClick={e => e.stopPropagation()}>
            {toast.type === 'success' ? (
              <>
                <span className="toast-icon">&#x2705;</span>
                <div className="toast-msg">
                  {toast.uri ? (
                    <>
                      <span className="toast-msg-title">备份已保存</span>
                      {toast.path && <span className="toast-msg-path">{toast.path}</span>}
                    </>
                  ) : toast.path ? (
                    <>
                      <span className="toast-msg-title">日志已导出</span>
                      <span className="toast-msg-path">{toast.path}</span>
                    </>
                  ) : (
                    <span className="toast-msg-title">日志已复制到剪贴板</span>
                  )}
                </div>
                {toast.uri && (
                  <button className="toast-btn" onClick={handleShare}>分享文件</button>
                )}
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
