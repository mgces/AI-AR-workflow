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
import copy
import hashlib
import json
import os
import re
import shlex

# Sentinel for a profile value that must be filled in before the environment can
# be used. `build_command()` etc. raise EnvironmentNotConfigured when they hit it.
UNSET = None

DEFAULT_ENVIRONMENT = "openharmony"
ENVIRONMENTS = ("openharmony", "harmonyos")
COMPONENT_TYPES = ("system", "chip")  # HarmonyOS only
PROFILE_FILE_ENV = "OHOS_ENV_PROFILE_FILE"
_GERRIT_TEMPLATE_FIELDS = frozenset(("base", "project", "change_id", "sha", "topic"))
_GERRIT_PROJECT_RE = re.compile(r"[A-Za-z0-9._-]+(?:/[A-Za-z0-9._-]+)+")
_GERRIT_REMOTE_RE = re.compile(r"[A-Za-z0-9._-]{1,128}")
_GERRIT_CHANGE_RE = re.compile(r"[A-Za-z0-9._:-]{1,256}")
_GERRIT_SHA_RE = re.compile(r"[0-9a-fA-F]{40}")

# Compile banners. The profile-selected build entry prints these to stdout (the
# OpenHarmony default is build.sh; other environments may use another entry).
# Product name may be absent on early failure, so match loosely — verbatim from
# the gates.
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
        "build_entry": "build.sh",
        "test_framework_path": "test/testfwk/developer_test/start.sh",
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
        "gerrit_remote": UNSET,
        "gerrit_project": UNSET,
        "gerrit_push_ref": UNSET,
        "gerrit_query_command": UNSET,
        "gerrit_change_url": UNSET,
        "gerrit_green_labels": UNSET,
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
            "build_entry": "build_system.sh",
            "test_framework_path": UNSET,
            "success_re": _HMOS_SUCCESS_RE,
            "error_re": _HMOS_ERROR_RE,
            "upload_backend": "gerrit",
            "root_markers": UNSET,    # TODO: 系统组件 源码根标志(相对路径列表)
            "arkts_test_template": UNSET,
            "arkts_report_root": UNSET,
            "arkts_report_glob": UNSET,
            "gerrit_remote": UNSET,
            "gerrit_project": UNSET,
            "gerrit_push_ref": UNSET,
            "gerrit_query_command": UNSET,
            "gerrit_change_url": UNSET,
            "gerrit_green_labels": UNSET,
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
            "build_entry": "build_vendor.sh",
            "test_framework_path": UNSET,
            "success_re": _HMOS_SUCCESS_RE,
            "error_re": _HMOS_ERROR_RE,
            "upload_backend": "gerrit",
            "root_markers": UNSET,    # TODO: 芯片组件 源码根标志(相对路径列表)
            "arkts_test_template": UNSET,
            "arkts_report_root": UNSET,
            "arkts_report_glob": UNSET,
            "gerrit_remote": UNSET,
            "gerrit_project": UNSET,
            "gerrit_push_ref": UNSET,
            "gerrit_query_command": UNSET,
            "gerrit_change_url": UNSET,
            "gerrit_green_labels": UNSET,
        },
    }[component_type]


def _profile_key(state):
    env = env_id(state)
    return env if env == "openharmony" else "%s/%s" % (env, component_type(state))


