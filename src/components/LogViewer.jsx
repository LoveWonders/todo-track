import { useState, useEffect } from 'react';
import ModalShell from './ModalShell';
import { getLogs, clearLogs, deleteLogs, logTypeLabel, getSelectedLogsText } from '../utils/logger';
import { copyToClipboard } from '../utils/clipboard';
import { formatFileStamp } from '../utils/dateParser';

export default function LogViewer({ open, onClose, onToast }) {
  const [logs, setLogs] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());

  useEffect(() => {
    if (open) {
      setLogs(getLogs());
      setSelectedIds(new Set());
    }
  }, [open]);

  const handleClearLogs = () => {
    clearLogs();
    setLogs([]);
    setSelectedIds(new Set());
    onClose();
  };

  const handleDeleteSelected = () => {
    if (selectedIds.size === 0) {
      onToast({ type: 'error', message: '请先选择要删除的日志' });
      return;
    }
    deleteLogs(selectedIds);
    setLogs(getLogs());
    setSelectedIds(new Set());
    onToast({ type: 'success', path: null, uri: null });
  };

  const handleCopyLogs = async () => {
    if (selectedIds.size === 0) {
      onToast({ type: 'error', message: '请先选择要复制的日志' });
      return;
    }

    const text = getSelectedLogsText(logs, selectedIds);

    try {
      const ok = await copyToClipboard(text);
      if (ok) {
        onToast({ type: 'success', path: null, uri: null });
      } else {
        onToast({ type: 'error', message: '复制失败，请手动长按选择文本复制' });
      }
    } catch {
      onToast({ type: 'error', message: '复制失败，请在浏览器设置中允许剪贴板权限' });
    }
  };

  const handleExportLogs = async () => {
    if (selectedIds.size === 0) {
      onToast({ type: 'error', message: '请先选择要导出的日志' });
      return;
    }

    const text = getSelectedLogsText(logs, selectedIds);

    const filename = `todotrack_debug_log_${formatFileStamp()}.txt`;

    try {
      const { DownloadPlugin } = await import('../utils/downloadPlugin');
      await DownloadPlugin.saveToDownloads({
        filename,
        data: text,
        subFolder: 'todotrack',
        mimeType: 'text/plain',
      });
      onToast({ type: 'success', path: 'Download/todotrack/', uri: null });
    } catch (err) {
      onToast({ type: 'error', message: '日志导出失败：' + (err.message || String(err)) });
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

  if (!open) return null;

  return (
    <ModalShell
      title="调试日志"
      onClose={onClose}
      bodyClassName="log-body"
      footer={
        <>
          <button className="btn-secondary" onClick={onClose}>关闭</button>
          {logs.length > 0 && (
            <button className="btn-primary" onClick={handleCopyLogs}>复制</button>
          )}
          {logs.length > 0 && (
            <button className="btn-secondary" onClick={handleExportLogs}>导出 TXT</button>
          )}
          {logs.length > 0 && selectedIds.size > 0 && (
            <button className="btn-danger" onClick={handleDeleteSelected}>删除选中</button>
          )}
          {logs.length > 0 && (
            <button className="btn-secondary" style={{ background: 'var(--warn)', borderColor: 'var(--warn)', color: '#fff' }} onClick={handleClearLogs}>清空</button>
          )}
        </>
      }
    >
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
    </ModalShell>
  );
}
