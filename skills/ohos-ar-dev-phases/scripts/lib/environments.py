#!/usr/bin/env python3
# Copyright (c) 2026. Licensed under the Apache License, Version 2.0.
"""
environments.py — the SINGLE source of truth for environment-specific behavior.

The pipeline supports two development environments that differ in build command,
compile banners, artifact directory, product form, and upload backend:

  * "openharmony" — the original gitcode-based OpenHarmony flow on rk3568. Every
    value here is a VERBATIM copy of what used to be hardcoded in the gates
    (build cmd, =====build.*successful===== banner, out/rk3568, product rk3568,
    oh-gc/gitcode upload). Keeping them identical is what makes the environment
    refactor a zero-behavior-change for existing runs.

  * "harmonyos" — a HarmonyOS flow. Code is NOT downloaded and
    is NOT pushed to gitcode (no oh-gc); upload goes through Gerrit. HarmonyOS has
    two component kinds with DIFFERENT build commands:
      - "system" 系统组件
      - "chip"   芯片组件
    The build command / out_dir / product / banner for these are intentionally
    left as PLACEHOLDERS (UNSET). A gate that needs an unfilled value hard-fails
    with an actionable "fill this in environments.py" message rather than
    silently running the wrong command — the same fail-closed stance the rest of
    the pipeline takes.

Design contract: gates NEVER hardcode a build/upload string. They call the
accessor functions here with `state` (the loaded pipeline.json), and this module
resolves the right value from the profile registry. All accessors default a
missing `environment` to "openharmony" so pre-existing runs (whose pipeline.json
has no `environment` field) behave exactly as before.
"""
import re

# Sentinel for a profile value that must be filled in before the environment can
# be used. `build_command()` etc. raise EnvironmentNotConfigured when they hit it.
UNSET = None

DEFAULT_ENVIRONMENT = "openharmony"
ENVIRONMENTS = ("openharmony", "harmonyos")
COMPONENT_TYPES = ("system", "chip")  # HarmonyOS only

# Compile banners. OpenHarmony's build.sh prints these to stdout (product name
# may be absent on early failure), so match loosely — verbatim from the gates.
_OHOS_SUCCESS_RE = r"=====build.*successful====="
_OHOS_ERROR_RE = r"=====build.*error====="

# HarmonyOS build_system.sh / build_vendor.sh banners: success matches the same
# "=====build ... successful=====" line, but FAILURE prints "=====do make ...
# error=====" (not "build ... error"), so HarmonyOS needs its own error regex.
_HMOS_SUCCESS_RE = r"=====build.*successful====="
_HMOS_ERROR_RE = r"=====do make.*error====="


class EnvironmentNotConfigured(RuntimeError):
    """Raised when a gate asks for an environment value that is still a
    placeholder (e.g. the HarmonyOS system/chip build command). Carries an
    actionable message naming the profile key and the file to edit."""


# ----------------------------------------------------------------------------
# Profile registry
#
# A profile is keyed by (environment, component_type). component_type is only
# meaningful for harmonyos; openharmony ignores it (single profile).
#
# Each profile provides:
#   product        developer_test -p value (also the out/<product> dir segment)
#   build_template a shell command with a "{target}" placeholder, or UNSET
#   out_dir        artifact/output dir relative to repo root, or UNSET
#   success_re     compile-success banner regex (str)
#   error_re       compile-error banner regex (str)
#   upload_backend "gitcode" | "gerrit"
#   arkts_*        ArkTS/Hypium app-test runner config (P5 kind==arkts branch).
#                  All three are UNSET placeholders: the real per-repo runner
#                  command (hap test build + hdc install + aa test / hypium) and
#                  its report root/glob must be filled before an arkts-kind
#                  contract can PASS P5. Until then the gate FAILs closed with a
#                  "configure environments.py" message — never a silent pass.
# ----------------------------------------------------------------------------
def _ohos_profile():
    return {
        "product": "rk3568",
        "build_template": "./build.sh --product-name rk3568 --ccache --build-target {target}",
        "out_dir": "out/rk3568",
        "success_re": _OHOS_SUCCESS_RE,
        "error_re": _OHOS_ERROR_RE,
        "upload_backend": "gitcode",
        # Paths (relative to repo root) that must ALL exist for the directory to
        # look like a valid source root for this environment. Verbatim from the
        # old hardcoded P0 check.
        "root_markers": ["build.sh", "test/testfwk/developer_test"],
        "arkts_test_template": UNSET,  # TODO: hap 测试构建+安装+aa test/hypium runner
        "arkts_report_root": UNSET,    # TODO: runner 报告输出目录(相对 repo 根)
        "arkts_report_glob": UNSET,    # TODO: 每套件一个 JUnit XML 的 glob(相对报告根)
    }


