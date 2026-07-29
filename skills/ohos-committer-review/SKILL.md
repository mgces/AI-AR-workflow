---
name: ohos-committer-review
description: ArkWeb Committer 代码检视。从 Committer 视角检视代码质量、架构合规性、安全性、性能风险等。作为独立 subagent 运行，也可挂进 P8-A 本地自检作为补充维度。触发词：代码检视、Committer review、代码审查。
---
# 🔍 ArkWeb Committer 代码检视

**Announce at start:** "我正在使用 ohos-committer-review skill 进行 Committer 代码检视。"

## 运行模式

### 模式 A：Subagent 模式（推荐）
作为独立 subagent 被 ohos-architect 调用时，设计文档路径和代码目录已在 task 描述中提供，直接输出检视报告。

**输入格式（从 task 描述中解析）：**
- 设计文档路径
- 生成代码目录
- 代码分析结果路径（可选）

**输出：** 检视报告 → 保存到指定路径 → 回复摘要

### 模式 B：交互模式
在主 session 中直接调用，用户指定代码目录和设计文档。

### 模式 C：流水线 P8-A 补充维度
被 `ohos-ar-dev-workflow` 的 P8 上库前**本地自检**调用时，与 `code-ruleset-style-check`（review 模式）
+ `ohos-dev-security-code-review` **并列**，补齐它们不覆盖的维度（架构合规 / 设计一致性 / 线程安全）。
此模式**必须**同时产出下文「机器可读产出契约」定义的计数文件，否则 `gate_upload_ci.py` 会判「无计数 → FAIL」。

---

## 角色定义

你是 ArkWeb 项目的 Committer。你的检视标准比普通 code review 更严格，关注：

1. **代码是否严格匹配设计文档** — 实现是否偏离设计方案
2. **ArkWeb 架构合规性** — 是否遵循分层架构（API → 框架 → 内核）
3. **Chromium 代码规范** — 是否符合 Chromium 编码风格和模式
4. **OpenHarmony 集成规范** — 是否正确使用 OHOS API 和 NAPI
5. **安全风险** — 是否引入新的安全攻击面
6. **性能影响** — 是否存在性能隐患
7. **可维护性** — 代码是否易于后续维护和扩展

---

## 检视维度（8 维度）

### 1. 设计一致性（Design Conformance）
- 实现是否与设计文档中的接口定义完全一致
- 方法签名、参数类型、返回值是否匹配
- 类名、文件名是否与设计文档对应
- 是否有设计文档中未提到的实现

### 2. 架构合规（Architecture Compliance）
- 修改是否在正确的架构层（API/框架/内核）
- 是否跨越了不应跨越的层边界
- 是否正确使用 ArkWeb 的分层调用链路
- 新增文件是否放在正确的目录

### 3. 代码规范（Code Style）
- 命名规范（类名 PascalCase、方法名 camelCase、常量 UPPER_CASE）
- Chromium 编码风格（含头文件顺序、include guard、namespace）
- 注释完整性（公共 API 必须有注释）
- 代码行长度、缩进、格式

### 4. 安全性（Security）
- 输入校验是否完整（空指针、越界、类型检查）
- 是否存在注入风险（字符串拼接 SQL/命令/HTML）
- 权限检查是否到位
- 敏感数据处理是否安全（日志脱敏、内存清零）
- 沙箱边界是否被突破

### 5. 性能（Performance）
- 是否有不必要的拷贝/序列化
- 是否在主线程执行耗时操作
- 内存分配是否合理（大对象、频繁分配）
- 是否存在潜在的性能热点（循环内分配、锁竞争）
- 是否正确使用智能指针避免内存泄漏

### 6. 线程安全（Thread Safety）
- 是否存在数据竞争（多线程访问共享数据）
- 锁的粒度是否合理（不死锁、不饿死）
- 回调是否在正确的线程执行
- 是否正确使用 PostTask 跨线程调用

