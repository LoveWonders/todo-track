import { addLog } from './logger';

const STORAGE_KEY = 'todo_app_data';
const FILE_NAME = 'todo_data.json';

function isNative() {
  try {
    return !!(window.Capacitor && window.Capacitor.isPluginAvailable && window.Capacitor.isPluginAvailable('Filesystem'));
  } catch {
    return false;
  }
}

async function loadFromFilesystem() {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  try {
    const result = await Filesystem.readFile({
      path: FILE_NAME,
      directory: Directory.Data,
      encoding: Encoding.UTF8,
    });
    const parsed = JSON.parse(result.data);
    addLog('info', '数据加载', { source: 'filesystem', count: parsed.length });
    return parsed;
  } catch (e) {
    if (e.message && e.message.includes('File does not exist')) {
      addLog('info', '数据加载', { source: 'filesystem', count: 0, note: '文件不存在，返回空数组' });
      return [];
    }
    addLog('error', '数据加载失败', { error: e.message });
    throw e;
  }
}

async function saveToFilesystem(data) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  addLog('info', '数据保存', { source: 'filesystem', count: data.length });
  await Filesystem.writeFile({
    path: FILE_NAME,
    data: JSON.stringify(data),
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true,
  });
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveToLocalStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch { /* ignore */ }
}

let _isNative = null;

export function getIsNative() {
  if (_isNative === null) {
    _isNative = isNative();
  }
  return _isNative;
}

export async function loadData() {
  if (getIsNative()) {
    return await loadFromFilesystem();
  }
  const data = loadFromLocalStorage();
  addLog('info', '数据加载', { source: 'localStorage', count: data.length });
  return data;
}

export async function saveData(data) {
  if (getIsNative()) {
    await saveToFilesystem(data);
  } else {
    saveToLocalStorage(data);
  }
}

export async function migrateFromLocalStorage() {
  if (!getIsNative()) return;
  try {
    const localData = loadFromLocalStorage();
    if (localData.length === 0) return;
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    try {
      await Filesystem.stat({ path: FILE_NAME, directory: Directory.Data });
      return;
    } catch { /* file doesn't exist, proceed */ }
    await saveToFilesystem(localData);
    addLog('info', '数据迁移', { source: 'localStorage', target: 'filesystem', count: localData.length });
  } catch { /* ignore migration errors */ }
}