def _harmonyos_profile(component_type):
    # HarmonyOS build commands. Two per-invocation variables:
    #   {device_type}  bound to the OHOS root (captured at init as --device-type,
    #                  stored in state["device_type"]; rarely changes per repo).
    #   {target}       the GN build target (state["build_target"], per AR).
    # out_dir / product are still placeholders (UNSET) — fill when known; gates
    # that need them hard-fail with a "configure environments.py" message until
    # then. root_markers likewise UNSET until the HarmonyOS layout is confirmed.
    #
    # 系统组件 (system):
    #   ./build_system.sh --abi-type generic_generic_arm_64only
    #     --device-type <type> --ccache --build-target <target>
    #     --build-variant root -ninja-args=-j30
    # 芯片组件 (chip):
    #   ./build_vendor.sh --abi-type generic_generic_arm_64only
    #     --device-type <chip_product> --ccache --build-variant user
    #     --gn-args uefi_enable=true --gn-args USE_HM_KERNEL=true
    #     --gn-args singleap=true --build-target <target> --root-perf-main root
    # (--gn-atgs in the original spec was a typo, corrected to --gn-args here;
    #  -ninja-args stays single-dash, verbatim.)
    return {
        "system": {
            "product": UNSET,        # TODO: HarmonyOS 系统组件 product form
            "build_template": (
                "./build_system.sh --abi-type generic_generic_arm_64only "
                "--device-type {device_type} --ccache --build-target {target} "
                "--build-variant root -ninja-args=-j30"),
            "out_dir": UNSET,         # TODO: 系统组件 产物目录
            "success_re": _HMOS_SUCCESS_RE,
            "error_re": _HMOS_ERROR_RE,
            "upload_backend": "gerrit",
            "root_markers": UNSET,    # TODO: 系统组件 源码根标志(相对路径列表)
            "arkts_test_template": UNSET,
            "arkts_report_root": UNSET,
            "arkts_report_glob": UNSET,
        },
        "chip": {
            "product": UNSET,        # TODO: HarmonyOS 芯片组件 product form
            "build_template": (
                "./build_vendor.sh --abi-type generic_generic_arm_64only "
                "--device-type {device_type} --ccache --build-variant user "
                "--gn-args uefi_enable=true --gn-args USE_HM_KERNEL=true "
                "--gn-args singleap=true --build-target {target} "
                "--root-perf-main root"),
            "out_dir": UNSET,         # TODO: 芯片组件 产物目录
            "success_re": _HMOS_SUCCESS_RE,
            "error_re": _HMOS_ERROR_RE,
            "upload_backend": "gerrit",
            "root_markers": UNSET,    # TODO: 芯片组件 源码根标志(相对路径列表)
            "arkts_test_template": UNSET,
            "arkts_report_root": UNSET,
            "arkts_report_glob": UNSET,
        },
    }[component_type]


def _profile(state):
    env = env_id(state)
    if env == "openharmony":
        return _ohos_profile()
    ctype = component_type(state)
    if ctype not in COMPONENT_TYPES:
        raise EnvironmentNotConfigured(
            "environment=harmonyos requires component_type in %s, got %r.\n"
            "  Re-run `advance.py init` with --component-type system|chip."
            % (list(COMPONENT_TYPES), ctype))
    return _harmonyos_profile(ctype)


# ----------------------------------------------------------------------------
# accessors — the only surface gates call
# ----------------------------------------------------------------------------
def env_id(state):
    """Environment id, defaulting a missing field to openharmony so existing
    runs (no `environment` in pipeline.json) behave exactly as before."""
    env = (state or {}).get("environment") or DEFAULT_ENVIRONMENT
    if env not in ENVIRONMENTS:
        raise EnvironmentNotConfigured(
            "unknown environment %r (expected one of %s)"
            % (env, list(ENVIRONMENTS)))
    return env