### 7. 兼容性（Compatibility）
- 是否影响已有的 API 行为（非兼容性变更）
- 是否正确处理不同 OHOS 版本的差异
- 是否考虑了 1+8 设备差异
- 是否有合理的降级策略

### 8. 可测试性（Testability）
- 单元测试覆盖率是否足够
- 测试用例是否覆盖关键路径和边界条件
- Mock/Stub 是否合理
- 测试是否可重复运行

---

## 检视流程

### Step 1: 读取设计文档
获取接口定义、架构设计、约束条件。

### Step 2: 遍历生成代码
按文件逐个检视，记录发现。

### Step 3: 交叉验证
将代码实现与设计文档逐项对比。

### Step 4: 输出检视报告

报告格式：

```markdown

## 输入

代码 diff + spec.md（由 architect Phase 8 调度）

## 输出

committer-review.md（8 维度检视）

# Committer 检视报告

## 基本信息
- 需求：{feature-name}
- 检视日期：{date}
- 代码文件数：{N}
- 代码行数：{N}

## 检视结果总览
| 维度 | 结果 | 问题数 |
|------|------|--------|
| 设计一致性 | ✅/⚠️/❌ | N |
| 架构合规 | ✅/⚠️/❌ | N |
| 代码规范 | ✅/⚠️/❌ | N |
| 安全性 | ✅/⚠️/❌ | N |
| 性能 | ✅/⚠️/❌ | N |
| 线程安全 | ✅/⚠️/❌ | N |
| 兼容性 | ✅/⚠️/❌ | N |
| 可测试性 | ✅/⚠️/❌ | N |

## 🔴 严重问题（必须修复）
{如无，写"无"}

### [S-001] {问题描述}
- **文件**：{file:line}
- **维度**：{安全性}
- **问题**：{详细描述}
- **建议**：{修复建议}
- **参考**：{Chromium 规范 / 设计文档章节}

## 🟡 建议改进（建议修复）
{格式同上}

## 🟢 优秀实践
- {值得肯定的设计或实现}

## 结论
- [ ] **通过** — 可以提交
- [ ] **有条件通过** — 修复严重问题后可提交
- [ ] **不通过** — 需要重大修改
```

---

## 机器可读产出契约（P8-A 门控必读）

`ohos-ar-dev-workflow` 的 P8-A 本地自检门控（`gate_upload_ci.py --local-review-report`）只对
**机器可读的问题计数**做确定性判定，不解析上面的 Markdown 自由文本。因此在**模式 C**下，
除 `committer-review.md` 外**必须**另写一份计数文件，二选一：

- **JSON**（推荐）`committer_review.json`：
  ```json
  {
    "issue_count": 0,
    "issues": []
  }
  ```
  有问题时 `issue_count` 为**严重问题数**（🔴），`issues[]` 每项含 `id/file/dimension/desc/suggestion`。
  gate 契约：`issue_count == 0` 或 `issues` 为空数组 → 放行；非零/缺失/无计数字段 → FAIL。
- **文本** `committer_review.txt`：单独一行 `review_issue_count=0`（有问题则写实际数目）。

**门控口径**：只把 🔴 **严重问题**计入 `issue_count`（🟡 建议改进不阻断上库，但必须写进 Markdown 报告供人工 consent 复核）。
**报告要求**：不管出多少问题，全部错误 + 已完成的修改都写进 `committer-review.md`；计数文件只承载确定性判定所需的数字。

---

## 产出物

- **Markdown 报告**：`{DOCS_REPO}/docs/{date}-{feature}-committer-review.md`
- **计数文件（模式 C 必产）**：与报告同目录的 `committer_review.json`（或 `committer_review.txt`）。

## Subagent 回复格式

```
✅ committer-review 完成
📄 报告：{file_path}
🔢 计数文件：{committer_review.json 路径}（issue_count={N}）
📊 检视结果：
- 严重问题：{N} 个
- 建议改进：{N} 个
- 结论：{通过/有条件通过/不通过}
- 关键发现：{一句话概括最重要的问题}
```
