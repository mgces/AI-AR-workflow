import { rm } from 'node:fs/promises';

export function afterCloseAndRemove(t, close, directory) {
  t.after(async () => {
    await close();
    await rm(directory, { recursive: true, force: true });
  });
}
