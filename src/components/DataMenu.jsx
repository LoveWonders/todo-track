import { useState, useRef, useEffect, useCallback } from 'react';
import { exportTodos, exportTodosNative, shareExportedFile, parseImportFile, findConflicts } from '../utils/exportImport';
import { getIsNative, clearAllData } from '../utils/storage';
import { getLogs, clearLogs } from '../utils/logger';

export default function DataMenu({ todos, onImport }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [conflictModal, setConflictModal] = useState(null);
  const [pendingImport, setPendingImport] = useState(null);
  const [toast, setToast] = useState(null);
  const [logModal, setLogModal] = useState(false);
  const [clearConfirm, setClearConfirm] = useState(false);
  const [logs, setLogs] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
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
    setLogs(getLogs());
    setSelectedIds(new Set());
    setLogModal(true);
  };

  const handleClearLogs = () => {
    clearLogs();
    setLogs([]);
    setSelectedIds(new Set());
    setLogModal(false);
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

  const copyToClipboard = async (text) => {
    try {
      const { Clipboard } = await import('@capacitor/clipboard');
      await Clipboard.write({ string: text });
      return true;
    } catch {
      // not native, fall through
    }

    try {
      await navigator.permissions.query({ name: 'clipboard-write' });
    } catch {
      // permissions API not available, continue
    }

    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // clipboard API failed, try fallback
    }

    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.left = '-9999px';
    textarea.style.top = '-9999px';
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    try {
      const ok = document.execCommand('copy');
      if (!ok) throw new Error('execCommand returned false');
      return true;
    } finally {
      document.body.removeChild(textarea);
    }
  };

  const handleCopyLogs = async () => {
    if (selectedIds.size === 0) {
      setToast({ type: 'error', message: '请先选择要复制的日志' });
      return;
    }

    const text = logs
      .filter(e => selectedIds.has(e.id))
      .map(e =>
        `[${e.ts}] [${logTypeLabel(e.type)}] ${e.message}` +
        (e.detail ? '\n' + JSON.stringify(e.detail, null, 2) : '')
      ).join('\n\n---\n\n');

    try {
      const ok = await copyToClipboard(text);
      if (ok) {
        setToast({ type: 'success', path: null, uri: null });
      } else {
        setToast({ type: 'error', message: '复制失败，请手动长按选择文本复制' });
      }
    } catch {
      setToast({ type: 'error', message: '复制失败，请在浏览器设置中允许剪贴板权限' });
    }
  };

  const handleExportLogs = async () => {
    const text = logs.map(e =>
      `[${e.ts}] [${logTypeLabel(e.type)}] ${e.message}` +
      (e.detail ? '\n' + JSON.stringify(e.detail, null, 2) : '')
    ).join('\n\n---\n\n');

    const now = new Date();
    const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
    const filename = `todotrack_debug_log_${ts}.txt`;

    try {
      const { DownloadPlugin } = await import('../utils/downloadPlugin');
      await DownloadPlugin.saveToDownloads({
        filename,
        data: text,
        subFolder: 'todotrack',
        mimeType: 'text/plain',
      });
      setToast({ type: 'success', path: 'Download/todotrack/', uri: null });
    } catch (err) {
      setToast({ type: 'error', message: '日志导出失败：' + (err.message || String(err)) });
    }
  };

  const logTypeLabel = (type) => {
    switch (type) {
      case 'error': return '错误';
      case 'success': return '成功';
      case 'info': return '信息';
      default: return type;
    }
  };

  const toggleLogSelect = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(logs.map(e => e.id)));
  };

  const handleInvert = () => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      logs.forEach(e => {
        if (next.has(e.id)) next.delete(e.id);
        else next.add(e.id);
      });
      return next;
    });
  };

  const closeLogModal = () => {
    setLogModal(false);
    setSelectedIds(new Set());
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

      {logModal && (
        <div className="modal-overlay" onClick={closeLogModal}>
          <div className="modal-card log-modal" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">调试日志</span>
              <button className="modal-close" onClick={closeLogModal}>&times;</button>
            </div>
            <div className="modal-body log-body">
              {logs.length === 0 ? (
                <div className="log-empty">暂无日志</div>
              ) : (
                <>
                  <div className="log-toolbar">
                    <button className="log-toolbar-btn" onClick={handleSelectAll}>全选</button>
                    <button className="log-toolbar-btn" onClick={handleInvert}>反选</button>
                    <span className="log-toolbar-info">
                      {selectedIds.size > 0 ? `已选 ${selectedIds.size} 条` : ''}
                    </span>
                  </div>
                  {logs.map(entry => (
                    <div
                      key={entry.id}
                      className={`log-entry log-${entry.type}${selectedIds.has(entry.id) ? ' log-entry-selected' : ''}`}
                    >
                      <div className="log-entry-row">
                        <input
                          type="checkbox"
                          className="log-checkbox"
                          checked={selectedIds.has(entry.id)}
                          onChange={() => toggleLogSelect(entry.id)}
                        />
                        <div className="log-entry-body">
                          <div className="log-head">
                            <span className={`log-badge log-badge-${entry.type}`}>{logTypeLabel(entry.type)}</span>
                            <span className="log-ts">{entry.ts}</span>
                          </div>
                          <div className="log-msg">{entry.message}</div>
                          {entry.detail && (
                            <pre className="log-detail">{JSON.stringify(entry.detail, null, 2)}</pre>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-mini btn-mini-cancel" onClick={closeLogModal}>关闭</button>
              {logs.length > 0 && (
                <button className="btn-mini btn-mini-save" onClick={handleCopyLogs}>复制</button>
              )}
              {logs.length > 0 && (
                <button className="btn-mini btn-mini-save" onClick={handleExportLogs}>导出 TXT</button>
              )}
              {logs.length > 0 && (
                <button className="btn-mini btn-mini-save" style={{ background: 'var(--warn)' }} onClick={handleClearLogs}>清空</button>
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
