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

### APK 构建环境需要 Java 21
- Date: 2026-07-24
- Context: Agent 在执行 APK 构建时发现 JDK 17 不满足 Capacitor Android 依赖的编译要求
- Category: 构建编译
- Instructions:
  - APK 构建需要 JDK 21，已安装到 `/usr/local/jdk-21.0.11+10`
  - 构建命令：`export ANDROID_HOME=/root/android-sdk && export JAVA_HOME=/usr/local/jdk-21.0.11+10 && ./gradlew assembleDebug`
  - Android SDK 路径：`/root/android-sdk`，platforms: android-34/android-36，build-tools: 34.0.0/35.0.0
  - `local.properties` 中配置 `sdk.dir=/root/android-sdk`

### APK 文件名需包含版本号和日期时间后缀
- Date: 2026-07-24
- Context: 用户明确要求 APK 打包时文件名需带版本号和日期时间（精确到分钟）
- Instructions:
  - APK 打包后，输出的文件名格式为 `todotrack-v{版本号}-{YYYYMMDD}-{HHmm}.apk`
  - 示例：`todotrack-v1.1-20260724-0659.apk`
  - 同时将 APK 复制到工作区根目录，便于用户获取
