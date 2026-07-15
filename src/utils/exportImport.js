import { getIsNative } from './storage';

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

  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  await Filesystem.writeFile({
    path: filename,
    data: json,
    directory: Directory.Documents,
    recursive: true,
  });

  return filename;
}

export async function shareExportedFile(filename) {
  const { Share } = await import('@capacitor/share');
  const { Filesystem, Directory } = await import('@capacitor/filesystem');

  const result = await Filesystem.getUri({
    path: filename,
    directory: Directory.Documents,
  });

  await Share.share({
    title: '待办数据备份',
    text: 'TodoTrack 待办事项数据备份',
    url: result.uri,
    dialogTitle: '分享备份文件',
  });
}

export async function exportAndShareTodos(todos) {
  const filename = await exportTodosNative(todos);
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
      try {
        const data = JSON.parse(e.target.result);
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
      } catch {
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
