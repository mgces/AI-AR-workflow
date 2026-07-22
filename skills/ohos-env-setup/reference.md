# OpenHarmony 编译环境安装文档（换机重装）

> 用途：在一台**全新的 Ubuntu / WSL2 机器**上，从零复现本机的 OHOS 全量源码编译环境。
> 本机快照：Ubuntu 24.04.4 LTS · WSL2 · x86_64 · 源码根 `~/openharmony/code`

---

## 0. 环境事实（本机当前状态，供核对）

| 项 | 值 |
|---|---|
| 操作系统 | Ubuntu 24.04.4 LTS (Noble) on WSL2 |
| 架构 | x86_64 |
| 源码根目录 | `~/openharmony/code` |
| repo 管理 | `repo` v1.0.3，manifest = `git@gitcode.com:openharmony/manifest.git`，分支 `master` |
| manifest revision | `ebe9aa61` (2026-07-13) — 换机若要**完全一致**可 checkout 此 commit |
| 系统 Python | 3.12.3 (仅用于 `repo`) |
| 构建 Python | `prebuilts/python/linux-x86/3.12.10`（由 prebuilts 下载，**不是**系统 python） |
| 构建 venv | `oh_venv/`（`prebuilts_download.sh` 自动创建，**无需手工装包**） |
| Node | `prebuilts/build-tools/common/nodejs`（prebuilts 提供，本机系统 node v22 无关） |
| 编译器 | `prebuilts/clang/ohos/linux-x86_64/llvm`、`prebuilts/gcc`、`prebuilts/rustc` |
| prebuilts 体积 | ~28G |
| `.repo` 体积 | ~31G（含全部 git 历史） |
| 磁盘需求 | **≥200GB 可用**（源码 + LFS + prebuilts + 编译 `out`，宁大勿小） |

**关键认知**：OHOS 的编译工具链（clang / gn / ninja / node / python / rust / cmake / SDK）**几乎全部由 `prebuilts/` 提供**，通过 `build/prebuilts_download.sh` 一键下载。你在系统里只需要装少量 apt 依赖 + `git` + `repo`，其余交给脚本。

---

## 0.1 官方文档速查（换机自查权威源）

| 用途 | 链接 |
|---|---|
| 获取源码总述（repo/镜像/GitHub） | https://gitcode.com/openharmony/docs/blob/master/zh-cn/device-dev/get-code/sourcecode-acquire.md |
| 快速入门：获取源码 + prebuilts | https://gitcode.com/openharmony/docs/blob/master/zh-cn/device-dev/quick-start/quickstart-pkg-sourcecode.md |
| 编译依赖大包（官方 Ubuntu 列表） | https://gitcode.com/openharmony/docs/blob/master/zh-cn/device-dev/quick-start/quickstart-pkg-install-package.md |
| 各版本 Release Notes（**含各版本 repo init 命令**） | https://gitcode.com/openharmony/docs/blob/master/zh-cn/release-notes/Readme.md |
| manifest 仓库 | https://gitcode.com/openharmony/manifest |
| GitCode SSH 公钥帮助 | https://docs.gitcode.com/docs/help/home/user_center/security_management/ssh |
| 华为云 OpenHarmony 版本包目录 | https://repo.huaweicloud.com/openharmony/os/ |

---

---

## 1. 安装步骤总览

```
① 装系统依赖 (apt)         → 第 2 节
② 装 git / git-lfs / repo → 第 3 节
③ repo init + repo sync   → 第 4 节   （拉源码，~数十 GB）
④ ./build/prebuilts_download.sh → 第 5 节  （拉工具链 + 建 oh_venv，~28G）
⑤ ./build.sh 验证         → 第 6 节
```

---

## 2. 系统依赖（apt）

以下清单 = 官方 `docs/docker/Dockerfile` 依赖 + Ubuntu 24.04 适配 + **整编 rk3568 实战倒逼补入的项**（这些在纯 Dockerfile 里没有，但不装整编必报错）。

