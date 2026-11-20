/**
 * Shared API helpers for RAWDROP.
 */
(function () {
  'use strict';

  const API_BASE = window.location.origin;

  async function request(path, options = {}) {
    const res = await fetch(API_BASE + path, options);
    let body = null;
    const ct = res.headers.get('content-type') || '';
    try {
      body = ct.includes('application/json') ? await res.json() : await res.text();
    } catch (_) {
      body = null;
    }
    if (!res.ok) {
      const message = (body && body.message) || `Request failed (${res.status})`;
      const err = new Error(message);
      err.status = res.status;
      err.body = body;
      throw err;
    }
    return body;
  }

  function getStats() {
    return request('/api/stats');
  }

  function listFiles(limit = 20, offset = 0) {
    return request(`/api/files?limit=${limit}&offset=${offset}`);
  }

  function deleteFile(id) {
    return request(`/api/files/${id}`, { method: 'DELETE' });
  }

  function uploadFile(file, onProgress) {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const form = new FormData();
      form.append('file', file);

      xhr.open('POST', API_BASE + '/api/upload');

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && typeof onProgress === 'function') {
          onProgress(e.loaded, e.total);
        }
      });

      xhr.onload = () => {
        let body;
        try {
          body = JSON.parse(xhr.responseText);
        } catch (_) {
          body = null;
        }
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(body);
        } else {
          const err = new Error((body && body.message) || `Upload failed (${xhr.status})`);
          err.status = xhr.status;
          err.body = body;
          reject(err);
        }
      };

      xhr.onerror = () => reject(new Error('Network error during upload'));
      xhr.ontimeout = () => reject(new Error('Upload timed out'));
      xhr.send(form);
    });
  }

  window.RawdropAPI = {
    getStats,
    listFiles,
    deleteFile,
    uploadFile
  };
})();
