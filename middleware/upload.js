const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mime = require('mime-types');

const STORAGE_DIR = path.join(__dirname, '..', 'storage');
if (!fs.existsSync(STORAGE_DIR)) fs.mkdirSync(STORAGE_DIR, { recursive: true });

const MAX_FILE_SIZE = parseInt(process.env.MAX_FILE_SIZE || '104857600', 10);

// Blocklist by extension — executable/server-side types
const BLOCKED_EXTENSIONS = new Set([
  'exe', 'msi', 'bat', 'cmd', 'com', 'scr', 'pif', 'vbs', 'vbe',
  'js', 'jse', 'wsf', 'wsh', 'ps1', 'psm1', 'sh', 'bash', 'zsh',
  'php', 'php3', 'php4', 'php5', 'phtml', 'phar',
  'jsp', 'jspx', 'asp', 'aspx', 'cgi', 'pl', 'py', 'rb',
  'dll', 'so', 'dylib', 'app', 'jar', 'war',
  'htaccess', 'htpasswd'
]);

// Blocklist MIME types
const BLOCKED_MIMES = new Set([
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-executable',
  'application/x-sharedlib',
  'application/x-msi',
  'application/x-dosexec',
  'application/x-sh',
  'application/x-httpd-php'
]);

// Allowed image extensions must be safe
const ALLOWED_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'log', 'csv',
  'json', 'xml', 'yaml', 'yml', 'toml', 'ini', 'env', 'conf', 'config',
  'html', 'htm', 'css', 'scss', 'sass', 'less',
  'lua', 'sql', 'graphql', 'gql',
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'svg', 'ico', 'bmp',
  'pdf',
  'mp3', 'wav', 'ogg', 'm4a', 'flac',
  'mp4', 'webm', 'mov', 'mkv', 'avi',
  'zip', 'tar', 'gz', '7z', 'rar',
  'ttf', 'otf', 'woff', 'woff2',
  'wat', 'wasm'
]);

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, STORAGE_DIR),
  filename: (req, file, cb) => {
    // Never use original name — generate opaque name
    const randomName = crypto.randomBytes(24).toString('hex');
    const ext = path.extname(file.originalname).slice(1).toLowerCase();
    cb(null, ext ? `${randomName}.${ext}` : randomName);
  }
});

function fileFilter(req, file, cb) {
  const ext = path.extname(file.originalname).slice(1).toLowerCase();

  if (BLOCKED_EXTENSIONS.has(ext)) {
    return cb(Object.assign(new Error(`File extension .${ext} is not allowed`), { code: 'BLOCKED_EXT' }));
  }

  if (!ALLOWED_EXTENSIONS.has(ext) && ext !== '') {
    return cb(Object.assign(new Error(`File type .${ext} is not supported`), { code: 'UNSUPPORTED_EXT' }));
  }

  if (BLOCKED_MIMES.has(file.mimetype)) {
    return cb(Object.assign(new Error(`MIME type ${file.mimetype} is not allowed`), { code: 'BLOCKED_MIME' }));
  }

  cb(null, true);
}

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
    fields: 5
  }
});

module.exports = { upload, STORAGE_DIR, MAX_FILE_SIZE };