> **推荐用脚本 `scripts/ohos_env_bootstrap.sh` 装**：它对每个包做 `apt-cache policy` **候选探测**，只装 24.04 源里存在的，避免个别删除的包导致整批 `apt install` 失败——比下面的手工 `apt install` 更稳。

```bash
sudo apt-get update
sudo apt-get install -y \
  apt-utils binutils binutils-dev bison flex bc build-essential make mtd-utils \
  u-boot-tools git git-core git-lfs zip unzip curl wget gcc g++ ca-certificates openssh-client \
  dosfstools mtools default-jre default-jdk scons perl openssl libssl-dev \
  cpio m4 ccache zlib1g-dev tar rsync liblz4-tool genext2fs texinfo ruby \
  device-tree-compiler e2fsprogs gnupg gnutls-bin gperf pkg-config \
  libffi-dev libelf-dev libdwarf-dev libxml2-dev libxml2-utils xsltproc \
  grsync xxd libglib2.0-dev libpixman-1-dev kmod squashfs-tools doxygen vim ssh locales libstdc++6 \
  python3 python3-pip python3-venv python3-setuptools python3-distutils python3-requests python-is-python3 \
  libx11-dev libgl1-mesa-dev x11proto-core-dev libxinerama-dev libxcursor-dev libxrandr-dev libxi-dev \
  libtinfo-dev libtinfo6 libncurses5-dev libncurses-dev libncursesw5-dev libncurses5 libncursesw5 \
  gcc-multilib g++-multilib libc6-dev-i386 libc6-dev-amd64 \
  lib32ncurses-dev lib32z1-dev lib32z-dev \
  autoconf automake libtool libtool-bin cmake

sudo locale-gen "en_US.UTF-8"
```

### 整编必需、但容易漏的关键项（实战报错对照）

| 包 | 缺了会怎样 |
|---|---|
| `python3-venv` | **`oh_venv` 建不出来**，`prebuilts_download.sh` 建 venv 失败 |
| `autoconf automake libtool libtool-bin` | GN gen 报 `autoreconf: command not found`（Code 3000，libnl/libtiff 的 autogen.sh） |
| `cmake` | ninja 编 libtiff 报 `cmake: command not found`（Code 4000） |
| `gcc-multilib g++-multilib libc6-dev-i386 libc6-dev-amd64` | 32 位/multilib 链接错误 |
| `pkg-config` | 多个 third_party 的 configure 硬依赖 |

### `libtinfo5` 兜底（24.04 已删该包，但必须有）

OHOS prebuilts 里的 **MinGW clang++ 运行时硬依赖 `libtinfo.so.5`**，缺了整编 mingw host 工具报 `libtinfo.so.5: cannot open shared object file`（Code 4000）。24.04 源已删 `libtinfo5`，从 22.04(jammy) 池装 .deb：

```bash
cd /tmp
wget http://archive.ubuntu.com/ubuntu/pool/universe/n/ncurses/libtinfo5_6.3-2ubuntu0.1_amd64.deb
sudo dpkg -i libtinfo5_*.deb
```

### 其它两个 24.04 补丁

```bash
# ① 让系统 pip 可直接装（PEP668 锁定），仅影响系统 python，构建用 oh_venv 不受影响
sudo mv /usr/lib/python3.12/EXTERNALLY-MANAGED /usr/lib/python3.12/EXTERNALLY-MANAGED.bak
# ② 部分 JS 工具链需要全局 typescript
sudo npm install -g typescript
```

> **相对官方 18.04 Dockerfile 已移除**：锁死的 `ruby=1:2.5.1`（改用 24.04 默认 ruby）、`python3.8`/`python2.7`、`libtinfo5`（改 jammy .deb 兜底）等。

---

## 3. git / git-lfs / repo

