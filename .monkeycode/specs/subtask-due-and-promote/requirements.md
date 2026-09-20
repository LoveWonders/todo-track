# Requirements Document — 子项截止、显灰与升为主待办

## Introduction

进度条目升级为嵌套子待办：可设截止、参与父卡过期/灰显计算，并支持把一条子项抽成独立主待办。子项仍只出现在父卡与详情内，不进入主列表。抽出后父清单留下单向「已抽出」痕迹，新待办与父待办不再互指。周期清单按标题模板生成下一期。本功能随 1.27.0 发布。

## Glossary

- **父待办**：主列表中的一条 Todo。
- **子项**：父待办 `progress` 中的一条进度；本功能起可带可选 `dueDate`。
- **父截止**：父待办自身的 `dueDate`。周期父待办取本期窗截止（`getRepeatDue`）。
- **有效截止**：父截止与全部 **active 且非标记类** 子项的 `dueDate` 中最早的时刻。
- **标记类进度**：`kind` 为 `cycle-done`、`cycle-skip` 或 `promoted` 的进度，不参与完成率、有效截止、下一期模板。
- **无截止锚点**：有效截止不存在。
- **升为主待办**：把一条 active 子项复制为新的顶层 Todo，并把原子项改成「已抽出」归档痕迹。
- **已抽出记录**：`kind=promoted` 且 `status=cancelled` 的进度。只保留原文案与抽出时刻，不写新待办 id。
- **临时子项**：`temporary=true`，完成本期后不进入下一期模板。
- **单向痕迹**：父侧可见「已抽出」历史；新待办按普通顶层任务处理，双方均不保存对方 id。

## Requirements

### R1 子项仍嵌套、可设截止

**User Story:** AS 用户, I want 给子项设置截止日期, so that 拆开的动作能单独到期，又不必占主列表一行

#### Acceptance Criteria

1. WHEN 用户在进度新增或编辑弹层选择日期并保存，系统 SHALL 把该子项的 `dueDate` 写成 ISO 日期时间。
2. WHEN 用户在已有截止的子项上清除日期并保存，系统 SHALL 把该子项的 `dueDate` 置为 `null`。
3. WHILE 子项存在，系统 SHALL 仅在父卡展开区与详情进度区展示该子项。
4. WHEN 导入或加载缺少 `dueDate` 的进度，系统 SHALL 将该子项视为未设置截止。
5. WHEN 子项带有 `dueDate`，系统 SHALL 在该子项卡片上展示该日期。
6. IF 子项日期选择器被取消且未点清除，系统 SHALL 保持原子项 `dueDate` 不变。

### R2 过期与灰显按有效截止

**User Story:** AS 用户, I want 父卡颜色按父截止和未完成子项里最早的那个来, so that 有子任务快到期时父卡也能被看见

#### Acceptance Criteria

1. WHEN 计算父卡过期、三日内到期与一个月分层，系统 SHALL 使用有效截止。
2. WHEN 有效截止早于当前时刻且父待办状态为 active，系统 SHALL 将父卡标为过期样式。
3. WHEN 某条 active 子项自身 `dueDate` 早于当前时刻，系统 SHALL 将该子项卡片标为过期样式。
4. WHEN 有效截止存在、距今不超过 1 个月、且父待办未标「长期」，系统 SHALL 按正常对比度显示父卡。
5. WHEN 有效截止存在且距今超过 1 个月，系统 SHALL 按灰显样式显示父卡。
6. WHEN 有效截止存在且距今不超过 3 天，系统 SHALL 将该父待办归入强调层（与现有过期/紧急同一层）。
7. WHEN 计算有效截止，系统 SHALL 忽略标记类进度以及 `status` 不是 active 的子项。

### R3 无截止锚点时的分层

**User Story:** AS 用户, I want 完全没写日期的待办也有稳定的灰/正常规则, so that 大部分子项没日期时列表不会乱成一片

已确认采用方案 A：

| 条件 | 父卡 |
|---|---|
| 有「紧急」标签 | 正常强调（tier 1） |
| 有「长期」标签 | 灰（tier 3） |
| 无有效截止，且存在 active 非标记类子项 | 正常（tier 2）：当作正在推进 |
| 无有效截止，且无 active 非标记类子项 | 灰（tier 3）：无期限 inbox |
| 无有效截止 | 不出现过期红字 |

#### Acceptance Criteria

1. IF 有效截止不存在且父待办带「紧急」标签，系统 SHALL 按正常强调显示父卡。
2. IF 有效截止不存在且父待办带「长期」标签，系统 SHALL 按灰显显示父卡。
3. IF 有效截止不存在且存在至少一条 active 非标记类子项且未带「长期」标签，系统 SHALL 按正常对比度显示父卡。
4. IF 有效截止不存在且不存在 active 非标记类子项且未带「紧急」标签，系统 SHALL 按灰显显示父卡。
5. IF 有效截止不存在，系统 SHALL 维持父卡非过期样式。

### R4 列表日期展示

**User Story:** AS 用户, I want 父卡上的日期反映真正用来着色的那个截止, so that 红了或灰了时我能对上数字

#### Acceptance Criteria

1. WHEN 有效截止存在，系统 SHALL 在父卡日期/倒计时位置展示有效截止。
2. WHEN 有效截止来自子项且与父截止不同，系统 SHALL 在父卡日期旁给出「最早子项」提示。
3. WHEN 有效截止不存在，系统 SHALL 在父卡隐藏日期与倒计时。
4. WHILE 用户打开父待办详情，系统 SHALL 在「截止时间」行继续编辑父待办自身 `dueDate`。
5. WHEN 用户选择「截止日期」排序，系统 SHALL 按有效截止对普通区排序。

