/**
 * Upload view controller.
 */
(function () {
  'use strict';

  const API = window.RawdropAPI;

  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('fileInput');
  const dzMeta = document.getElementById('dzMeta');
  const panel = document.getElementById('uploadPanel');
  const uFileName = document.getElementById('uFileName');
  const uFileSize = document.getElementById('uFileSize');
  const uBar = document.getElementById('uProgressBar');
  const uText = document.getElementById('uProgressText');
  const resultCard = document.getElementById('resultCard');
  const resultUrl = document.getElementById('resultUrl');
  const resultMeta = document.getElementById('resultMeta');
  const copyResult = document.getElementById('copyResult');
  const openResult = document.getElementById('openResult');

  let busy = false;

  dropzone.addEventListener('click', () => fileInput.click());
  dropzone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInput.click();
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) startUpload(fileInput.files[0]);
    fileInput.value = '';
  });

  ['dragenter', 'dragover'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
  });
  ['dragleave', 'drop'].forEach((evt) => {
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      if (evt === 'dragleave' && dropzone.contains(e.relatedTarget)) return;
      dropzone.classList.remove('dragover');
    });
  });
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) startUpload(file);
  });

  copyResult.addEventListener('click', () => {
    copyToClipboard(resultUrl.textContent);
    window.toast('URL copied');
  });
  openResult.addEventListener('click', () => {
    const url = resultUrl.textContent;
    if (url) window.open(url, '_blank', 'noopener');
  });

  async function startUpload(file) {
    if (busy) return;

    busy = true;
    resultCard.hidden = true;
    panel.hidden = false;
    uFileName.textContent = file.name;
    uFileSize.textContent = formatBytes(file.size);
    uBar.style.width = '0%';
    uText.textContent = 'Uploading…';

    try {
      const result = await API.uploadFile(file, (loaded, total) => {
        const pct = total ? Math.round((loaded / total) * 100) : 0;
        uBar.style.width = pct + '%';
        uText.textContent = `Uploading… ${pct}%`;
      });

      uBar.style.width = '100%';
      uText.textContent = 'Upload complete';

      resultUrl.textContent = result.url;
      resultMeta.innerHTML = '';
      resultMeta.appendChild(metaItem('ID', result.id));
      resultMeta.appendChild(metaItem('Type', result.contentType || 'unknown'));
      resultMeta.appendChild(metaItem('Size', formatBytes(result.size)));

      resultCard.hidden = false;
      window.toast('Upload successful');

      document.dispatchEvent(new CustomEvent('rawdrop:uploaded'));
    } catch (err) {
      uBar.style.width = '0%';
      uText.textContent = err.message;
      window.toast(err.message, 'error');
    } finally {
      busy = false;
    }
  }

  function metaItem(label, value) {
    const span = document.createElement('span');
    span.textContent = `${label}: ${value}`;
    return span;
  }

  // Expose max size hint if stats available
  window.addEventListener('rawdrop:ready', () => {
    if (dzMeta.textContent === 'Max size —') {
      dzMeta.textContent = 'Max 100 MB · Allowed: text, code, images, audio, video, archives';
    }
  });

  // Upload history refresher
  const refreshBtn = document.getElementById('refreshHistory');
  if (refreshBtn) {
    refreshBtn.addEventListener('click', () => {
      document.dispatchEvent(new CustomEvent('rawdrop:refresh-history'));
    });
  }

  function formatBytes(n) {
    if (!n && n !== 0) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + ' MB';
    return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function copyToClipboard(text) {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
    } else {
      fallbackCopy(text);
    }
  }
  function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); } catch (_) {}
    document.body.removeChild(ta);
  }

  window.RawdropUpload = { formatBytes, copyToClipboard };
})();