def _validate_override(key, value):
    if not isinstance(value, dict) or not value:
        raise EnvironmentNotConfigured(
            "环境 profile %s 必须是非空 JSON 对象" % key)
    allowed = {
        "product", "build_template", "build_entry", "out_dir", "success_re",
    "error_re", "upload_backend", "root_markers", "test_framework_path",
        "arkts_test_template", "arkts_report_root", "arkts_report_glob",
        "gerrit_remote", "gerrit_project", "gerrit_push_ref",
        "gerrit_query_command", "gerrit_change_url", "gerrit_green_labels",
    }
    unknown = sorted(set(value) - allowed)
    if unknown:
        raise EnvironmentNotConfigured(
            "环境 profile %s 包含不支持的字段: %s" % (key, ", ".join(unknown)))
    result = copy.deepcopy(value)
    for field in ("product", "build_template", "build_entry", "success_re", "error_re",
                  "test_framework_path", "arkts_test_template", "arkts_report_root",
                  "arkts_report_glob", "gerrit_remote", "gerrit_project",
                  "gerrit_push_ref", "gerrit_change_url"):
        if field not in result or result[field] is None:
            continue
        if not isinstance(result[field], str) or not result[field].strip() or "\0" in result[field] or "\n" in result[field] or "\r" in result[field]:
            raise EnvironmentNotConfigured(
                "环境 profile %s 的 %s 必须是无换行字符串" % (key, field))
    if "product" in result and result["product"] is not None and not re.fullmatch(r"[A-Za-z0-9._-]{1,128}", result["product"]):
        raise EnvironmentNotConfigured("环境 profile %s 的 product 不安全" % key)
    if "build_entry" in result and result["build_entry"] is not None and not re.fullmatch(r"[A-Za-z0-9._-]{1,128}", result["build_entry"]):
        raise EnvironmentNotConfigured("环境 profile %s 的 build_entry 不安全" % key)
    for field in ("out_dir", "test_framework_path", "arkts_report_root"):
        path = result.get(field)
        if path is not None and (path.startswith(("/", "\\")) or "\\" in path or path == ".." or path.startswith("../") or "/../" in path):
            raise EnvironmentNotConfigured("环境 profile %s 的 %s 必须是工作区内相对路径" % (key, field))
    if "root_markers" in result:
        markers = result["root_markers"]
        if not isinstance(markers, list) or not markers or len(markers) > 64:
            raise EnvironmentNotConfigured("环境 profile %s 的 root_markers 必须是非空数组" % key)
        for marker in markers:
            if not isinstance(marker, str) or not marker or marker.startswith(("/", "\\")) or "\\" in marker or marker == ".." or marker.startswith("../") or "/../" in marker or "\0" in marker or "\n" in marker or "\r" in marker:
                raise EnvironmentNotConfigured("环境 profile %s 的 root_markers 含越界路径" % key)
    if "upload_backend" in result and result["upload_backend"] not in ("gitcode", "gerrit"):
        raise EnvironmentNotConfigured("环境 profile %s 的 upload_backend 必须为 gitcode 或 gerrit" % key)
    if "gerrit_remote" in result and result["gerrit_remote"] is not None \
            and not _GERRIT_REMOTE_RE.fullmatch(result["gerrit_remote"]):
        raise EnvironmentNotConfigured("环境 profile %s 的 gerrit_remote 不安全" % key)
    if "gerrit_project" in result and result["gerrit_project"] is not None \
            and not _GERRIT_PROJECT_RE.fullmatch(result["gerrit_project"]):
        raise EnvironmentNotConfigured("环境 profile %s 的 gerrit_project 不安全" % key)
    if "gerrit_push_ref" in result and result["gerrit_push_ref"] is not None:
        push_ref = result["gerrit_push_ref"]
        fields = set(re.findall(r"\{([A-Za-z0-9_]+)\}", push_ref))
        if fields - {"base", "topic"} or "{base}" not in push_ref \
                or not push_ref.startswith("HEAD:refs/for/"):
            raise EnvironmentNotConfigured(
                "环境 profile %s 的 gerrit_push_ref 必须是 HEAD:refs/for/{base} 模板" % key)
    if "gerrit_query_command" in result and result["gerrit_query_command"] is not None:
        command = result["gerrit_query_command"]
        if (not isinstance(command, list) or not command or len(command) > 64
                or any(not isinstance(item, str) or not item.strip() or len(item) > 4096
                       or "\0" in item or "\n" in item or "\r" in item for item in command)):
            raise EnvironmentNotConfigured(
                "环境 profile %s 的 gerrit_query_command 必须是非空 argv 数组" % key)
        fields = set()
        for item in command:
            fields.update(re.findall(r"\{([A-Za-z0-9_]+)\}", item))
        unknown_fields = fields - _GERRIT_TEMPLATE_FIELDS
        if unknown_fields:
            raise EnvironmentNotConfigured(
                "环境 profile %s 的 gerrit_query_command 含未知模板字段: %s"
                % (key, ", ".join(sorted(unknown_fields))))
        first = command[0]
        if re.search(r"[;&|`$<>]", first) or (not os.path.isabs(first)
                                               and "/" in first):
            # A profile command may be a binary name or an absolute path; a
            # relative path is deliberately rejected because it depends on the
            # gate's current directory and can escape the reviewed toolchain.
            raise EnvironmentNotConfigured(
                "环境 profile %s 的 gerrit_query_command 首项必须是命令名或绝对路径" % key)
    if "gerrit_change_url" in result and result["gerrit_change_url"] is not None:
        fields = set(re.findall(r"\{([A-Za-z0-9_]+)\}", result["gerrit_change_url"]))
        if fields - {"project", "change_id"}:
            raise EnvironmentNotConfigured(
                "环境 profile %s 的 gerrit_change_url 含未知模板字段" % key)
    if "gerrit_green_labels" in result and result["gerrit_green_labels"] is not None:
        labels = result["gerrit_green_labels"]
        if (not isinstance(labels, dict) or not labels or len(labels) > 32
                or any(not isinstance(name, str) or not name.strip() or len(name) > 128
                       or not isinstance(level, int) or isinstance(level, bool)
                       or level < 1 or level > 4 for name, level in labels.items())):
            raise EnvironmentNotConfigured(
                "环境 profile %s 的 gerrit_green_labels 必须是非空 label->整数数组" % key)
    return result


