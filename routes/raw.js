const express = require('express');
const path = require('path');
const fs = require('fs');
const { getFileById } = require('../database/database');
const { STORAGE_DIR } = require('../middleware/upload');

const router = express.Router();

const ID_PATTERN = /^[A-Za-z0-9]{7}$/;

router.get('/:id', (req, res, next) => {
  const { id } = req.params;

  if (!ID_PATTERN.test(id)) {
    return res.status(404).type('text/plain').send('Not found');
  }

  const record = getFileById(id);
  if (!record) {
    return res.status(404).type('text/plain').send('Not found');
  }

  // Path traversal protection
  const safeName = path.basename(record.stored_name);
  const filePath = path.join(STORAGE_DIR, safeName);

  if (!filePath.startsWith(path.resolve(STORAGE_DIR) + path.sep)) {
    return res.status(400).type('text/plain').send('Invalid path');
  }

  if (!fs.existsSync(filePath)) {
    return res.status(404).type('text/plain').send('File missing on disk');
  }

  res.setHeader('Content-Type', record.content_type || 'application/octet-stream');
  res.setHeader('Content-Length', record.size);
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Content-Disposition', 'inline');
  res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // For HTML and SVG, force attachment to prevent stored XSS in RAW origin.
  if (/^(text\/html|image\/svg\+xml)$/.test(record.content_type || '')) {
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(record.original_name)}"`);
  }

  const stream = fs.createReadStream(filePath);
  stream.on('error', (err) => {
    console.error('[raw] stream error:', err);
    if (!res.headersSent) next(err);
    else res.end();
  });
  stream.pipe(res);
});

module.exports = router;
