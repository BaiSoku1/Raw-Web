const express = require('express');
const path = require('path');
const fs = require('fs');
const { getFileById, listFiles, countFiles, deleteFile, getStats } = require('../database/database');
const { STORAGE_DIR } = require('../middleware/upload');

const router = express.Router();

function buildPublicUrl(req, id) {
  const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base.replace(/\/$/, '')}/raw/${id}`;
}

function toPublicFile(req, row) {
  return {
    id: row.id,
    url: buildPublicUrl(req, row.id),
    filename: row.original_name,
    size: row.size,
    contentType: row.content_type,
    extension: row.extension || null,
    createdAt: row.created_at
  };
}

router.get('/', (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0);
  const rows = listFiles(limit, offset);
  const total = countFiles();
  res.json({
    success: true,
    total,
    limit,
    offset,
    files: rows.map((r) => toPublicFile(req, r))
  });
});

router.get('/:id', (req, res) => {
  const row = getFileById(req.params.id);
  if (!row) {
    return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'File not found' });
  }
  res.json({ success: true, file: toPublicFile(req, row) });
});

router.delete('/:id', (req, res) => {
  const row = getFileById(req.params.id);
  if (!row) {
    return res.status(404).json({ success: false, error: 'NOT_FOUND', message: 'File not found' });
  }

  const deleteToken = process.env.UPLOAD_TOKEN;
  if (deleteToken) {
    const provided = req.get('x-delete-token') || req.query.token;
    if (provided !== deleteToken) {
      return res.status(403).json({ success: false, error: 'FORBIDDEN', message: 'Invalid delete token' });
    }
  }

  const safeName = path.basename(row.stored_name);
  const filePath = path.join(STORAGE_DIR, safeName);

  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  } catch (err) {
    console.error('[delete] disk error:', err);
  }

  deleteFile(row.id);
  res.json({ success: true, id: row.id, message: 'File deleted' });
});

module.exports = { router, getStats };
