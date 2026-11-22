import { postIds } from './post-ids.mjs';
const ids = new Set(postIds);
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
  while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > 16384) { await reader.cancel(); return null; } chunks.push(value); }
  const bytes = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes)); } catch { return null; }
}
async function verifyTurnstile(token, env, hostname) {
  if (!env.TURNSTILE_SECRET || !env.TURNSTILE_HOSTNAMES || typeof token !== 'string' || !token || token.length > 2048) return false;
  const allowed = new Set(env.TURNSTILE_HOSTNAMES.split(',').map(s => s.trim().toLowerCase()).filter(Boolean));
  if (!allowed.has(hostname.toLowerCase())) return false;
  try {
    const result = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: token }), signal: AbortSignal.timeout(8000)
    });
    if (!result.ok) return false;
    const data = await result.json();
    return data.success === true && data.action === 'comment' && data.hostname?.toLowerCase() === hostname.toLowerCase();
  } catch { return false; }
}
export async function handleComments(request, env) {
  const url = new URL(request.url);
  if (!env.COMMENTS_DB) return respond({ error: 'unavailable' }, 503);
  if (request.method === 'GET') {
    const postId = Number(url.searchParams.get('post'));
    if (!Number.isSafeInteger(postId) || !ids.has(postId)) return respond({ error: 'invalid_post' }, 400);
    const { results } = await env.COMMENTS_DB.prepare("SELECT id, author, body, created_at FROM comments WHERE post_id = ?1 AND status = 'approved' ORDER BY created_at ASC LIMIT 200").bind(postId).all();
    return respond({ comments: results });
  }
  if (request.method !== 'POST') return respond({ error: 'method_not_allowed' }, 405);
  if (request.headers.get('Origin') !== url.origin || !request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return respond({ error: 'invalid_origin' }, 403);
  const ip = request.headers.get('CF-Connecting-IP');
  if (!env.COMMENT_SALT || !env.TURNSTILE_SECRET || !env.TURNSTILE_HOSTNAMES || !ip) return respond({ error: 'unavailable' }, 503);
  const data = await readLimited(request);
  const postId = Number(data?.post); const author = typeof data?.author === 'string' ? data.author.trim() : ''; const body = typeof data?.body === 'string' ? data.body.trim() : '';
  if (!Number.isSafeInteger(postId) || !ids.has(postId) || author.length < 1 || author.length > 40 || body.length < 1 || body.length > 2000 || data?.website) return respond({ error: 'invalid_input' }, 400);
  const now = new Date();
  const hash = await fingerprint(ip, env.COMMENT_SALT);
  const cutoff = new Date(now.getTime() - 3600000).toISOString();
  const recent = await env.COMMENTS_DB.prepare('SELECT COUNT(*) AS count FROM comments WHERE fingerprint = ?1 AND created_at > ?2').bind(hash, cutoff).first();
  if (recent.count >= 5) return respond({ error: 'rate_limited' }, 429);
  if (!await verifyTurnstile(data?.token, env, url.hostname)) return respond({ error: 'verification_failed' }, 403);
  const id = crypto.randomUUID();
  const result = await env.COMMENTS_DB.prepare("INSERT INTO comments (id, post_id, author, body, created_at, status, fingerprint) SELECT ?1, ?2, ?3, ?4, ?5, 'pending', ?6 WHERE (SELECT COUNT(*) FROM comments WHERE fingerprint = ?6 AND created_at > ?7) < 5").bind(id, postId, author, body, now.toISOString(), hash, cutoff).run();
  if (result.meta?.changes !== 1) return respond({ error: 'rate_limited' }, 429);
  // Clear inactive rate-limit identifiers opportunistically; a separate maintenance command handles quiet periods.
  await env.COMMENTS_DB.prepare("UPDATE comments SET fingerprint = '' WHERE fingerprint <> '' AND created_at < ?1").bind(new Date(now.getTime() - 86400000).toISOString()).run().catch(() => {});
  return respond({ status: 'pending' }, 202);
}
export default { async fetch(request, env) { try { if (new URL(request.url).pathname === '/api/comments') return await handleComments(request, env); return env.ASSETS.fetch(request); } catch { console.error(JSON.stringify({ message: 'Comment request failed' })); return respond({ error: 'unavailable' }, 500); } } };
