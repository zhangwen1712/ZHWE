import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import posts from '../migration/published-posts.json' with { type: 'json' };

const dist = new URL('../dist/', import.meta.url);
const read = path => readFile(new URL(path, dist), 'utf8');
const cases = [
  { lang: 'en', prefix: '', query: '端午假期', title: '端午假期' },
  { lang: 'zh-Hant', prefix: 'zh-Hant/', query: '端午假期', title: '端午假期' },
  { lang: 'zh-CN', prefix: 'zh/', query: '端午假期', title: '端午假期' },
  { lang: 'fr', prefix: 'fr/', query: 'vacances du Dragon Boat', title: 'Les vacances du Dragon Boat' },
  { lang: 'es', prefix: 'es/', query: 'vacaciones del festival', title: 'Vacaciones del festival de dragón' },
  { lang: 'it', prefix: 'it/', query: 'festa del drago', title: 'Festa del drago' },
  { lang: 'de', prefix: 'de/', query: 'Drachenboot', title: 'Drachenboot-Fest' }
];
const postPath = '/2025/06/01/端午假期/';

test('each locale has a search page and an article-only build index', async () => {
  const entry = JSON.parse(await read('pagefind/pagefind-entry.json'));
  assert.deepEqual(Object.keys(entry.languages).sort(), cases.map(({ lang }) => lang.toLowerCase()).sort());

  for (const { lang, prefix } of cases) {
    assert.equal(entry.languages[lang.toLowerCase()].page_count, posts.length, lang);
    const homepage = await read(prefix + 'index.html');
    const search = await read(prefix + 'search/index.html');
    assert.ok(homepage.includes(`href="/${prefix}search/"`), lang);
    assert.ok(search.includes(`<html lang="${lang}"`), lang);
    assert.ok(search.includes('name="robots" content="noindex,nofollow"'), lang);
    assert.ok(!search.includes('data-pagefind-body'), lang);
  }

  assert.equal(await read('robots.txt'), 'User-agent: *\nDisallow: /\n');
  assert.match(await read('_headers'), /\/pagefind\/\*\s+Cache-Control: no-cache/);
});

test('the built Pagefind runtime searches titles and body text in the active language', async t => {
  const pagefind = await import(new URL('pagefind/pagefind.js', dist));
  // Serve the built assets from disk so these queries run without a server or browser.
  t.mock.method(globalThis, 'fetch', async url => {
    const file = new URL(url);
    file.search = '';
    return new Response(await readFile(file));
  });
  t.after(async () => {
    delete globalThis.document;
    await pagefind.destroy();
  });

  for (const { lang, prefix, query, title } of cases) {
    globalThis.document = { querySelector: () => ({ getAttribute: () => lang }) };
    await pagefind.options({ baseUrl: '/' });

    const { results } = await pagefind.search(query);
    const pages = await Promise.all(results.map(result => result.data()));
    const paths = pages.map(page => decodeURIComponent(page.url));
    const target = `/${prefix}${postPath.slice(1)}`;
    const result = pages[paths.indexOf(target)];
    assert.equal(result?.meta.title, title, lang);
    assert.match(result.excerpt, /<mark>/, lang);
    assert.ok(paths.every(path => path.startsWith(`/${prefix}20`)), lang);

    if (lang === 'zh-CN') {
      const body = await pagefind.search('修炼爱情');
      const articles = await Promise.all(body.results.map(article => article.data()));
      assert.ok(articles.some(article =>
        decodeURIComponent(article.url) === `/zh${postPath}` && article.excerpt.includes('<mark>修炼</mark>')
      ));
      for (const excluded of ['希思罗机场的CDN节点', '欢迎来到我的站点', 'qzqznoarticles']) {
        assert.equal((await pagefind.search(excluded)).results.length, 0, excluded);
      }
    }

    await pagefind.destroy();
  }
});
