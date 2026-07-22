---
name: ohos-env-setup
description: 在一台全新的 Ubuntu/WSL2 机器上从零复现 OpenHarmony 全量源码编译环境（apt 依赖 + git/repo + repo sync + prebuilts 工具链 + oh_venv）。当用户说"换电脑装 OHOS 编译环境""重装 ohos 环境""从零搭 openharmony 编译环境""导出/复现编译环境"时触发。
---

# OHOS 编译环境重装（换机复现）

在**全新 Ubuntu 22.04/24.04 或 WSL2（x86_64）**上，从零复现 OpenHarmony 全量源码编译环境。

## 核心认知（先读）

OHOS 编译工具链（clang / gn / ninja / node / python / rustc / cmake / ohos-sdk）**几乎全部由源码树内的 `prebuilts/` 提供**，通过 `build/prebuilts_download.sh` 一键下载；该脚本还会**自动创建 `oh_venv` 并装好构建所需 pip 包**。

所以系统层面只需要：**少量 apt 依赖 + git/git-lfs + repo 工具**，其余交给脚本。**不要用系统 python/node 去编译**，也**不要 sudo 跑 build**。

## 环境基线（参考值，来自导出机）

| 项 | 值 |
|---|---|
| OS | Ubuntu 24.04 / WSL2 · x86_64 |
| 源码根 | `~/openharmony/code`（可改） |
| manifest | `git@gitcode.com:openharmony/manifest.git`，分支 `master` |
| 复现锚点 | manifest revision `ebe9aa61`（2026-07-13），需完全一致时 checkout |
| prebuilts | ~28G · `.repo` ~31G |

## 执行流程

优先直接运行打包脚本 `scripts/ohos_env_bootstrap.sh`（本 skill 目录内），它把下面 5 步串好了，且支持分阶段单跑：

```bash
bash <skill_dir>/scripts/ohos_env_bootstrap.sh            # 全流程 all
bash <skill_dir>/scripts/ohos_env_bootstrap.sh <stage>    # 单跑：apt|repo|sync|prebuilts|verify
bash <skill_dir>/scripts/ohos_env_bootstrap.sh --help     # 全部用法
# 常用变量：
#   CODE_DIR=~/openharmony/code   MANIFEST_REV=ebe9aa61（完全复现）
#   MANIFEST=https://gitcode.com/openharmony/manifest.git（HTTPS）
#   NPM_REGISTRY/PYPI_URL/TRUSTED_HOST（内网镜像）
#   SKIP_APT=1 / SKIP_SYNC=1 / SKIP_PREBUILTS=1（all 流程里跳过某段）
```

如需手工/分步，按序执行：

### 1. apt 依赖
优先跑打包脚本（候选探测式，自动跳过 24.04 已删的包 + libtinfo5 兜底 + PEP668 处理 + 全局 typescript）。手工装则用下面清单，**注意含整编必需的坑点项**：
```bash
sudo apt-get update && sudo apt-get install -y \
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
  gcc-multilib g++-multilib libc6-dev-i386 libc6-dev-amd64 lib32ncurses-dev lib32z1-dev lib32z-dev \
  autoconf automake libtool libtool-bin cmake
sudo locale-gen "en_US.UTF-8"
```
**整编 rk3568 必需、易漏的坑点（缺→真实报错）**：
- `python3-venv` → oh_venv 建不出来
- `autoconf automake libtool libtool-bin` → `autoreconf: command not found`（Code 3000）
- `cmake` → libtiff 报 `cmake: command not found`（Code 4000）
- `gcc-multilib g++-multilib libc6-dev-i386 libc6-dev-amd64` → 32 位链接错
- `pkg-config` → configure 硬依赖

**libtinfo5 兜底**（24.04 已删，MinGW clang++ 运行时硬依赖 `libtinfo.so.5`，缺→Code 4000）：
```bash
cd /tmp && wget http://archive.ubuntu.com/ubuntu/pool/universe/n/ncurses/libtinfo5_6.3-2ubuntu0.1_amd64.deb && sudo dpkg -i libtinfo5_*.deb
```
**另两个 24.04 补丁**：`sudo mv /usr/lib/python3.12/EXTERNALLY-MANAGED{,.bak}`（解 PEP668）；`sudo npm install -g typescript`。

