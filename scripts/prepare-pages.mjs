import { readdir, readFile, writeFile, unlink } from 'node:fs/promises';
import { join } from 'node:path';
const paths = ['/wp-content/uploads/2024/11/GTA.mp4', '/wp-content/uploads/2025/05/2025-05-01-19-11-17.webm'];
async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const file = join(dir, entry.name);
    if (entry.isDirectory()) await walk(file);
    else if (file.endsWith('.html')) {
      let html = await readFile(file, 'utf8');
      for (const path of paths) html = html.replaceAll(path, `https://zhwe.top${path}`);
      await writeFile(file, html);
    }
  }
}
await walk('dist');
for (const path of paths) await unlink(join('dist', path));
console.log('Pages preview references the two large videos on the current site.');
