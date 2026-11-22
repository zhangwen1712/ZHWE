#!/usr/bin/env node
// Local owner-only administration via the authenticated cf CLI; no public admin endpoint.
import { spawnSync } from 'node:child_process';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const database = process.env.COMMENTS_DATABASE_ID || '';
const [action, id] = process.argv.slice(2);
if (!uuid.test(database) || !['list','approve','reject','delete','clear-rate-data'].includes(action) || (['approve','reject','delete'].includes(action) && !uuid.test(id || ''))) {
  console.error('Set COMMENTS_DATABASE_ID to a D1 UUID. Usage: node scripts/comments-admin.mjs list|approve <id>|reject <id>|delete <id>|clear-rate-data');
  process.exit(2);
}
const sql = {
  list: "SELECT id, post_id, author, body, created_at FROM comments WHERE status = 'pending' ORDER BY created_at ASC LIMIT 200",
  approve: "UPDATE comments SET status = 'approved' WHERE id = ?1 AND status = 'pending'",
  reject: "UPDATE comments SET status = 'rejected' WHERE id = ?1 AND status = 'pending'",
  delete: 'DELETE FROM comments WHERE id = ?1',
  'clear-rate-data': "UPDATE comments SET fingerprint = '' WHERE fingerprint <> '' AND created_at < ?1"
}[action];
const params = action === 'clear-rate-data' ? [new Date(Date.now() - 86400000).toISOString()] : id ? [id] : [];
const args = ['d1', 'query', database, '--sql', sql];
for (const value of params) args.push('--params', value);
const result = spawnSync('cf', args, {stdio:'inherit'});
if (result.error) { console.error('Unable to start cf CLI:', result.error.message); process.exit(1); }
process.exit(result.status ?? 1);