### 2. git / git-lfs / repo
> **安装者需自备（脚本不代填）**：① 你本人的 git user.name/email；② gitcode 拉码凭据——SSH（gitcode 账号 + 本机 SSH key 加到 gitcode）或 HTTPS（用户名 + Access Token，manifest 改用 `https://gitcode.com/...`）。运行 skill 时应提示用户先确认这些。
```bash
git config --global user.name "<安装者本人>" && git config --global user.email "<安装者邮箱>"
git lfs install
mkdir -p ~/bin && curl -fsSL https://gitee.com/oschina/repo/raw/fork_flow/repo-py3 > ~/bin/repo
chmod +x ~/bin/repo && echo 'export PATH=$HOME/bin:$PATH' >> ~/.bashrc && source ~/.bashrc
```

### 3. repo init + sync
> **先清代理**（GitCode 拉取失败头号原因）：`unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY no_proxy NO_PROXY GIT_PROXY git_proxy 2>/dev/null`
> **磁盘 ≥200GB**（源码+LFS+prebuilts+out）。
```bash
mkdir -p ~/openharmony/code && cd ~/openharmony/code
repo init -u git@gitcode.com:openharmony/manifest.git -b master --no-repo-verify
# 无 SSH key 用 https://gitcode.com/openharmony/manifest.git（输密码处粘 Access Token）
repo sync -c --no-tag -j8
repo forall -c 'git lfs pull'
```
- 完全复现：sync 后 `cd .repo/manifests && git checkout ebe9aa61 && cd - && repo sync -c --no-tag -j8`。
- **发行版/LTS 分支**：别手写猜 `-b`，去官方 Release Notes 页复制该版本的完整 repo init 命令。
- **某子仓 sync 失败**：`rm -rf <失败子仓路径>` 后重跑 sync（断点续传）。
- **丢弃本地改动**（⚠️破坏性）：`repo forall -c 'git reset --hard && git clean -fd'`。

### 4. prebuilts 工具链 + oh_venv（关键一步）
```bash
cd ~/openharmony/code && ./build/prebuilts_download.sh
# 内网走镜像（优先，比 --skip-ssl 安全）：
#   --npm-registry https://registry.npmmirror.com \
#   --pypi-url https://repo.huaweicloud.com/repository/pypi/simple --trusted-host repo.huaweicloud.com
# CI 无 TTY 加 --disable-rich
```

### 5. 验证
```bash
cd ~/openharmony/code && ./build.sh --help
ls prebuilts/clang/ohos/linux-x86_64/llvm/bin/clang
cat oh_venv/pyvenv.cfg   # home 指向 prebuilts/python/.../3.12.10
```

## 排障速查

| 现象 | 处理 |
|---|---|
| repo init/sync 一直失败 | 先清代理（见上）；降 `-j4`；换 https manifest |
| 某子仓 sync 失败 | 删该子仓目录重跑（断点续传） |
| prebuilts 证书报错 | 优先 `--pypi-url/--npm-registry/--trusted-host` 走镜像；`--skip-ssl` 最后手段 |
| 缺 libtinfo5 (Code 4000) | 从 jammy 池装 .deb（见上），非换 libtinfo6 |
| autoreconf/cmake not found | 补 autoconf/automake/libtool/cmake |
| 32 位链接错 | `gcc-multilib g++-multilib libc6-dev-i386` |
| oh_venv 建不出/损坏 | 先装 python3-venv，删 `oh_venv/` 重跑 prebuilts_download.sh |
| git-lfs 是指针文件 | `repo forall -c 'git lfs pull'` |

## 官方文档速查
- 获取源码总述：https://gitcode.com/openharmony/docs/blob/master/zh-cn/device-dev/get-code/sourcecode-acquire.md
- 各版本 Release Notes（含各版本 repo init）：https://gitcode.com/openharmony/docs/blob/master/zh-cn/release-notes/Readme.md
- GitCode SSH 公钥帮助：https://docs.gitcode.com/docs/help/home/user_center/security_management/ssh

完整图文文档见本 skill 同目录 `reference.md`（自带，不依赖源码仓库）；拉码后源码树内亦有同份 `docs/OHOS_BUILD_ENV_SETUP.md`。
