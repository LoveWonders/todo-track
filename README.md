# TodoTrack

轻量、离线优先的移动端待办事项 PWA 应用。

> 本项目由 AI 辅助从零构建。核心产品需求、架构设计、容灾机制与体验打磨均由开发者主导，AI 负责代码生成与迭代优化。

## 核心特性

- **双写容灾**：Android 端 Filesystem + localStorage 并行写入，进程被 kill 或闪退不丢数据
- **自定义下载插件**：原生 DownloadPlugin 将数据直接写入 Download/todotrack/ 目录
- **全链路调试日志**：分级日志记录 + 检查勾选后批量复制或导出 TXT
- **离线可用**：基于 Service Worker 的 PWA，无网络也能正常使用
- **剪贴板三级降级**：Capacitor Clipboard → navigator.clipboard → execCommand，覆盖所有环境

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 19 + Vite |
| PWA | vite-plugin-pwa (Workbox) |
| 原生壳 | Capacitor 8 (Android) |
| 存储 | @capacitor/filesystem + localStorage |
| 语言 | TypeScript / JSX |

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173` 即可使用。PWA 离线功能需先 `npm run build` 后通过 `npm run preview` 在 `http://localhost:4173` 测试。

## 打包 Android APK

```bash
# 清理缓存
rm -rf android/build android/app/build android/.gradle

# 同步前端资源到原生工程
npx cap sync android

# 打包 Debug APK
cd android && ./gradlew assembleDebug
```

APK 输出路径：`android/app/build/outputs/apk/debug/app-debug.apk`

> 需要 JDK 21 和 Android SDK，环境变量 `JAVA_HOME` 和 `ANDROID_HOME` 需正确配置。

## 项目结构

```
├── src/
│   ├── components/     # React 组件（DataMenu, TaskList 等）
│   ├── utils/          # 工具函数（logger, downloadPlugin, storage, exportImport）
│   └── index.css       # 全局样式 + CSS 变量
├── android/            # Capacitor Android 原生工程
│   └── app/src/main/java/com/todotrack/app/
│       ├── MainActivity.java
│       └── plugins/DownloadPlugin.java
├── docs/               # Vite 构建输出（Vercel 部署目录）
└── public/             # 静态资源
```

## 许可证

[MIT](LICENSE)
