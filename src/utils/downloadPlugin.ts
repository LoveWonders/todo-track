import { registerPlugin } from '@capacitor/core';

export const DownloadPlugin = registerPlugin('DownloadPlugin', {
  web: {
    async saveToDownloads() {
      return Promise.reject(new Error('DownloadPlugin 仅在原生环境可用'));
    },
  },
  android: {},
});
