# 用户指令记忆

本文件记录了用户的指令、偏好和教导，用于在未来的交互中提供参考。

## 格式

### 用户指令条目
用户指令条目应遵循以下格式：

[用户指令摘要]
- Date: [YYYY-MM-DD]
- Context: [提及的场景或时间]
- Instructions:
  - [用户教导或指示的内容，逐行描述]

### 项目知识条目
Agent 在任务执行过程中发现的条目应遵循以下格式：

[项目知识摘要]
- Date: [YYYY-MM-DD]
- Context: Agent 在执行 [具体任务描述] 时发现
- Category: [运维部署|构建方法|测试方法|排错调试|工作流协作|环境配置]
- Instructions:
  - [具体的知识点，逐行描述]

## 去重策略
- 添加新条目前，检查是否存在相似或相同的指令
- 若发现重复，跳过新条目或与已有条目合并
- 合并时，更新上下文或日期信息
- 这有助于避免冗余条目，保持记忆文件整洁

## 条目

### APK 构建与发版
- Date: 2026-09-06
- Context: Agent 在 v1.23.0 云端打包时重装 JDK/SDK，并启用 Gradle 加速
- Category: 构建编译
- Instructions:
  - 发版用 `npm run release:patch` / `minor` / `major`，会同步 `package.json` 与 `android/app/build.gradle` 的 versionName/versionCode
  - JDK 21 当前路径：`/usr/local/jdk-21.0.12.1+1`（Temurin 21.0.12.1+1）；旧路径 `/usr/local/jdk-21.0.11+10` 已不存在
  - Android SDK：`/root/android-sdk`，platforms: android-36，build-tools: 35.0.0；`android/local.properties` 写 `sdk.dir=/root/android-sdk`（该文件已被 gitignore）
  - 构建流程：`npm run build` → `npx cap sync android` → `export ANDROID_HOME=/root/android-sdk && export JAVA_HOME=/usr/local/jdk-21.0.12.1+1 && cd android && ./gradlew assembleDebug`
  - 产物：`android/app/build/outputs/apk/debug/app-debug.apk`，复制到工作区根目录并命名 `todotrack-v{版本}-{YYYYMMDD}-{HHmm}.apk`；`*.apk` 已被 gitignore，不入库
  - Gradle 加速：`android/gradle.properties` 启用 `org.gradle.parallel=true` 与 `org.gradle.caching=true`；`android/build.gradle` 仓库优先阿里云 maven（google/central/public/gradle-plugin），再兜底 `google()` / `mavenCentral()`
  - 直连 `dl.google.com` 会 TLS handshake 失败，必须走阿里云镜像
  - Android 13+ 需在 `android/app/src/main/AndroidManifest.xml` 声明 `POST_NOTIFICATIONS`，否则 LocalNotifications 不显示

### 布局验证用 Playwright 全局安装
- Date: 2026-08-10
- Context: Agent 在执行进度卡片两列布局排查时发现，需用真实浏览器验证 flex 布局
- Category: 环境配置
- Instructions:
  - playwright 已全局安装（`/usr/local/lib/node_modules/playwright`），chromium 已下载到 `/root/.cache/ms-playwright`
  - 使用方式：`export NODE_PATH=/usr/local/lib/node_modules` 后 `require('playwright')`，headless 启动
  - dev server 在 `http://localhost:5173/` 可直接验证；注入数据需写入 `todo_app_data`（todo id 必须为数字，字符串 id 会被 normalizeImportedTodo 丢弃）

### showNativeDatePicker 空值不回调
- Date: 2026-08-13
- Context: Agent 在实现进度提醒清除功能时发现，日期选择器对空选择不触发回调
- Category: 排错调试
- Instructions:
  - `showNativeDatePicker` 的 change 监听为 `if (picked && onPick) onPick(picked)`，空值不会回调
  - 依赖「用户取消选择=清除」的方案不可行；清除类交互需用 toggle 语义（已有值时点击直接清除，而非打开选择器等待空选择）
  - Playwright 注入日期选择器值：dispatch `change` 事件到隐藏 input（`style.opacity === '0'`），多次点击时取最后一个新建 input，避免误用已消费 listener 的旧 input

