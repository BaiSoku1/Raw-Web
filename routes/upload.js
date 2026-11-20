const express = require('express');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const { customAlphabet } = require('nanoid');
const { upload, STORAGE_DIR } = require('../middleware/upload');
const { createFile, getFileById } = require('../database/database');

const router = express.Router();

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
const generateId = customAlphabet(ALPHABET, 7);

function generateUniqueId(attempts = 10) {
  for (let i = 0; i < attempts; i++) {
    const id = generateId();
    if (!getFileById(id)) return id;
  }
  throw new Error('Could not generate unique file ID');
}

function buildPublicUrl(req, id) {
  const base = process.env.BASE_URL || `${req.protocol}://${req.get('host')}`;
  return `${base.replace(/\/$/, '')}/raw/${id}`;
}

router.post('/', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) return handleUploadError(err, res);
    return handleUploadSuccess(req, res);
  });
});

function handleUploadError(err, res) {
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      success: false,
      error: 'FILE_TOO_LARGE',
      message: `File exceeds the maximum size limit`
    });
  }
  if (err.code === 'LIMIT_FILE_COUNT') {
    return res.status(400).json({
      success: false,
      error: 'TOO_MANY_FILES',
      message: 'Only one file per request is allowed'
    });
  }
  if (['BLOCKED_EXT', 'UNSUPPORTED_EXT', 'BLOCKED_MIME'].includes(err.code)) {
    return res.status(415).json({
      success: false,
      error: err.code,
      message: err.message
    });
  }
  console.error('[upload] unexpected error:', err);
  return res.status(500).json({
    success: false,
    error: 'UPLOAD_ERROR',
    message: 'Upload failed'
  });
}

function handleUploadSuccess(req, res) {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: 'NO_FILE',
      message: 'No file provided. Use the "file" field in multipart/form-data.'
    });
  }

  try {
    const id = generateUniqueId();
    const ext = path.extname(req.file.originalname).slice(1).toLowerCase();
    const contentType =
      req.file.mimetype ||
      mime.lookup(req.file.originalname) ||
      'application/octet-stream';

    createFile({
      id,
      original_name: req.file.originalname,
      stored_name: req.file.filename,
      size: req.file.size,
      content_type: contentType,
      extension: ext,
      ip: req.ip
    });

    const url = buildPublicUrl(req, id);

    return res.status(201).json({
      success: true,
      id,
      url,
      filename: req.file.originalname,
      size: req.file.size,
      contentType,
      extension: ext
    });
  } catch (err) {
    // Cleanup on DB failure
    try {
      fs.unlinkSync(path.join(STORAGE_DIR, req.file.filename));
    } catch (_) {}
    console.error('[upload] save error:', err);
    return res.status(500).json({
      success: false,
      error: 'SAVE_ERROR',
      message: 'Could not save file record'
    });
  }
}

module.exports = router;
