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

  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');

  try {
    const result = await Filesystem.writeFile({
      path: filename,
      data: json,
      directory: Directory.External,
      encoding: Encoding.UTF8,
      recursive: true,
    });

    const verify = await Filesystem.stat({
      path: filename,
      directory: Directory.External,
    });

    const pathHint = `/Android/data/com.todotrack.app/files/${filename}`;

    addLog('success', '导出成功', {
      uri: result.uri,
      dataLength: json.length,
      fileSize: verify.size,
      fileUri: verify.uri,
    });

    if (verify.size === 0) {
      throw new Error('文件写入后大小为 0 字节，写入异常');
    }

    return { filename, path: pathHint };
  } catch (err) {
    const detail = JSON.stringify(err, Object.getOwnPropertyNames(err));
    addLog('error', '导出失败', { error: err.message, detail });
    throw err;
  }
}

export async function shareExportedFile(filename) {
  if (!filename || typeof filename !== 'string') {
    addLog('error', '分享失败', { error: 'filename 无效' });
    throw new Error('shareExportedFile: filename 无效');
  }

  const { Share } = await import('@capacitor/share');
  const { Filesystem, Directory } = await import('@capacitor/filesystem');

  const result = await Filesystem.getUri({
    path: filename,
    directory: Directory.External,
  });

  addLog('info', '开始分享', { filename, uri: result.uri });

  await Share.share({
    title: '待办数据备份',
    text: 'TodoTrack 待办事项数据备份',
    url: result.uri,
    dialogTitle: '分享备份文件',
  });
}

export async function exportAndShareTodos(todos) {
  const { filename } = await exportTodosNative(todos);
  try {
    await shareExportedFile(filename);
  } catch {
    // user cancelled share, file is still saved
  }
  return filename;
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
