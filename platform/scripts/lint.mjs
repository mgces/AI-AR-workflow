import { readFile } from 'node:fs/promises';
import { glob } from 'node:fs/promises';

const files = [];
for await (const file of glob('**/*.js', { exclude: ['node_modules/**', 'dist/**'] })) files.push(file);
const violations = [];
for (const file of files) {
  const text = await readFile(file, 'utf8');
  if (/\bconsole\.log\s*\(/.test(text)) violations.push(`${file}: console.log is not allowed`);
  if (/\r\n/.test(text)) violations.push(`${file}: CRLF is not allowed`);
}
if (violations.length > 0) {
  console.error(violations.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`lint ok (${files.length} JavaScript files)`);
}
