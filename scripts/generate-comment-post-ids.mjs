import {readFile,writeFile} from 'node:fs/promises';
const root = new URL('../',import.meta.url);
const posts = JSON.parse(await readFile(new URL('migration/published-posts.json',root),'utf8'));
if (!Array.isArray(posts) || posts.some(post => !Number.isSafeInteger(post.id))) throw new Error('Invalid published post IDs');
await writeFile(new URL('worker/post-ids.mjs',root),`// Generated from migration/published-posts.json. Verify with test/comments.test.mjs.\nexport const postIds = ${JSON.stringify(posts.map(post=>post.id))};\n`);
