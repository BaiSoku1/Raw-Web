const path = require('path');
const fs = require('fs');
const Database = require('better-sqlite3');

const DB_DIR = path.join(__dirname);
const DB_PATH = path.join(DB_DIR, 'rawdrop.db');

if (!fs.existsSync(DB_DIR)) fs.mkdirSync(DB_DIR, { recursive: true });

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    original_name TEXT NOT NULL,
    stored_name TEXT NOT NULL UNIQUE,
    size INTEGER NOT NULL,
    content_type TEXT NOT NULL,
    extension TEXT,
    ip TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_files_created_at ON files(created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_files_ip ON files(ip);
`);

const stmts = {
  insert: db.prepare(`
    INSERT INTO files (id, original_name, stored_name, size, content_type, extension, ip, created_at)
    VALUES (@id, @original_name, @stored_name, @size, @content_type, @extension, @ip, @created_at)
  `),
  getById: db.prepare('SELECT * FROM files WHERE id = ?'),
  getAll: db.prepare('SELECT * FROM files ORDER BY created_at DESC LIMIT ? OFFSET ?'),
  countAll: db.prepare('SELECT COUNT(*) as count FROM files'),
  delete: db.prepare('DELETE FROM files WHERE id = ?'),
  stats: db.prepare('SELECT COUNT(*) as total_files, COALESCE(SUM(size), 0) as total_size FROM files')
};

function createFile(record) {
  const now = new Date().toISOString();
  stmts.insert.run({ ...record, created_at: now });
  return { ...record, created_at: now };
}

function getFileById(id) {
  return stmts.getById.get(id);
}

function listFiles(limit = 50, offset = 0) {
  return stmts.getAll.all(limit, offset);
}

function countFiles() {
  return stmts.countAll.get().count;
}

function deleteFile(id) {
  const result = stmts.delete.run(id);
  return result.changes > 0;
}

function getStats() {
  return stmts.stats.get();
}

module.exports = {
  db,
  createFile,
  getFileById,
  listFiles,
  countFiles,
  deleteFile,
  getStats
};
