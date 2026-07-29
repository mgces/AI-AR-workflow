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
# ----------------------------------------------------------------------------
def _ohos_profile():
    return {
        "product": "rk3568",
        "build_template": "./build.sh --product-name rk3568 --ccache --build-target {target}",
        "out_dir": "out/rk3568",
        "success_re": _OHOS_SUCCESS_RE,
        "error_re": _OHOS_ERROR_RE,
        "upload_backend": "gitcode",
    }


def _harmonyos_profile(component_type):
    # PLACEHOLDER profiles. Fill product / build_template / out_dir (and adjust
    # the banner regexes if the internal build prints different banners) for each
    # component kind, then remove the UNSET sentinels. Until then any gate that
    # needs the build command hard-fails with a clear "configure this" message.
    #
    # TODO(harmonyos): fill the real 系统组件 / 芯片组件 build commands here.
    return {
        "system": {
            "product": UNSET,        # TODO: HarmonyOS 系统组件 product form
            "build_template": UNSET,  # TODO: 系统组件 编译命令，含 {target}
            "out_dir": UNSET,         # TODO: 系统组件 产物目录
            "success_re": _OHOS_SUCCESS_RE,  # TODO: 若 HarmonyOS build 横幅不同则改
            "error_re": _OHOS_ERROR_RE,
            "upload_backend": "gerrit",
        },
        "chip": {
            "product": UNSET,        # TODO: HarmonyOS 芯片组件 product form
            "build_template": UNSET,  # TODO: 芯片组件 编译命令，含 {target}
            "out_dir": UNSET,         # TODO: 芯片组件 产物目录
            "success_re": _OHOS_SUCCESS_RE,  # TODO: 若 HarmonyOS build 横幅不同则改
            "error_re": _OHOS_ERROR_RE,
            "upload_backend": "gerrit",
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
    placeholder — the gate catches it and emits a fail-closed message."""
    tmpl = _require(_profile(state)["build_template"], state, "build_template")
    return tmpl.format(target=target)


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


def derive_product(environment, component_type_value):
    """Product form to persist at `init` time, BEFORE a full state dict exists.
    Returns the profile product or None when it is still a placeholder (the
    caller stores None and later gates resolve/hard-fail via product_form())."""
    fake_state = {"environment": environment, "component_type": component_type_value}
    try:
        return product_form(fake_state)
    except EnvironmentNotConfigured:
        return None
