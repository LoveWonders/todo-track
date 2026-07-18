import { Capacitor } from '@capacitor/core';

interface DownloadPluginInterface {
  saveToDownloads(options: { filename: string; data: string; subFolder?: string; mimeType?: string }): Promise<{ uri: string; filename: string; subFolder: string }>;
}

function nativeSaveToDownloads(options: { filename: string; data: string; subFolder?: string; mimeType?: string }): Promise<{ uri: string; filename: string; subFolder: string }> {
  return Capacitor.nativePromise('DownloadPlugin', 'saveToDownloads', options);
}

export const DownloadPlugin: DownloadPluginInterface = {
  saveToDownloads(options) {
    if (!Capacitor.isNativePlatform()) {
      return Promise.reject(new Error('DownloadPlugin 仅在原生环境可用'));
    }
    return nativeSaveToDownloads(options);
  },
};
