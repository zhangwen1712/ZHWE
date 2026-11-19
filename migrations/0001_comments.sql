CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY,
  post_id INTEGER NOT NULL,
  author TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'rejected')),
  fingerprint TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS comments_post_status ON comments(post_id, status, created_at);
CREATE INDEX IF NOT EXISTS comments_rate ON comments(fingerprint, created_at);
