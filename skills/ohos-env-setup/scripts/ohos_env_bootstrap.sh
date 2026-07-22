#!/usr/bin/env bash
# OpenHarmony 编译环境一键 bootstrap（换机重装）
# 目标：Ubuntu 22.04/24.04 或 WSL2 · x86_64
#
# 用法：
#   bash ohos_env_bootstrap.sh            # 全流程 all（装依赖 + repo + sync + prebuilts + 验证）
#   bash ohos_env_bootstrap.sh <stage>    # 只跑某阶段
#     stage ∈ apt | repo | sync | prebuilts | verify | all
#   CODE_DIR=~/oh SKIP_SYNC=1 bash ohos_env_bootstrap.sh   # all 流程里按开关跳过某段
#
# 环境变量：
#   CODE_DIR   源码根目录（默认 ~/openharmony/code）
#   MANIFEST   manifest 仓库（默认 git@gitcode.com:openharmony/manifest.git）
#              HTTPS 改用 https://gitcode.com/openharmony/manifest.git
#   BRANCH     manifest 分支（默认 master；发行版分支见文档，勿手写猜测）
#   MANIFEST_REV  可选：checkout 指定 manifest revision 以 100% 复现（如 ebe9aa61）
#   NPM_REGISTRY  可选：prebuilts 用的 npm 镜像（内网），如 https://registry.npmmirror.com
#   PYPI_URL      可选：prebuilts 用的 pypi 镜像，如 https://repo.huaweicloud.com/repository/pypi/simple
#   TRUSTED_HOST  可选：pip trusted-host，如 repo.huaweicloud.com
#   SKIP_APT=1 / SKIP_SYNC=1 / SKIP_PREBUILTS=1   仅在 all 流程里跳过对应阶段
#
# 磁盘：源码 + LFS + prebuilts + 编译 out，全量开发建议 ≥200GB 可用空间。

set -euo pipefail

CODE_DIR="${CODE_DIR:-$HOME/openharmony/code}"
MANIFEST="${MANIFEST:-git@gitcode.com:openharmony/manifest.git}"
BRANCH="${BRANCH:-master}"
MANIFEST_REV="${MANIFEST_REV:-}"

log()  { printf '\033[1;32m[oh-env]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[oh-env]\033[0m %s\n' "$*"; }
die()  { printf '\033[1;31m[oh-env]\033[0m %s\n' "$*" >&2; exit 1; }

# 清理代理（企业/系统代理是 GitCode 拉取失败头号原因；每次 repo 操作前清）
clear_proxy() {
  unset HTTP_PROXY HTTPS_PROXY http_proxy https_proxy ALL_PROXY \
        no_proxy NO_PROXY GIT_PROXY git_proxy 2>/dev/null || true
}

# 安装者需自备的信息提示（不代填）
print_prereq() {
  cat <<'EOF'
============================================================
 运行前请确认你已准备好以下信息（因人而异，脚本不代填）：
 1) 你自己的 git 身份：user.name / user.email（填你本人的）
    未配置时先执行：
      git config --global user.name  "你的名字"
      git config --global user.email "你的邮箱"
 2) gitcode 拉码凭据，二选一：
    - SSH（推荐）：gitcode 账号 + 本机 SSH key 已加到 gitcode
      （ssh-keygen -t ed25519 -C "你的邮箱"，公钥加到 gitcode 设置）
      使用默认 MANIFEST（git@gitcode.com:...）即可。
    - HTTPS：gitcode 用户名 + 访问令牌(Access Token)，
      运行时加环境变量 MANIFEST=https://gitcode.com/openharmony/manifest.git
 3) 内网环境：pip/npm/工具仓镜像地址与证书策略（见 prebuilts 阶段参数）。
============================================================
EOF
  if ! git config --global user.name >/dev/null 2>&1 || ! git config --global user.email >/dev/null 2>&1; then
    warn "尚未配置全局 git user.name/user.email，请先自行配置后再拉码。"
  fi
}