> **⚠️ 安装前你需要自行准备以下信息（因人而异，不随本文档提供）：**
> 1. **你自己的 git 身份**：用于 `git config user.name/user.email`，请填你本人的名字和邮箱。
> 2. **gitcode 账号 + 拉码凭据**，二选一：
>    - **SSH 方式（推荐）**：在 [gitcode.com](https://gitcode.com) 注册后，本机生成 SSH key
>      （`ssh-keygen -t ed25519 -C "你的邮箱"`），把 `~/.ssh/id_ed25519.pub` 内容添加到
>      gitcode「设置 → SSH 公钥」。之后可用 `git@gitcode.com:...` 地址。
>    - **HTTPS 方式**：用 gitcode 用户名 + **访问令牌（Access Token）**，改用
>      `https://gitcode.com/openharmony/manifest.git` 地址，首次拉取时输入。
> 3. 如在**企业内网**：还需公司提供的 **pip/npm/工具仓镜像地址**与证书策略（见第 5 节 `--skip-ssl`）。

```bash
# git 身份（换机必配，填安装者本人的信息）
git config --global user.name  "<安装者本人的名字>"
git config --global user.email "<安装者本人的邮箱>"
git config --global credential.helper store   # HTTPS 方式下缓存令牌

git lfs install

# repo 工具（gitcode/gitee 版）
mkdir -p ~/bin
curl https://gitee.com/oschina/repo/raw/fork_flow/repo-py3 > ~/bin/repo
chmod +x ~/bin/repo
echo 'export PATH=~/bin:$PATH' >> ~/.bashrc
source ~/.bashrc
```

---

## 4. 拉取源码（repo）

> **先清代理**（企业/系统代理是 GitCode 拉取失败的头号原因，每次 repo 操作前都清）：
> ```bash
> unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY no_proxy NO_PROXY GIT_PROXY git_proxy 2>/dev/null
> ```

```bash
mkdir -p ~/openharmony/code && cd ~/openharmony/code

# 与本机一致：manifest 来自 gitcode，分支 master
repo init -u git@gitcode.com:openharmony/manifest.git -b master --no-repo-verify
# 若无 SSH key，改用 https（提示输密码处粘贴 gitcode Access Token）：
#   repo init -u https://gitcode.com/openharmony/manifest.git -b master --no-repo-verify

repo sync -c --no-tag -j8   # -c 只同步当前分支；--no-tag 少拉 tag 省时省盘
repo forall -c 'git lfs pull'
```

> **要 100% 复现本机版本**：`repo sync` 后进入 `.repo/manifests` 执行
> `git checkout ebe9aa61` 再 `repo sync -c --no-tag -j8`，锁定到本机 manifest revision。

### 拉发行版 / LTS 分支（别手写猜 `-b`）

打开上面 Release Notes 索引 → 进入目标版本页 → **复制该页给出的完整 `repo init` 命令**（可能含 `-m default.xml`），在空目录执行，后续同样 `repo sync` → `git lfs pull` → `prebuilts_download.sh`。

### 单个子仓 sync 失败

从日志定位**失败子仓相对整树根的路径**，删掉后重跑（断点续传）：
```bash
rm -rf ~/openharmony/code/<失败子仓路径>
cd ~/openharmony/code && repo sync -c --no-tag -j8 && repo forall -c 'git lfs pull'
```

### 丢弃全部本地改动再同步（⚠️ 破坏性，仅在明确需要时）

```bash
repo forall -c 'git reset --hard && git clean -fd'   # 会清掉所有未提交改动
```

---

## 5. 下载 prebuilts 工具链（关键，一键）

这一步下载 clang/gn/ninja/node/python/rustc/cmake/ohos-sdk 等**全部工具链**，并**自动创建 `oh_venv` 并安装构建所需 pip 包**（`requests`/`cryptography`/`rich` 等，脚本内部完成，无需手工）。

```bash
cd ~/openharmony/code
./build/prebuilts_download.sh
```

常用参数：

| 参数 | 作用 |
|---|---|
| `--npm-registry <url>` | 指定 npm 镜像（内网），如 `https://registry.npmmirror.com` |
| `--pypi-url <url>` | 指定 pypi 镜像，如 `https://repo.huaweicloud.com/repository/pypi/simple` |
| `--trusted-host <host>` | pip trusted-host，如 `repo.huaweicloud.com` |
| `--disable-rich` | 禁用 rich 进度条（CI/无 TTY 环境） |
| `--tool-repo <url>` | 指定工具仓镜像 |
| `--skip-ssl` | 跳过 SSL 校验（**有安全风险，优先用上面的镜像参数**而非它） |

> **内网推荐**：用 `--npm-registry / --pypi-url / --trusted-host` 走公司镜像，**不要**随手 `--skip-ssl`。
> **venv 创建失败**提示：先确认装了 `python3-venv`（见 2 节），再删 `oh_venv/` 重跑。

完成后 `prebuilts/` 约 28G。校验：

```bash
ls prebuilts/clang/ohos/linux-x86_64/llvm/bin/clang
ls prebuilts/build-tools/common/nodejs
cat oh_venv/pyvenv.cfg          # home 应指向 prebuilts/python/.../3.12.10
```

---

## 6. 验证编译

```bash
cd ~/openharmony/code

# 轻量验证：查看帮助 / 列产品
./build.sh --help

# 实际构建示例（按你的目标产品替换）
# ./build.sh --product-name rk3568 --ccache
```

编译产物在 `out/`。

---

## 7. 常见坑

| 现象 | 处理 |
|---|---|
| `repo init/sync` 一直失败 | **先清代理**（见 4 节 unset）；加 `-j4` 降并发；网络差用 https manifest |
| `repo sync` 某子仓失败 | 删该子仓目录后重跑（见 4 节），断点续传 |
| 想丢弃本地改动重来 | `repo forall -c 'git reset --hard && git clean -fd'`（⚠️ 破坏性） |
| `prebuilts_download.sh` 证书报错 | 优先用 `--pypi-url/--npm-registry/--trusted-host` 走镜像；`--skip-ssl` 是最后手段 |
| Ubuntu 24.04 缺 `libtinfo5` | 从 jammy 池下 .deb 安装（见 2 节兜底），**不是**换 libtinfo6 |
| `autoreconf/cmake: command not found` | 缺 autotools/cmake，见 2 节关键项 |
| 32 位链接报错 | `sudo apt-get install gcc-multilib g++-multilib libc6-dev-i386` |
| `oh_venv` 建不出来 | 先装 `python3-venv`，再删 `oh_venv/` 重跑 prebuilts_download.sh |
| `oh_venv` 损坏 | 删掉 `oh_venv/` 重跑 `./build/prebuilts_download.sh` 会自动重建 |
| python 版本冲突 | 构建**不用**系统 python，用 prebuilts 内的；不要 `sudo` 跑 build |
| git-lfs 文件是指针 | `repo forall -c 'git lfs pull'` |

---

## 8. 一键脚本（复制即用）

见同目录 `scripts/ohos_env_bootstrap.sh`——把第 2–6 节全部自动化，且支持**分阶段单跑**。

```bash
bash scripts/ohos_env_bootstrap.sh            # 全流程 all（依赖→repo→sync→prebuilts→验证）
bash scripts/ohos_env_bootstrap.sh <stage>    # 只跑某段：apt | repo | sync | prebuilts | verify
bash scripts/ohos_env_bootstrap.sh --help     # 查看全部用法/环境变量
```

常用变量：`CODE_DIR`（源码根）、`MANIFEST_REV=ebe9aa61`（完全复现）、`MANIFEST=https://...`（HTTPS）、
`NPM_REGISTRY/PYPI_URL/TRUSTED_HOST`（内网镜像）、`SKIP_APT/SKIP_SYNC/SKIP_PREBUILTS=1`（all 流程里跳过某段）。

或直接在 Claude Code 里执行 skill：`/ohos-env-setup`。
