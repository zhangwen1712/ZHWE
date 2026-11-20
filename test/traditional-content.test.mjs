import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read = path => JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8'));
const traditional = read('../translations/zh-Hant-content.json');
for (const type of ['published-posts', 'published-pages']) {
  test(`Traditional ${type} preserve source IDs and URLs`, () => {
    const source = read(`../migration/${type}.json`);
    assert.deepEqual(traditional[type].map(item => [item.id, item.link]), source.map(item => [item.id, item.link]));
    for (let i = 0; i < source.length; i++) {
      const urls = html => [...html.matchAll(/(?:href|src)=["']([^"']+)["']/g)].map(match => match[1]);
      assert.deepEqual(urls(traditional[type][i].content.rendered), urls(source[i].content.rendered), `links in ${source[i].id}`);
    }
  });
}
