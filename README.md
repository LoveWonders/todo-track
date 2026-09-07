# TodoTrack

轻量、离线优先的移动端待办事项 PWA 应用。

> 本项目由 AI 辅助从零构建。核心产品需求、架构设计、容灾机制与体验打磨均由开发者主导，AI 负责代码生成与迭代优化。

## 核心特性

- **双写容灾**：Android 端 Filesystem + localStorage 并行写入，进程被 kill 或闪退不丢数据
- **自定义下载插件**：原生 DownloadPlugin 将数据直接写入 Download/todotrack/ 目录
- **全链路调试日志**：分级日志记录 + 检查勾选后批量复制或导出 TXT
- **离线可用**：基于 Service Worker 的 PWA，无网络也能正常使用
- **剪贴板三级降级**：Capacitor Clipboard → navigator.clipboard → execCommand，覆盖所有环境
- **任务折叠**：折叠按钮集成进度徽章，默认折叠减少干扰
- **清单模式**：按需开启拆解，完成率进度条 + 全部勾选后一键完成待办
- **重复任务**：每日/每周/每月懒加载流转，打开 App 自动归档过期周期并生成新窗口，无需定时器
- **本地通知提醒**：重复任务可设提醒时间，Android 到期推送本地通知（应用关闭也生效）
- **日历选择器**：点击日期预览可唤出系统日历选择器快速设置
- **快捷标签内联编辑**：支持增删改，实时保存到本地
- **顶栏搜索**：放大镜展开搜索框，匹配标题/内容/标签并高亮
- **标签筛选胶囊**：横向滑动固定槽位，漏斗下拉支持全选/反选

## 技术栈

| 层 | 技术 |
|---|------|
| 前端 | React 19 + Vite |
| PWA | vite-plugin-pwa (Workbox) |
| 原生壳 | Capacitor 8 (Android) |
| 存储 | @capacitor/filesystem + localStorage |
| 状态管理 | React Hooks (useState, useEffect, useCallback) |
| 拖拽 | @dnd-kit/core |
| 语言 | JavaScript (JSX) |

## 本地运行

```bash
npm install
npm run dev
```

浏览器打开 `http://localhost:5173` 即可使用。PWA 离线功能需先 `npm run build` 后通过 `npm run preview` 在 `http://localhost:4173` 测试。

## 打包 Android APK

```bash
# 同步前端资源到原生工程（需先 npm run build）
npx cap sync android

# 打包 Debug APK
export ANDROID_HOME=/root/android-sdk
export JAVA_HOME=/usr/local/jdk-21.0.12.1+1
cd android && ./gradlew assembleDebug
```

APK 输出路径：`android/app/build/outputs/apk/debug/app-debug.apk`

复制到工作区根目录并命名为 `todotrack-v{版本}-{YYYYMMDD}-{HHmm}.apk`，例如 `todotrack-v1.23.0-20260906-0404.apk`。

发版升版本：`npm run release:patch` / `minor` / `major`。

> 需要 JDK 21 和 Android SDK。本环境 `JAVA_HOME=/usr/local/jdk-21.0.12.1+1`，`ANDROID_HOME=/root/android-sdk`。`android/build.gradle` 已配置阿里云 Maven 镜像。

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
