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
  const result = await Filesystem.readFile({
    path: FILE_NAME,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
  });
  addLog('info', '[加载] Filesystem 读取成功，内容长度', { length: result.data.length });
  return result.data;
}

async function saveToFilesystem(data) {
  const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
  const json = JSON.stringify(data);
  await Filesystem.writeFile({
    path: FILE_NAME,
    data: json,
    directory: Directory.Data,
    encoding: Encoding.UTF8,
    recursive: true,
  });
}

function loadFromLocalStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw || null;
  } catch {
    return null;
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
  addLog('info', '[加载] 开始读取数据...', { native: getIsNative() });

  if (!getIsNative()) {
    const raw = loadFromLocalStorage();
    if (raw === null) {
      addLog('info', '[加载] localStorage 无数据，返回空数组');
      return [];
    }
    try {
      const data = JSON.parse(raw);
      addLog('info', '[加载] JSON 解析成功，获取到数据', { count: data.length });
      return data;
    } catch (e) {
      addLog('error', '[加载] JSON 解析失败！原始内容前50个字符预览', {
        preview: raw.substring(0, 50),
        error: e.message,
      });
      return [];
    }
  }

  let rawText = null;

  try {
    rawText = await loadFromFilesystem();
  } catch (e) {
    addLog('error', '[加载] Filesystem 读取失败，准备回退到 localStorage', {
      error: e.message,
    });

    const lsRaw = loadFromLocalStorage();
    if (lsRaw === null) {
      addLog('info', '[加载] localStorage 也无数据，返回空数组');
      return [];
    }
    try {
      const data = JSON.parse(lsRaw);
      addLog('info', '[加载] localStorage 回退成功', { count: data.length });
      return data;
    } catch (pe) {
      addLog('error', '[加载] localStorage JSON 解析失败！原始内容前50个字符预览', {
        preview: lsRaw.substring(0, 50),
        error: pe.message,
      });
      return [];
    }
  }

  try {
    const data = JSON.parse(rawText);
    addLog('info', '[加载] JSON 解析成功，获取到数据', { count: data.length });
    return data;
  } catch (e) {
    addLog('error', '[加载] JSON 解析失败！原始内容前50个字符预览', {
      preview: rawText.substring(0, 50),
      error: e.message,
    });

    const lsRaw = loadFromLocalStorage();
    if (lsRaw === null) {
      addLog('info', '[加载] Filesystem 解析失败且 localStorage 无备份');
      return [];
    }
    try {
      const data = JSON.parse(lsRaw);
      addLog('info', '[加载] 解析 Filesystem 失败，回退 localStorage 成功', { count: data.length });
      return data;
    } catch (pe) {
      addLog('error', '[加载] localStorage 也解析失败', { error: pe.message });
      return [];
    }
  }
}

export async function saveData(data) {
  addLog('info', '[保存] 开始双写数据...', { count: data.length, native: getIsNative() });

  if (!getIsNative()) {
    saveToLocalStorage(data);
    addLog('info', '[保存] localStorage 写入完成');
    return;
  }

  let fsOk = false;
  try {
    await saveToFilesystem(data);
    fsOk = true;
  } catch (e) {
    addLog('error', '[保存] Filesystem 写入失败，仅写 localStorage', {
      error: e.message,
      count: data.length,
    });
  }

  saveToLocalStorage(data);

  if (fsOk) {
    addLog('info', '[保存] Filesystem 与 localStorage 双写均成功');
  }
}

export async function migrateFromLocalStorage() {
  if (!getIsNative()) return;

  try {
    const raw = loadFromLocalStorage();
    if (!raw) return;

    const localData = JSON.parse(raw);
    if (localData.length === 0) return;

    addLog('info', '[迁移] 检测到 localStorage 数据，准备迁移', { count: localData.length });

    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    try {
      await Filesystem.stat({ path: FILE_NAME, directory: Directory.Data });
      addLog('info', '[迁移] Filesystem 已有数据，跳过迁移');
      return;
    } catch (statErr) {
      if (!statErr.message || !statErr.message.includes('File does not exist')) {
        addLog('error', '[迁移] stat 调用异常，跳过迁移', { error: statErr.message });
        return;
      }
    }

    await saveToFilesystem(localData);
    addLog('info', '[迁移] 数据迁移完成', { source: 'localStorage', target: 'filesystem', count: localData.length });
  } catch (e) {
    addLog('error', '[迁移] 数据迁移失败', { error: e.message });
  }
}

export async function clearAllData() {
  if (getIsNative()) {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    try {
      await Filesystem.deleteFile({ path: FILE_NAME, directory: Directory.Data });
      addLog('info', '[清除] Filesystem 文件已删除');
    } catch (e) {
      addLog('error', '[清除] Filesystem 删除失败', { error: e.message });
    }
  }
  localStorage.removeItem(STORAGE_KEY);
  addLog('info', '[清除] localStorage 已清空');
}