def _external_profiles():
    filename = os.environ.get(PROFILE_FILE_ENV, "").strip()
    if not filename:
        return {}
    if not os.path.isabs(filename):
        raise EnvironmentNotConfigured(
            "%s 必须是绝对路径，当前为 %r" % (PROFILE_FILE_ENV, filename))
    try:
        with open(filename, "r", encoding="utf-8") as stream:
            raw = json.load(stream)
    except Exception as error:
        raise EnvironmentNotConfigured(
            "无法读取 %s=%s: %s" % (PROFILE_FILE_ENV, filename, error))
    profiles = raw.get("profiles") if isinstance(raw, dict) else None
    if not isinstance(profiles, dict):
        raise EnvironmentNotConfigured(
            "%s 顶层必须包含 profiles JSON 对象" % filename)
    return {key: _validate_override(key, value) for key, value in profiles.items()}


def _resolved_profile(state):
    env = env_id(state)
    if env == "openharmony":
        return _ohos_profile()
    ctype = component_type(state)
    if ctype not in COMPONENT_TYPES:
        raise EnvironmentNotConfigured(
            "environment=harmonyos requires component_type in %s, got %r.\n"
            "  Re-run `advance.py init` with --component-type system|chip."
            % (list(COMPONENT_TYPES), ctype))
    base = _harmonyos_profile(ctype)
    key = "%s/%s" % (env, ctype)
    override = _external_profiles().get(key)
    if override:
        base.update(override)
    return base


def _profile_digest(profile):
    payload = json.dumps(profile, sort_keys=True, separators=(",", ":"))
    return "sha256:" + hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _profile(state):
    profile = _resolved_profile(state)
    bound = (state or {}).get("environment_profile_digest")
    if bound and bound != _profile_digest(profile):
        raise EnvironmentNotConfigured(
            "环境 profile digest 已变化 (pipeline=%s, 当前=%s)。"
            "必须重新 init 并重新执行 P0。" % (bound, _profile_digest(profile)))
    return profile


def profile_digest(state):
    """Stable digest of the resolved environment profile for run/cache binding."""
    return _profile_digest(_resolved_profile(state))


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


def build_entry(state):
    """Executable build entry resolved from the same profile as build_argv."""
    return _require(_profile(state).get("build_entry", UNSET), state, "build_entry")


def test_framework_path(state):
    """Relative developer-test entrypoint for the selected environment."""
    return _require(_profile(state).get("test_framework_path", UNSET), state, "test_framework_path")


def build_command(state, target):
    """Full shell build command for the given GN target. Hard-fails (raises
    EnvironmentNotConfigured) when the environment's build template is still a
    placeholder — the gate catches it and emits a fail-closed message.

    Templates may reference {target} and {device_type}. device_type is bound to
    the source root (captured at init as --device-type, stored in
    state["device_type"]); a template that needs it while state has none
    hard-fails rather than emitting a command with an empty --device-type."""
    return shlex.join(build_argv(state, target))


def build_argv(state, target):
    """Build invocation as an argv vector, safe for ``shell=False`` execution.

    Split the trusted profile template *before* substituting runtime values, so
    a target/device value containing whitespace or shell metacharacters remains
    one literal argument and can never become syntax.
    """
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
    return [token.format(**fields) for token in shlex.split(tmpl)]


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


def _render_gerrit_template(template, values, *, field):
    """Render an operator-supplied Gerrit argv/ref template.

    Templates are data, never shell snippets.  Runtime values are validated
    before substitution and the profile validator has already rejected unknown
    fields, so a configured publisher can be executed with ``shell=False``
    without allowing a branch, project or Change-Id to become command syntax.
    """
    if not isinstance(template, str) or not template:
        raise EnvironmentNotConfigured("gerrit %s is not configured" % field)
    unknown = set(re.findall(r"\{([A-Za-z0-9_]+)\}", template)) - _GERRIT_TEMPLATE_FIELDS
    if unknown:
        raise EnvironmentNotConfigured(
            "gerrit %s contains unknown template fields: %s"
            % (field, ", ".join(sorted(unknown))))
    try:
        return template.format(**values)
    except (KeyError, IndexError, ValueError) as error:
        raise EnvironmentNotConfigured(
            "gerrit %s cannot be rendered: %s" % (field, error)) from error