# ---------- 阶段 apt：系统依赖（候选探测式，避免 24.04 删包导致整批失败） ----------
stage_apt() {
  log "stage apt：安装系统依赖"
  sudo apt-get update

  # 依赖清单：官方 OHOS 编译依赖 + 24.04 适配 + 整编 rk3568 实战倒逼补入的项。
  # 注释标注的是缺该包时的真实报错（来自真机整编经验）。
  local CANDIDATES=(
    # 基础工具
    apt-utils binutils binutils-dev bison flex bc build-essential make mtd-utils
    u-boot-tools git git-core git-lfs zip unzip curl wget gcc g++ ca-certificates openssh-client
    dosfstools mtools default-jre default-jdk scons perl openssl libssl-dev
    cpio m4 ccache zlib1g-dev tar rsync liblz4-tool genext2fs texinfo
    device-tree-compiler e2fsprogs gnupg gnutls-bin gperf pkg-config ruby
    libffi-dev libelf-dev libdwarf-dev libxml2-dev libxml2-utils xsltproc
    grsync xxd libglib2.0-dev libpixman-1-dev kmod squashfs-tools doxygen
    vim ssh locales libstdc++6
    # Python：python3-venv 是创建 oh_venv 的前提；缺它 prebuilts_download 建 venv 会失败
    python3 python3-pip python3-venv python3-setuptools python3-distutils python3-requests python-is-python3
    # X11 开发库（部分 host 工具/图形依赖）
    libx11-dev libgl1-mesa-dev x11proto-core-dev
    libxinerama-dev libxcursor-dev libxrandr-dev libxi-dev
    # ncurses / tinfo 家族（24.04 名称有变，多写几个由候选探测过滤）
    libtinfo-dev libtinfo6 libncurses5-dev libncurses-dev libncursesw5-dev
    libncurses5 libncursesw5
    # 32 位 / multilib：缺 → 32 位链接/编译报错
    gcc-multilib g++-multilib libc6-dev-i386 libc6-dev-amd64
    lib32ncurses-dev lib32ncurses5-dev lib32z1-dev lib32z-dev
    # autotools + cmake：整编 rk3568 时 third_party（libnl/libtiff…）install.sh 会跑
    # autoreconf/configure，libtiff 末尾直接调 cmake。
    # 缺 autoconf → GN gen 报 "autoreconf: command not found"(Code 3000)；
    # 缺 cmake   → ninja 编 libtiff 报 "cmake: command not found"(Code 4000)。
    autoconf automake libtool libtool-bin cmake
    # 文件系统工具 + 裸机 ARM 交叉器（官方清单项，rk3568 一般用不到，装上无害）
    jfsutils reiserfsprogs xfsprogs quota ppp pcmciautils gcc-arm-none-eabi
  )

  local avail=() miss=() p cand
  for p in "${CANDIDATES[@]}"; do
    cand=$(apt-cache policy "$p" 2>/dev/null | awk -F': ' '/Candidate:/{print $2}')
    if [ -n "$cand" ] && [ "$cand" != "(none)" ]; then avail+=("$p"); else miss+=("$p"); fi
  done
  log "可安装 ${#avail[@]} 个；源中缺失/跳过 ${#miss[@]} 个：${miss[*]:-无}"
  sudo apt-get install -y "${avail[@]}"
  sudo locale-gen "en_US.UTF-8" || true

  # libtinfo5 兜底：24.04 源已删该包，但 OHOS prebuilts 里 MinGW clang++ 运行时硬依赖
  # libtinfo.so.5（整编编 mingw host 工具时报 "libtinfo.so.5: cannot open shared object
  # file"，Code 4000）。从 Ubuntu 22.04(jammy) 池下 .deb 直接安装，仅依赖 libc6≥2.34。
  if ! ldconfig -p | grep -q 'libtinfo\.so\.5'; then
    log "libtinfo.so.5 缺失，从 jammy 池下载安装..."
    ( cd /tmp && rm -f libtinfo5_*.deb && \
      wget -q http://archive.ubuntu.com/ubuntu/pool/universe/n/ncurses/libtinfo5_6.3-2ubuntu0.1_amd64.deb && \
      sudo dpkg -i libtinfo5_*.deb ) && log "libtinfo5 安装成功" || warn "libtinfo5 安装失败，请手动处理"
  fi

  # 让系统 pip 可直接安装（24.04 默认 PEP668 锁定）。仅影响系统 python，构建用的是 oh_venv。
  if [ -f /usr/lib/python3.12/EXTERNALLY-MANAGED ]; then
    sudo mv /usr/lib/python3.12/EXTERNALLY-MANAGED /usr/lib/python3.12/EXTERNALLY-MANAGED.bak || true
  fi

  # 部分 JS 工具链需要全局 typescript
  command -v npm >/dev/null 2>&1 && sudo npm install -g typescript || warn "npm 不可用，跳过全局 typescript"
}

# ---------- 阶段 repo：git-lfs + repo 工具 + PATH ----------
stage_repo() {
  log "stage repo：git lfs + repo 工具"
  git lfs install || true
  if ! command -v repo >/dev/null 2>&1; then
    log "安装 repo 工具到 ~/bin/repo ..."
    mkdir -p "$HOME/bin"
    curl -fsSL https://gitee.com/oschina/repo/raw/fork_flow/repo-py3 > "$HOME/bin/repo"
    chmod +x "$HOME/bin/repo"
    if ! grep -q 'export PATH=.*\$HOME/bin' "$HOME/.bashrc" 2>/dev/null; then
      echo 'export PATH=$HOME/bin:$PATH' >> "$HOME/.bashrc"
    fi
    export PATH="$HOME/bin:$PATH"
  fi
  command -v repo >/dev/null || warn "repo 未在 PATH，请 source ~/.bashrc 后重跑"
}

