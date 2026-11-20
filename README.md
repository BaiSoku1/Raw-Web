Client (Browser)
│
├── GET  /                        → public/index.html (SPA shell)
├── POST /api/upload              → Multer → SQLite + storage/
├── GET  /api/files               → SQLite (metadata list)
├── GET  /api/files/:id           → SQLite (metadata)
├── DELETE /api/files/:id         → SQLite + unlink file
├── GET  /api/stats               → SQLite aggregate
└── GET  /raw/:id                 → stream file from storage/

```

Uploaded files are stored under `storage/` with an **opaque random name** —
never the original filename. Original name is preserved only in SQLite metadata.

---

## 2. Install

```bash
git clone <your-repo> rawdrop
cd rawdrop
cp .env.example .env
npm install
```

Edit .env if needed:

```env
PORT=3000
BASE_URL=http://localhost:3000
MAX_FILE_SIZE=104857600
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=120
UPLOAD_TOKEN=
```

· MAX_FILE_SIZE — max bytes per upload (default 100 MB).
· UPLOAD_TOKEN — optional. When set, DELETE /api/files/:id requires
  header x-delete-token: <token> (or ?token=<token>). Leave empty to allow
  unauthenticated deletion (dev mode).
