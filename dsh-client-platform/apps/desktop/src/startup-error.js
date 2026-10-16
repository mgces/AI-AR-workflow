const CODE_RECOVERY = new Map([
  ['runtime_bundle_missing', '检查客户端文件是否完整；也可以重试启动或重新选择源码工作区。'],
  ['runtime_bundle_incomplete', '客户端工作流文件不完整，请修复或重新安装客户端后重试。'],
  ['ENOENT', '确认源码目录和客户端运行文件仍存在，再重试启动。'],
  ['EACCES', '检查当前用户对源码目录的访问权限，再重试启动。'],
]);

export function toStartupError(error) {
  const code = typeof error?.code === 'string' && error.code.length <= 80 ? error.code : 'client_startup_failed';
  const message = typeof error?.message === 'string' && error.message.trim()
    ? error.message.slice(0, 2000)
    : String(error).slice(0, 2000);
  return {
    code,
    message,
    recovery: CODE_RECOVERY.get(code) ?? '重试启动本机服务；如果仍失败，请复制错误信息反馈。',
  };
}

export function resolveStartupRuntime({ resolveRoot, fallbackRoot }) {
  try {
    return { runtimeRoot: resolveRoot(), startupError: null };
  } catch (error) {
    return { runtimeRoot: fallbackRoot, startupError: toStartupError(error) };
  }
}