### R5 周期下一期按标题生成清单

**User Story:** AS 用户, I want 完成本期后按未标记临时的子项标题生成下一期清单, so that 周期任务每期都有同一套动作

#### Acceptance Criteria

1. WHEN 周期父待办完成本期或作废本期，系统 SHALL 用非临时、非标记类的已完成子项标题生成下一期 active 子项。
2. WHEN 生成下一期子项，系统 SHALL 复制标题文本，并把新子项的 `dueDate`、`reminderTime`、`urgent` 置为未设置。
3. WHEN 原本期子项标记为临时，系统 SHALL 跳过该标题，不写入下一期清单。
4. WHILE 下一期子项存在，系统 SHALL 为每条子项分配新的 `id`。
5. WHEN 统计本期完成率，系统 SHALL 把标记类进度排除在完成数、未完成数与总数之外。

### R6 子项升为主待办（单向痕迹）

**User Story:** AS 用户, I want 把长大的子项抽成一条主待办, so that 它能独立排序、贴标签、设周期，父清单仍留一句已抽出

#### 行为摘要

入口：进度编辑弹层对 active 子项提供「升为主待办」。点按后先出确认，确认后执行。

新待办字段：

- `title` ← 子项 `text`
- `dueDate` ← 子项 `dueDate`
- `reminderAt` ← 子项 `reminderTime`
- `status` ← `active`
- `tags` ← 父待办标签副本；子项 `urgent=true` 时再并入「紧急」
- `repeatRule` / `repeatAnchor` / `cycleKey` / `checklistMode` / `progress` ← 空/关/空数组
- `createdAt` ← 抽出发生时刻
- `pinStatus` / `manualLocked` ← 空/false
- 不写 `promotedFrom` 或任何父 id

原父待办：

- 原子项改为 `status=cancelled`、`kind=promoted`、`completedAt` 为抽出时刻
- 保留 `text`；`dueDate` / `reminderTime` / `urgent` 可保留在记录上作历史，界面按归档展示
- 取消该子项已调度的进度提醒
- 不写新待办 id

新待办位置：普通区。「最新创建」排序下出现在普通区前部；手动排序模式下 `manualOrder` 接在普通区最大值之后。

进度归档区对 `kind=promoted` 显示「已抽出」标签。该记录可删除；删除只去掉痕迹，不影响已抽出的新待办。已抽出记录不提供恢复为 active。

升级确认使用 `window.confirm`。确认前先把弹层已填的文本、截止、急、提醒写入该子项，再抽出。

#### Acceptance Criteria

1. WHEN 用户对一条 active 子项确认升级，系统 SHALL 新建一条顶层待办，标题等于该子项文本。
2. WHEN 新待办创建完成，系统 SHALL 把原子项改为 `kind=promoted` 的归档记录，并在进度归档区显示「已抽出」。
3. WHEN 子项带有截止，系统 SHALL 把该截止写入新待办的 `dueDate`。
4. WHEN 子项带有提醒时刻，系统 SHALL 把该时刻写入新待办的 `reminderAt` 并重新调度一次性提醒。
5. WHEN 新待办创建完成，系统 SHALL 复制父待办当时的标签列表到新待办。
6. WHEN 子项 `urgent` 为 true，系统 SHALL 保证新待办标签包含「紧急」。
7. WHEN 写入已抽出记录与新待办，系统 SHALL 双方均不保存对方 id。
8. IF 子项状态不是 active，系统 SHALL 不展示升级入口。
9. IF 进度 `kind` 为标记类，系统 SHALL 不展示升级入口。
10. IF 升级过程中找不到父待办，系统 SHALL 中止并保持数据不变。
11. WHEN 用户删除一条已抽出记录，系统 SHALL 只从父待办进度中移除该记录。
12. WHEN 用户删除抽出后的新待办，系统 SHALL 保持父待办上的已抽出记录不变。
13. IF 进度 `kind` 为 `promoted`，系统 SHALL 不展示恢复入口。
14. WHEN 用户点「升为主待办」，系统 SHALL 先弹出 `window.confirm`；用户取消则保持数据与弹层不变。

### R7 导入、规范化与上限

**User Story:** AS 用户, I want 旧备份仍能打开, so that 加字段不会弄坏已有数据

#### Acceptance Criteria

1. WHEN 导入缺少 `dueDate` 的进度，系统 SHALL 按未设置截止处理。
2. WHEN 导入 `kind=promoted` 的进度，系统 SHALL 保留该 kind，并将 status 视为 cancelled。
3. WHEN 规范化单条进度，系统 SHALL 继续遵守现有进度条数与文本长度上限。
4. WHEN 规范化进度 `dueDate`，系统 SHALL 使用与父待办截止相同的日期规范化规则。

### R8 版本号

**User Story:** AS 发布者, I want 版本号反映兼容程度, so that 用户知道能否直接覆盖安装

本功能发 **1.27.0**（minor）。存储仍是同一份 `todo_app_data`，旧备份可导入。

2.0.0 留给：子项进入主列表、多层树、或更换存储格式。

#### Acceptance Criteria

1. WHEN 本功能随 APK 发布，系统 SHALL 将 versionName 记为 `1.27.0` 并将 versionCode 在 53 基础上加 1。

## Out of Scope

- 子项进入主列表
- 子项再套子项
- 抽出后的双向 id 链接与跳转
- 一次抽出多条
- 下一期自动平移子项截止
- 用创建日加 30 天合成截止
