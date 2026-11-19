import posts from '../migration/published-posts.json' with { type: 'json' };
const ids = new Set(posts.map(post => post.id));
const headers = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const respond = (data, status = 200) => Response.json(data, { status, headers });
async function fingerprint(ip, secret) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(ip));
  return Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('');
}
async function readLimited(request) {
  if (!request.body) return null;
  const reader = request.body.getReader(); let total = 0; const chunks = [];
  while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > 4096) { await reader.cancel(); return null; } chunks.push(value); }
  const bytes = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { return null; }
}
export async function handleComments(request, env) {
  const url = new URL(request.url);
  if (!env.COMMENTS_DB) return respond({ error: '评论暂不可用。' }, 503);
  if (request.method === 'GET') {
    const postId = Number(url.searchParams.get('post'));
    if (!Number.isSafeInteger(postId) || !ids.has(postId)) return respond({ error: '文章不存在。' }, 400);
    const { results } = await env.COMMENTS_DB.prepare("SELECT id, author, body, created_at FROM comments WHERE post_id = ?1 AND status = 'approved' ORDER BY created_at ASC LIMIT 200").bind(postId).all();
    return respond({ comments: results });
  }
  if (request.method !== 'POST') return respond({ error: '不支持此操作。' }, 405);
  if (request.headers.get('Origin') !== url.origin || !request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return respond({ error: '请求来源无效。' }, 403);
  if (!env.COMMENT_SALT || !request.headers.get('CF-Connecting-IP')) return respond({ error: '评论暂不可用。' }, 503);
  const data = await readLimited(request);
  const postId = Number(data?.post); const author = typeof data?.author === 'string' ? data.author.trim() : ''; const body = typeof data?.body === 'string' ? data.body.trim() : '';
  if (!Number.isSafeInteger(postId) || !ids.has(postId) || author.length < 1 || author.length > 40 || body.length < 1 || body.length > 2000 || data?.website) return respond({ error: '请填写有效的昵称和评论。' }, 400);
  const hash = await fingerprint(request.headers.get('CF-Connecting-IP'), env.COMMENT_SALT);
  const recent = await env.COMMENTS_DB.prepare("SELECT COUNT(*) AS count FROM comments WHERE fingerprint = ?1 AND created_at > ?2").bind(hash, new Date(Date.now() - 3600000).toISOString()).first();
  if (recent.count >= 5) return respond({ error: '提交过于频繁，请稍后再试。' }, 429);
  await env.COMMENTS_DB.prepare("INSERT INTO comments (id, post_id, author, body, created_at, status, fingerprint) VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6)").bind(crypto.randomUUID(), postId, author, body, new Date().toISOString(), hash).run();
  return respond({ message: '评论已提交，审核后显示。' }, 202);
}
export default { async fetch(request, env) { try { if (new URL(request.url).pathname === '/api/comments') return await handleComments(request, env); return env.ASSETS.fetch(request); } catch (error) { console.error(JSON.stringify({ message: 'Comment request failed', error: String(error) })); return respond({ error: '服务暂时不可用。' }, 500); } } };