# ---------- 阶段 sync：repo init + sync + lfs pull ----------
stage_sync() {
  clear_proxy   # 清代理，避免 GitCode 拉取失败
  command -v repo >/dev/null || die "repo 未安装，请先跑 stage repo"
  log "stage sync：初始化源码于 $CODE_DIR (manifest=$MANIFEST branch=$BRANCH)"
  mkdir -p "$CODE_DIR"
  cd "$CODE_DIR"
  if [[ -d .repo ]]; then
    log ".repo 已存在，跳过 repo init"
  else
    repo init -u "$MANIFEST" -b "$BRANCH" --no-repo-verify
  fi
  if [[ -n "$MANIFEST_REV" ]]; then
    log "锁定 manifest revision = $MANIFEST_REV"
    ( cd .repo/manifests && git checkout "$MANIFEST_REV" )
  fi
  log "repo sync（可能耗时数十分钟，~85G）..."
  repo sync -c --no-tag -j8
  repo forall -c 'git lfs pull' || true
  # 提示：若某个子仓 sync 失败，删掉该子仓目录后重跑本阶段即可断点续传：
  #   rm -rf "$CODE_DIR/<失败子仓相对路径>" && bash "$0" sync
}

# ---------- 阶段 prebuilts：工具链 + oh_venv ----------
stage_prebuilts() {
  clear_proxy
  [[ -d "$CODE_DIR" ]] || die "源码目录不存在：$CODE_DIR（先跑 stage sync）"
  cd "$CODE_DIR"
  [[ -x ./build/prebuilts_download.sh ]] || die "未找到 build/prebuilts_download.sh，请确认 repo sync 已完成"
  local pb_args=()
  [[ -n "${NPM_REGISTRY:-}" ]] && pb_args+=(--npm-registry "$NPM_REGISTRY")
  [[ -n "${PYPI_URL:-}" ]]     && pb_args+=(--pypi-url "$PYPI_URL")
  [[ -n "${TRUSTED_HOST:-}" ]] && pb_args+=(--trusted-host "$TRUSTED_HOST")
  log "stage prebuilts：下载工具链（~28G，自动建 oh_venv）... ${pb_args[*]:-}"
  ./build/prebuilts_download.sh "${pb_args[@]}"
}

# ---------- 阶段 verify：校验关键产物 ----------
stage_verify() {
  log "stage verify：校验环境"
  cd "$CODE_DIR"
  local ok=1
  [[ -x prebuilts/clang/ohos/linux-x86_64/llvm/bin/clang ]] || { warn "缺 clang（prebuilts 未完成？）"; ok=0; }
  [[ -d prebuilts/build-tools/common/nodejs ]] || { warn "缺 nodejs"; ok=0; }
  [[ -f oh_venv/pyvenv.cfg ]] || { warn "缺 oh_venv"; ok=0; }
  [[ -x build.sh ]] && ./build.sh --help >/dev/null 2>&1 && log "build.sh 可运行" || warn "build.sh --help 未通过"
  [[ $ok -eq 1 ]] && log "验证通过" || warn "验证有缺项，见上"
}

# ---------- all：按 SKIP_* 开关串起全流程 ----------
run_all() {
  [[ "${SKIP_APT:-0}" == "1" ]] && warn "SKIP_APT=1，跳过 apt" || stage_apt
  stage_repo
  [[ "${SKIP_SYNC:-0}" == "1" ]] && warn "SKIP_SYNC=1，跳过 sync" || stage_sync
  [[ "${SKIP_PREBUILTS:-0}" == "1" ]] && warn "SKIP_PREBUILTS=1，跳过 prebuilts" || stage_prebuilts
  stage_verify
  log "完成。验证：cd $CODE_DIR && ./build.sh --help"
}

# ---------- 入口 ----------
print_prereq
case "${1:-all}" in
  apt)        stage_apt ;;
  repo)       stage_repo ;;
  sync)       stage_repo; stage_sync ;;
  prebuilts)  stage_prebuilts ;;
  verify)     stage_verify ;;
  all)        run_all ;;
  -h|--help)  grep -E '^#( |$)' "$0" | sed 's/^# \{0,1\}//' ;;
  *) die "未知阶段: $1（可选: apt|repo|sync|prebuilts|verify|all）" ;;
esac