### Playwright headless 无法授予通知权限，验证需注入假 Notification
- Date: 2026-08-15
- Context: Agent 在验证 Web 端提醒轮询时发现，headless chromium 的 notifications 权限始终为 denied，浏览器通知触发逻辑无法真实验证
- Category: 排错调试
- Instructions:
  - `context.grantPermissions(['notifications'])` 在 headless 下不生效，`Notification.permission` 恒为 denied
  - 验证通知触发逻辑：在页面 evaluate 注入自定义 `window.Notification`（`permission='granted'` + `requestPermission()` 返回 granted），应用模块运行时读取全局 Notification 即生效
  - 通过断言 `todo_reminder_ack`（localStorage）中是否出现 `progress:{todoId}:{progressId}:{reminderTime}` 键来验证触发与 Ack 防重

### useCallback 依赖数组引用后置 const 会触发 TDZ 错误
- Date: 2026-08-16
- Context: Agent 在 TodoDetail 新增 openTodoReminderPicker 时，将 useCallback 定义在 triggerAutoSave 之前导致运行时 "Cannot access 'triggerAutoSave' before initialization"
- Category: 排错调试
- Instructions:
  - React 组件内 `const` 定义的函数没有提升，useCallback 的依赖数组在初始化时求值，若引用后文定义的 const 会抛 TDZ 错误
  - 修复：将 useCallback 移动到其依赖的函数定义之后，或改用函数式引用（依赖数组中直接内联定义）

### 重复任务需与用户确认，不得循环重复响应
- Date: 2026-08-16
- Context: 用户发现同一输入被反复触发，Agent 逐条循环响应「工作已完成」直至消耗大量 tokens，用户明确要求制止
- Category: 工作流协作
- Instructions:
  - 同一任务/问题重复出现两次以上时，停止继续响应，先与用户确认是否真的需要再次执行
  - 检测到明显重复的输入（如反复出现的同一句「What did we do so far?」）且无新任务时，不逐一回复相同内容，保持简短并提示需要新指令
  - 每次任务不要重复执行两次以上

### 浏览器端提醒不弹窗（已知延期 bug）
- Date: 2026-09-03
- Context: 用户确认此前验证过：浏览器端提醒不会跳出通知弹窗或其他可见提示；视为 bug，但修复成本高、实用性低，先搁置
- Category: 排错调试
- Instructions:
  - Web 端提醒走 `src/utils/notification.js` 的 `checkDueReminders`：非 native 时用 `new Notification(...)`，依赖 `Notification.permission === 'granted'`
  - 原生端走 Capacitor `LocalNotifications`（`scheduleReminder` / `scheduleTodoReminder` / `scheduleProgressReminder`），与浏览器路径分离
  - 此前实测：浏览器端到期后不弹系统通知、也不出应用内弹窗；headless Playwright 也无法真实验证（`Notification.permission` 恒为 denied）
  - 当前策略：不主动修；Android 原生通知仍是主路径。以后若修，优先核对权限申请、`todo_reminder_ack` 防重、以及是否需要应用内 toast 兜底

### neat-freak 文档/记忆对齐技能
- Date: 2026-09-06
- Context: 用户要求安装 https://github.com/lsa03/neat-freak-person，用于会话结束时把改动对齐到项目记忆与文档
- Category: 环境配置
- Instructions:
  - 技能已复制到 `~/.claude/skills/neat-freak/` 与 `/root/.codingmatrix/project-tpl/.ai-ready/skills/neat-freak/`
  - 当前会话的 Skill 工具列表可能尚未刷新该技能；执行时直接读取上述 `SKILL.md`
  - 触发语：「同步一下」/ `/neat`；只改文档和记忆，不改业务代码

(Showing lines 52-72 of 72.)