def _gerrit_values(state, *, base="master", project=None, change_id=None, sha=None,
                   topic=""):
    """Validate values that may be interpolated into a Gerrit profile."""
    if not isinstance(base, str) or not re.fullmatch(r"[A-Za-z0-9._/-]{1,256}", base) \
            or base.startswith(("/", "-")) or ".." in base.split("/"):
        raise EnvironmentNotConfigured("gerrit base branch is unsafe")
    resolved_project = project or _profile(state).get("gerrit_project")
    if not isinstance(resolved_project, str) or not _GERRIT_PROJECT_RE.fullmatch(resolved_project):
        raise EnvironmentNotConfigured("gerrit project is not configured or unsafe")
    resolved_change = change_id or ""
    if resolved_change and not _GERRIT_CHANGE_RE.fullmatch(resolved_change):
        raise EnvironmentNotConfigured("gerrit change_id is unsafe")
    resolved_sha = sha or ""
    if resolved_sha and not _GERRIT_SHA_RE.fullmatch(resolved_sha):
        raise EnvironmentNotConfigured("gerrit commit SHA is unsafe")
    if topic and (not isinstance(topic, str) or not re.fullmatch(r"[A-Za-z0-9._/-]{1,256}", topic)
                  or topic.startswith(("/", "-")) or ".." in topic.split("/")):
        raise EnvironmentNotConfigured("gerrit topic is unsafe")
    return {
        "base": base,
        "project": resolved_project,
        "change_id": resolved_change,
        "sha": resolved_sha,
        "topic": topic,
    }


def gerrit_config(state):
    """Return the complete, validated P8 Gerrit configuration.

    A HarmonyOS deployment must provide all values through the external profile
    file (``OHOS_ENV_PROFILE_FILE``).  No internal Gerrit host, credential or
    query command is shipped in this repository.  Missing values raise
    ``EnvironmentNotConfigured`` before a diff is committed or pushed.
    """
    profile = _profile(state)
    if env_id(state) != "harmonyos" or profile.get("upload_backend") != "gerrit":
        raise EnvironmentNotConfigured("gerrit backend is only available for harmonyos profiles")
    remote = _require(profile.get("gerrit_remote", UNSET), state, "gerrit_remote")
    project = _require(profile.get("gerrit_project", UNSET), state, "gerrit_project")
    push_template = _require(profile.get("gerrit_push_ref", UNSET), state, "gerrit_push_ref")
    query_template = _require(profile.get("gerrit_query_command", UNSET), state, "gerrit_query_command")
    labels = _require(profile.get("gerrit_green_labels", UNSET), state, "gerrit_green_labels")
    if not _GERRIT_REMOTE_RE.fullmatch(remote):
        raise EnvironmentNotConfigured("gerrit_remote is unsafe")
    if not _GERRIT_PROJECT_RE.fullmatch(project):
        raise EnvironmentNotConfigured("gerrit_project is unsafe")

    def push_ref(base="master", topic=""):
        values = _gerrit_values(state, base=base, project=project, topic=topic)
        rendered = _render_gerrit_template(push_template, values, field="push_ref")
        if not rendered.startswith("HEAD:refs/for/"):
            raise EnvironmentNotConfigured("gerrit push_ref must target refs/for")
        return rendered

    def query_command(change_id, sha, *, base="master", topic=""):
        values = _gerrit_values(state, base=base, project=project,
                                change_id=change_id, sha=sha, topic=topic)
        return [_render_gerrit_template(item, values, field="query_command")
                for item in query_template]

    change_url_template = profile.get("gerrit_change_url")

    def change_url(change_id):
        if change_url_template is None:
            return ""
        values = _gerrit_values(state, project=project, change_id=change_id)
        return _render_gerrit_template(change_url_template, values, field="change_url")

    return {
        "remote": remote,
        "project": project,
        "push_ref": push_ref(),
        "push_ref_for": push_ref,
        "query_command": query_command,
        "change_url": change_url,
        "green_labels": dict(labels),
    }


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
    return shlex.join(arkts_test_argv(state, suite))


def arkts_test_argv(state, suite):
    """ArkTS runner argv with runtime suite substitution kept literal."""
    tmpl = _require(_profile(state)["arkts_test_template"], state, "arkts_test_template")
    return [token.format(suite=suite) for token in shlex.split(tmpl)]


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
