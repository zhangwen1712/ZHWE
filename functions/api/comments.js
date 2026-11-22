import { handleComments } from '../../worker/comments.mjs';
export async function onRequest({ request, env }) {
  try { return await handleComments(request, env); }
  catch { console.error(JSON.stringify({ message: 'Comment request failed' })); return Response.json({ error: 'unavailable' }, { status: 503, headers: { 'Cache-Control': 'no-store' } }); }
}
