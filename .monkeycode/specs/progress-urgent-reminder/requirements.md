# Requirements Document — 进度紧急与提醒

## Introduction

用户有时需要对某个待办中的**单条进度**标记「紧急」或设置「提醒时间」，以便无需打开详情页即可感知「有内容需要抓紧完成」，并在提醒时刻收到通知。本功能为 Progress 条目新增两级能力：手动紧急标记与一次性时间提醒，同时联动父待办卡片提示。

## Glossary

- **Progress 条目（进度）**：待办下的子项，含 text/status/createdAt/completedAt/temporary。
- **紧急进度**：被用户手动标记 `urgent=true` 的 active 进度。
- **待提醒进度**：设置了 `reminderTime` 且该时刻已到、仍处于 active 的进度。
- **父待办**：持有该进度条目的 Todo。
- **Ack 防重**：防止同一提醒重复触发的已通知记录。

## Requirements

### R1 紧急标记

**User Story:** AS 用户, I want 对单条进度标记紧急, so that 它能以高亮形式提醒我抓紧完成

#### Acceptance Criteria

1. WHEN 用户点击某条 active 进度的「紧急」按钮，系统 SHALL 将该进度的 `urgent` 置为 `true`。
2. WHEN 用户再次点击已紧急进度的「紧急」按钮，系统 SHALL 将该进度的 `urgent` 置为 `false`。
3. WHEN 某条进度的 `urgent` 为 `true`，系统 SHALL 在卡片上显示「急」标签并应用高亮样式。
4. WHEN 某条进度为 archived（completed/cancelled），系统 SHALL 忽略其紧急标记状态（不显示紧急样式）。

### R2 紧急进度列表位置

**User Story:** AS 用户, I want 标记紧急时进度卡片在原位高亮, so that 点击哪条紧急哪条，不因重排跳动造成错位感知

#### Acceptance Criteria

1. WHEN 标记/取消紧急标记，系统 SHALL 保持进行中进度列表原有顺序，卡片原位切换高亮与「急」标签。
2. WHEN 多条紧急进度存在，系统 SHALL 不改变其相对顺序。
3. WHEN 待办存在紧急或提醒过期的 active 进度，系统 SHALL 在待办卡片显示「急」角标以提示紧急分布。

### R3 提醒时间设置

**User Story:** AS 用户, I want 为单条进度设置提醒时间, so that 到点我能被提醒完成

#### Acceptance Criteria

1. WHEN 用户点击某条 active 进度的「提醒」按钮，系统 SHALL 打开日期时间选择器（datetime-local）。
2. WHEN 用户选定时间，系统 SHALL 将该进度的 `reminderTime` 存为 ISO 时刻。
3. WHEN 某条进度已设置提醒，系统 SHALL 在卡片上显示提醒时间标签（如 `⏰ 8/15 15:00`）。
4. WHEN 用户点击已设提醒进度的时间标签，系统 SHALL 提供修改或清除提醒的入口。
5. WHEN 用户清除提醒，系统 SHALL 将 `reminderTime` 置为 `null` 并取消已调度的通知。
6. WHEN 用户首次设置进度提醒，系统 SHALL 请求浏览器/系统通知权限。

### R4 提醒触发

**User Story:** AS 用户, I want 提醒到点时收到通知, so that 我不错过

#### Acceptance Criteria

1. WHEN 到达某条 active 进度的 `reminderTime`，系统 SHALL 触发通知（Web：浏览器 Notification；Android：Capacitor 本地通知）。
2. WHEN 某条进度的提醒已触发一次，系统 SHALL 不再对同一 `(todoId, progressId, reminderTime)` 重复通知。
3. WHEN 待提醒进度在到达时刻前已被完成或作废，系统 SHALL 不触发通知。
4. WHEN 待办在到达时刻前已完成或删除，系统 SHALL 不触发其进度提醒。

### R5 应用内提醒状态

**User Story:** AS 用户, I want 详情页内也能看到即将到期/已过期的提醒进度, so that 我不依赖通知也能感知

#### Acceptance Criteria

1. WHEN 某条 active 进度的 `reminderTime` 已过，系统 SHALL 对该卡片应用高亮样式并显示提醒过期标签。
2. WHEN 用户将过期的提醒进度完成或作废，系统 SHALL 取消该高亮状态。

### R6 父待办联动

**User Story:** AS 用户, I want 待办列表中能看到"有紧急/过期进度"的提示, so that 我不打开详情页也能知道

#### Acceptance Criteria

1. WHEN 某待办存在至少一条紧急或待提醒（提醒时间已过且未完成）的 active 进度，系统 SHALL 在该待办卡片上显示「急」角标。
2. WHEN 上述进度被完成、作废或取消标记，系统 SHALL 移除该角标。

### R7 生命周期清理

**User Story:** AS 系统, I want 在进度/待办被归档或删除时清理提醒, so that 不产生幽灵通知

#### Acceptance Criteria

1. WHEN 一条带提醒的进度被完成或作废，系统 SHALL 取消该进度的已调度通知。
2. WHEN 一条带提醒的进度被删除，系统 SHALL 取消该进度的已调度通知。
3. WHEN 一个待办被删除或完成，系统 SHALL 取消其全部 active 进度的已调度通知。

### R8 兼容性

**User Story:** AS 系统, I want 新旧数据兼容, so that 存量用户不受影响

#### Acceptance Criteria

1. WHEN 导入或迁移不含新字段的历史数据，系统 SHALL 将 `urgent` 归一化为 `false`、`reminderTime` 归一化为 `null`。
2. WHEN 数据中存在非布尔 `urgent` 或非法时间字符串，系统 SHALL 归一化为安全默认值。

### R9 通知降级

**User Story:** AS 用户, I want 通知不可用时应用仍可用, so that 功能不阻断

#### Acceptance Criteria

1. WHEN 浏览器/原生通知权限被拒绝或通知 API 不可用，系统 SHALL 静默跳过通知触发，且应用内高亮与标签仍正常显示。

### R10 待办一次性提醒

**User Story:** AS 用户, I want 任意待办（不限重复任务）设置一次性提醒, so that 到期收到提醒

#### Acceptance Criteria

1. WHEN 用户为任意 active 待办设置一次性提醒，系统 SHALL 将该待办 `reminderAt` 存为 ISO 绝对时刻。
2. WHEN 待办已设置一次性提醒，系统 SHALL 在待办卡片与详情页显示提醒时间标签。
3. WHEN 到达待办 `reminderAt`，系统 SHALL 触发通知（Web 浏览器 Notification / Android 本地通知），且同一 `(todoId, reminderAt)` 不重复触发（Ack 防重）。
4. WHEN 待办被完成或删除，系统 SHALL 取消该一次性提醒调度。
5. WHEN 重复任务已设置 `reminderTime`（每日 HH:mm 提醒），系统 SHALL 保留该既有行为，与一次性 `reminderAt` 互不影响。
