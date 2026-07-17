import { getIsNative } from './storage';
import { addLog } from './logger';

function getExportFilename() {
  const now = new Date();
  const ts = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
  return `todotrack_${ts}.json`;
}

export function exportTodos(todos) {
  const json = JSON.stringify(todos, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const filename = getExportFilename();

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export async function exportTodosNative(todos) {
  const json = JSON.stringify(todos, null, 2);
  const filename = getExportFilename();

  if (!filename || typeof filename !== 'string') {
    throw new Error('path 参数无效：' + JSON.stringify(filename));
  }
  if (typeof json !== 'string') {
    throw new Error('data 参数无效：非字符串数据');
  }
  if (json.length === 0) {
    throw new Error('data 参数无效：空字符串');
  }

  addLog('info', '开始导出', { filename, dataLength: json.length, preview: json.slice(0, 80) });

  try {
    const { DownloadPlugin } = await import('./downloadPlugin');
    const result = await DownloadPlugin.saveToDownloads({ filename, data: json });

    addLog('success', '导出成功', {
      uri: result.uri,
      filename: result.filename,
      dataLength: json.length,
    });

    return { filename, path: '系统下载目录 (Download)', uri: result.uri };
  } catch (err) {
    const detail = typeof err === 'object' ? JSON.stringify(err, Object.getOwnPropertyNames(err)) : String(err);
    addLog('error', '导出失败', { error: err.message || String(err), detail });
    throw err;
  }
}

export async function shareExportedFile(fileUri) {
  if (!fileUri || typeof fileUri !== 'string') {
    addLog('error', '分享失败', { error: 'fileUri 无效' });
    throw new Error('shareExportedFile: fileUri 无效');
  }

  const { Share } = await import('@capacitor/share');

  addLog('info', '开始分享', { uri: fileUri });

  await Share.share({
    title: '待办数据备份',
    text: 'TodoTrack 待办事项数据备份',
    url: fileUri,
    dialogTitle: '分享备份文件',
  });
}

export async function exportAndShareTodos(todos) {
  const result = await exportTodosNative(todos);
  try {
    await shareExportedFile(result.uri);
  } catch {
    // user cancelled share, file is still saved
  }
  return result.filename;
}

export function parseImportFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      let raw = e.target.result;
      if (!raw || raw.length === 0) {
        reject(new Error('文件内容为空'));
        return;
      }
      if (raw.charCodeAt(0) === 0xFEFF) {
        raw = raw.slice(1);
      }
      try {
        const data = JSON.parse(raw);
        if (!Array.isArray(data)) {
          reject(new Error('文件格式错误：需要待办数组'));
          return;
        }
        const valid = data.every(item =>
          item && typeof item.id === 'number' && typeof item.title === 'string'
        );
        if (!valid) {
          reject(new Error('文件格式错误：待办数据缺少 id 或 title 字段'));
          return;
        }
        resolve(data);
      } catch (err) {
        addLog('error', 'JSON 解析失败', {
          filename: file.name,
          fileSize: file.size,
          preview: raw.slice(0, 100),
          parseError: err.message,
        });
        reject(new Error('文件解析失败：不是有效的 JSON 格式'));
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsText(file);
  });
}

export function mergeTodos(existingTodos, importTodos, conflictStrategy) {
  const existingIds = new Set(existingTodos.map(t => t.id));
  const conflicts = importTodos.filter(t => existingIds.has(t.id));
  const noConflicts = importTodos.filter(t => !existingIds.has(t.id));

  if (conflicts.length === 0) {
    return [...existingTodos, ...noConflicts];
  }

  if (conflictStrategy === 'overwrite') {
    const overwriteIds = new Set(conflicts.map(t => t.id));
    const kept = existingTodos.filter(t => !overwriteIds.has(t.id));
    return [...kept, ...conflicts, ...noConflicts];
  }

  return [...existingTodos, ...noConflicts];
}

export function findConflicts(existingTodos, importTodos) {
  const existingIds = new Set(existingTodos.map(t => t.id));
  return importTodos.filter(t => existingIds.has(t.id));
}
