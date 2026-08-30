import { useState, useRef, useEffect } from 'react';
import { exportTodos, exportTodosNative, shareExportedFile, parseImportFile, findConflicts } from '../utils/exportImport';
import { getIsNative } from '../utils/storage';
import LogViewer from './LogViewer';
import ConfirmDialog from './ConfirmDialog';

export default function DataMenu({ todos, onImport, devMode, onToggleDev, onOpenSettings }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [conflictModal, setConflictModal] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [toast, setToast] = useState(null);
  const [logModal, setLogModal] = useState(false);
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

      <ConfirmDialog
        open={devConfirm}
        title="开发者测试模式"
        description={devMode
          ? '确认关闭开发者测试面板？关闭后性能测试悬浮窗将隐藏。'
          : '确认开启开发者测试面板？此模式仅供开发调试使用。'}
        confirmText="确认"
        onConfirm={confirmDevToggle}
        onCancel={() => setDevConfirm(false)}
      />

      <ConfirmDialog
        open={!!conflictModal}
        title="ID 冲突"
        description={conflictModal ? `有 ${conflictModal.length} 个待办的 ID 与现有数据冲突：` : ''}
        confirmText="跳过重复"
        onConfirm={() => handleConflictResolve('skip')}
        onCancel={() => setConflictModal(null)}
      >
        {conflictModal && (
          <div className="conflict-list">
            {conflictModal.map(t => (
              <span key={t.id} className="conflict-item">{t.title}</span>
            ))}
          </div>
        )}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
          <button className="btn-danger" onClick={() => handleConflictResolve('overwrite')}>覆盖</button>
        </div>
      </ConfirmDialog>

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
