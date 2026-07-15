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
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  try {
    const result = await Filesystem.readFile({
      path: FILE_NAME,
      directory: Directory.Data,
    });
    return JSON.parse(result.data);
  } catch (e) {
    if (e.message && e.message.includes('File does not exist')) {
      return [];
    }
    throw e;
  }
}

async function saveToFilesystem(data) {
  const { Filesystem, Directory } = await import('@capacitor/filesystem');
  await Filesystem.writeFile({
    path: FILE_NAME,
    data: JSON.stringify(data),
    directory: Directory.Data,
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
  return loadFromLocalStorage();
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
  } catch { /* ignore migration errors */ }
}
