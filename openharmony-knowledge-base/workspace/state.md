# 当前工作树状态

## 总览

生成快照显示：

```text
512 projects
511 detached HEAD
12 dirty projects
1 named branch: base/hiviewdfx/hiview/thread-leak-detector-plugin
```

Hiview 功能分支工作树本身是 clean。知识库文件位于工作区根 `specs/`，不属于 512 个 Git 子仓中的任何一个。

完整状态见 [projects.tsv](../generated/projects.tsv)。

## 脏子仓分类

### Git LFS 实体被暂存

以下仓的 Git HEAD 保存约 128~133 字节 LFS pointer，但 index 被替换为完整二进制并已暂存：

| 仓 | 暂存文件数 | 内容 |
| --- | ---: | --- |
| `applications/standard/app_samples` | 10 | 音频、图片、GIF 示例资源 |
| `foundation/multimedia/av_codec` | 25 | 编解码/解封装测试媒体 |
| `foundation/multimedia/image_framework` | 4 | 图片/XMP/DNG 测试资源 |
| `test/xts/acts` | 15 | 音频和图片兼容性测试资源 |

合计 54 个大文件。它们不是普通内容修改，而是 pointer -> 实体的 index 形态变化。若直接提交，会把大量二进制写入 Git 历史并绕过预期 LFS 形式。

### Git LFS pointer 覆盖实体

`third_party/vk-gl-cts` 有 73 个未暂存文件从实际源码/用例内容变成三行 LFS pointer，例如：

```text
version https://git-lfs.github.com/spec/v1
oid sha256:...
size ...
```

统计 diff 约为 219 additions / 264,782 deletions。这不是正常的大规模删码，应视为 LFS checkout/smudge 状态异常。

### Node 依赖安装产物

| 仓 | 状态 |
| --- | --- |
| `arkcompiler/ets_frontend` | 3 个 package-lock 修改，`legacy_bin/api8/node_modules/` 未跟踪 |
| `arkcompiler/runtime_core` | `declgen_ts2sts/package-lock.json` 修改 |
| `developtools/ace_js2bundle` | `ace-loader/package-lock.json` 修改 |

这些修改可能来自 Node/npm 版本差异、重新解析依赖或安装脚本。提交前必须确认 lockfile version、registry、resolved/integrity 变化是否预期。

### 测试运行和设备配置

`test/testfwk/developer_test`：

- `config/user_config.xml` 写入了具体 IP、端口和设备序列号。
- `reports/` 和多处 `__pycache__/` 未跟踪。

`test/testfwk/xdevice`：

- 5 个 Vue/Element Plus/Mitt 静态资源未跟踪，可能由报告前端资源准备流程生成。

这类文件包含环境绑定信息和测试产物，不应作为通用代码提交。

### 第三方生成/同步内容

`third_party/freetype`：未跟踪 `include/` 目录，包含 Freetype 和 dlg 头文件，形态更接近构建/同步产物。

### 真实源码修改

`third_party/iptables` 有 3 处 C 源码变更：

```diff
-#include <linux/if_ether.h>
+#include <netinet/if_ether.h>
```

涉及：

- `extensions/libipt_CLUSTERIP.c`
- `extensions/libipt_realm.c`
- `extensions/libxt_mac.c`

这是当前除 Hiview 已提交分支外最明确的未提交源码修改，可能用于 libc/头文件兼容。它没有对应测试或说明，知识库不判断其是否应保留。

## 风险判断

| 风险 | 级别 | 原因 |
| --- | --- | --- |
| 误提交 54 个 LFS 实体 | 高 | 大体积二进制进入 Git 历史 |
| 误提交 vk-gl-cts pointer 替换 | 高 | 等价删除大量实际源码/用例内容 |
| 批量清理脏仓 | 高 | 可能删除用户真实 iptables 或 lockfile 修改 |
| 提交 developer_test 配置 | 中 | 泄露设备/IP 环境并污染共享配置 |
| 提交 package-lock | 中 | 可能引入工具链依赖漂移 |
| 保留大量报告/cache | 低到中 | 占空间、干扰状态和索引 |

## 操作原则

- 不执行全局 `repo forall -c 'git reset --hard'` 或 `git clean -fdx`。
- 不把所有 dirty project 当成一个功能变更提交。
- 对 LFS 仓先确认 `.gitattributes`、index 与工作树对象形态，再决定恢复方向。
- 对真实源码修改逐仓确认作者意图、构建目标和测试。
- 测试设备信息应使用本地配置或环境变量，不进入公共提交。
- 任何清理操作都应按仓、按文件列出影响范围后再执行。

## 当前功能分支

`base/hiviewdfx/hiview`：

```text
branch: thread-leak-detector-plugin
upstream: origin/thread-leak-detector-plugin
head: a6624f1d25522aac18c59c22746cbbc16335026e
worktree: clean
```

该分支新增线程泄漏检测插件，归属路径为：

```text
hiviewdfx -> hiview process -> reliability -> thread-leak-detector
```

[进入功能节点](../subsystems/hiviewdfx/processes/hiview/capabilities/reliability/features/thread-leak-detector/README.md)。

## 刷新状态

```bash
bash specs/knowledge-base/tools/generate-global-index.sh
awk -F '\t' 'NR == 1 || $5 > 0' specs/knowledge-base/generated/projects.tsv
```

刷新只读取并生成索引，不会修改各 Git 子仓；但它会覆盖 `specs/knowledge-base/generated/` 下的快照文件。