def component_type(state):
    """HarmonyOS component kind ("system"|"chip"), or None for openharmony."""
    if env_id(state) != "harmonyos":
        return None
    return (state or {}).get("component_type")


def _require(value, state, what):
    if value is UNSET:
        env = env_id(state)
        ctype = component_type(state)
        label = "%s%s" % (env, "/%s" % ctype if ctype else "")
        raise EnvironmentNotConfigured(
            "环境 %s 的 %s 尚未配置（占位未填）。\n"
            "  请在 skills/ohos-ar-dev-phases/scripts/lib/environments.py 的 "
            "profile 里填充 %r，然后重跑本门控。" % (label, what, what))
    return value


def product_form(state):
    """developer_test -p product (also the out/<product> segment)."""
    return _require(_profile(state)["product"], state, "product")


def build_command(state, target):
    """Full shell build command for the given GN target. Hard-fails (raises
    EnvironmentNotConfigured) when the environment's build template is still a
    placeholder — the gate catches it and emits a fail-closed message.

    Templates may reference {target} and {device_type}. device_type is bound to
    the source root (captured at init as --device-type, stored in
    state["device_type"]); a template that needs it while state has none
    hard-fails rather than emitting a command with an empty --device-type."""
    tmpl = _require(_profile(state)["build_template"], state, "build_template")
    fields = {"target": target}
    if "{device_type}" in tmpl:
        dt = (state or {}).get("device_type")
        if not dt:
            raise EnvironmentNotConfigured(
                "环境 %s 的编译命令需要 --device-type,但 state 里没有 device_type。\n"
                "  请在 `advance.py init` 时用 --device-type <type> 指定"
                "(它与当前源码根绑定,一般不变),然后重跑本门控。"
                % env_id(state))
        fields["device_type"] = dt
    return tmpl.format(**fields)


def out_dir(state):
    """Artifact/output directory relative to repo root (e.g. 'out/rk3568')."""
    return _require(_profile(state)["out_dir"], state, "out_dir")


def success_re(state):
    """Compiled regex matching the build-success banner."""
    return re.compile(_profile(state)["success_re"])


def error_re(state):
    """Compiled regex matching the build-error banner."""
    return re.compile(_profile(state)["error_re"])


def upload_backend(state):
    """Which P8 upload backend this environment uses: 'gitcode' | 'gerrit'."""
    return _profile(state)["upload_backend"]


def root_markers(state):
    """Relative paths that must ALL exist under the repo root for the directory
    to look like a valid source root for this environment. Hard-fails (raises
    EnvironmentNotConfigured) when the environment's markers are still a
    placeholder — the caller (P0) catches it and emits a fail-closed 'configure
    environments.py' message rather than guessing a HarmonyOS layout."""
    return _require(_profile(state).get("root_markers", UNSET),
                    state, "root_markers")


def arkts_test_command(state, suite):
    """Full shell command that builds + installs + runs the ArkTS/Hypium app
    tests for a kind==arkts contract (P5 branch). May reference {suite} (a
    Hypium describe name). The profile value is a placeholder (UNSET) until the
    owning environment fills in the real runner — the gate FAILs closed with
    this "configure environments.py" message rather than silently passing an
    ArkTS design without execution."""
    tmpl = _require(_profile(state)["arkts_test_template"], state, "arkts_test_template")
    return tmpl.format(suite=suite)


def arkts_report_root(state):
    """Absolute report root the ArkTS runner writes fresh JUnit XMLs into."""
    rel = _require(_profile(state)["arkts_report_root"], state, "arkts_report_root")
    return rel


def arkts_report_glob(state):
    """Glob (relative to the arkts report root) matching one JUnit XML per
    Hypium suite — e.g. 'result/**/*.xml'."""
    return _require(_profile(state)["arkts_report_glob"], state, "arkts_report_glob")


def derive_product(environment, component_type_value):
    """Product form to persist at `init` time, BEFORE a full state dict exists.
    Returns the profile product or None when it is still a placeholder (the
    caller stores None and later gates resolve/hard-fail via product_form())."""
    fake_state = {"environment": environment, "component_type": component_type_value}
    try:
        return product_form(fake_state)
    except EnvironmentNotConfigured:
        return None
