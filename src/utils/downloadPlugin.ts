import { Capacitor } from '@capacitor/core';

interface DownloadPluginInterface {
  saveToDownloads(options: { filename: string; data: string; subFolder?: string; mimeType?: string }): Promise<{ uri: string; filename: string; subFolder: string }>;
}

function nativeSaveToDownloads(options: { filename: string; data: string; subFolder?: string; mimeType?: string }): Promise<{ uri: string; filename: string; subFolder: string }> {
  return Capacitor.nativePromise('DownloadPlugin', 'saveToDownloads', options);
}

function browserSaveToDownloads(options: { filename: string; data: string; subFolder?: string; mimeType?: string }): Promise<{ uri: string; filename: string; subFolder: string }> {
  return new Promise((resolve, reject) => {
    try {
      const blob = new Blob([options.data], { type: options.mimeType || 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = options.filename;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      resolve({ uri: url, filename: options.filename, subFolder: options.subFolder || '' });
    } catch (e) {
      reject(e);
    }
  });
}

export const DownloadPlugin: DownloadPluginInterface = {
  saveToDownloads(options) {
    if (Capacitor.isNativePlatform()) {
      return nativeSaveToDownloads(options);
    }
    return browserSaveToDownloads(options);
  },
};
