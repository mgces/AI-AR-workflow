import { realpathSync } from 'node:fs';
import { basename, dirname, isAbsolute, relative, resolve, sep, win32 } from 'node:path';

// Paths from another host may be absent locally. Resolve existing local symlinks,
// normalize foreign Windows paths without treating them as POSIX relative paths.
export function resourceIdentity(path) {
  if (!path) return null;
  if (/^[a-z]:[\\/]/i.test(path) || path.startsWith('\\\\')) {
    return { kind: 'windows', path: win32.normalize(path).toLowerCase() };
  }
  let parent = resolve(path);
  const suffix = [];
  while (true) {
    try { return { kind: 'local', path: resolve(realpathSync(parent), ...suffix) }; }
    catch (error) {
      if (error.code !== 'ENOENT' || dirname(parent) === parent) return null;
      suffix.unshift(basename(parent));
      parent = dirname(parent);
    }
  }
}

export function resourcesOverlap(first, second) {
  const a = resourceIdentity(first);
  const b = resourceIdentity(second);
  if (!a || !b) return true;
  if (a.kind !== b.kind) return false;
  const paths = a.kind === 'windows' ? win32 : { relative, isAbsolute, sep };
  const contains = (parent, child) => {
    const rel = paths.relative(parent, child);
    return rel === '' || (rel !== '..' && !rel.startsWith(`..${paths.sep}`) && !paths.isAbsolute(rel));
  };
  return contains(a.path, b.path) || contains(b.path, a.path);
}
