/**
 * App shell: navigation, stats, recent files, history, toast.
 */
(function () {
  'use strict';

  const API = window.RawdropAPI;

  /* ---------- NAV ---------- */
  const views = document.querySelectorAll('.view');
  const navLinks = document.querySelectorAll('[data-nav]');
  const navToggle = document.getElementById('navToggle');
  const navMenu = document.querySelector('.nav-links');

  function showView(name) {
    let matched = false;
    views.forEach((v) => {
      const active = v.id === name;
      v.classList.toggle('active', active);
      if (active) matched = true;
    });
    if (!matched) {
      document.getElementById('home').classList.add('active');
      name = 'home';
    }
    navLinks.forEach((l) => l.classList.toggle('active', l.dataset.nav === name));
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (history.replaceState) history.replaceState(null, '', '#' + name);
  }

  function currentHash() {
    return (window.location.hash || '#home').slice(1);
  }

  window.addEventListener('hashchange', () => showView(currentHash()));
  showView(currentHash());

  if (navToggle) {
    navToggle.addEventListener('click', () => navMenu.classList.toggle('open'));
    navMenu.addEventListener('click', (e) => {
      if (e.target.tagName === 'A') navMenu.classList.remove('open');
    });
  }

  /* ---------- TOAST ---------- */
  const toastEl = document.getElementById('toast');
  let toastTimer = null;
  window.toast = function (message, kind) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.toggle('error', kind === 'error');
    toastEl.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 2600);
  };

  /* ---------- COPY BUTTONS ---------- */
  document.querySelectorAll('[data-copy]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const sel = btn.getAttribute('data-copy');
      const el = document.querySelector(sel);
      if (!el) return;
      const text = el.textContent.trim();
      if (window.RawdropUpload && window.RawdropUpload.copyToClipboard) {
        window.RawdropUpload.copyToClipboard(text);
      } else {
        navigator.clipboard && navigator.clipboard.writeText(text);
      }
      window.toast('Copied');
    });
  });

  /* ---------- STATS ---------- */
  async function refreshStats() {
    const filesEl = document.getElementById('statFiles');
    const storageEl = document.getElementById('statStorage');
    const apiEl = document.getElementById('statApi');
    const uptimeEl = document.getElementById('statUptime');
    try {
      const stats = await API.getStats();
      filesEl.textContent = stats.files ?? '0';
      storageEl.textContent = formatBytes(stats.storageBytes ?? 0);
      apiEl.textContent = stats.status === 'operational' ? 'Operational' : 'Degraded';
      apiEl.classList.toggle('down', stats.status !== 'operational');
      uptimeEl.textContent = formatUptime(stats.uptimeSeconds ?? 0);
    } catch (err) {
      filesEl.textContent = '—';
      storageEl.textContent = '—';
      apiEl.textContent = 'Down';
      apiEl.classList.add('down');
      uptimeEl.textContent = '—';
    }
  }

  /* ---------- RECENT ---------- */
  async function refreshRecent() {
    const el = document.getElementById('recentList');
    try {
      const data = await API.listFiles(6, 0);
      el.innerHTML = '';
      if (!data.files.length) {
        el.innerHTML = '<p class="empty">No uploads yet. <a href="#upload">Upload your first file →</a></p>';
        return;
      }
      data.files.forEach((f) => el.appendChild(renderRow(f, true)));
    } catch (err) {
      el.innerHTML = '<p class="empty">Could not load recent uploads.</p>';
    }
  }

  /* ---------- HISTORY ---------- */
  async function refreshHistory() {
    const el = document.getElementById('historyList');
    try {
      const data = await API.listFiles(30, 0);
      el.innerHTML = '';
      if (!data.files.length) {
        el.innerHTML = '<p class="empty">No uploads yet.</p>';
        return;
      }
      data.files.forEach((f) => el.appendChild(renderRow(f, false)));
    } catch (err) {
      el.innerHTML = '<p class="empty">Could not load upload history.</p>';
    }
  }

  function renderRow(file, compact) {
    const row = document.createElement('div');
    row.className = 'file-row';

    const name = document.createElement('div');
    name.className = 'fr-name';
    if (file.extension) {
      const ext = document.createElement('span');
      ext.className = 'fr-ext';
      ext.textContent = file.extension;
      name.appendChild(ext);
    }
    const nameText = document.createElement('span');
    nameText.textContent = file.filename;
    nameText.style.overflow = 'hidden';
    nameText.style.textOverflow = 'ellipsis';
    nameText.style.whiteSpace = 'nowrap';
    name.appendChild(nameText);

    const size = document.createElement('span');
    size.className = 'fr-size';
    size.textContent = formatBytes(file.size);

    const actions = document.createElement('div');
    actions.className = 'fr-actions';

    const copyBtn = document.createElement('button');
    copyBtn.textContent = 'Copy';
    copyBtn.addEventListener('click', () => {
      window.RawdropUpload.copyToClipboard(file.url);
      window.toast('URL copied');
    });

    const openBtn = document.createElement('button');
    openBtn.textContent = 'Open';
    openBtn.addEventListener('click', () => window.open(file.url, '_blank', 'noopener'));

    actions.appendChild(copyBtn);
    actions.appendChild(openBtn);

    if (!compact) {
      const delBtn = document.createElement('button');
      delBtn.textContent = 'Delete';
      delBtn.className = 'danger';
      delBtn.addEventListener('click', () => handleDelete(file, row));
      actions.appendChild(delBtn);
    }

    row.appendChild(name);
    row.appendChild(size);
    row.appendChild(actions);
    return row;
  }

  async function handleDelete(file, rowEl) {
    if (!confirm(`Delete "${file.filename}" permanently?`)) return;
    try {
      await API.deleteFile(file.id);
      rowEl.style.opacity = '0.4';
      setTimeout(() => {
        rowEl.remove();
        refreshStats();
        refreshRecent();
      }, 150);
      window.toast('File deleted');
    } catch (err) {
      window.toast(err.message, 'error');
    }
  }

  /* ---------- HELPERS ---------- */
  function formatBytes(n) {
    if (!n && n !== 0) return '—';
    if (n < 1024) return n + ' B';
    if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
    if (n < 1024 * 1024 * 1024) return (n / (1024 * 1024)).toFixed(1) + ' MB';
    return (n / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
  }

  function formatUptime(sec) {
    sec = Math.floor(sec);
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    const s = sec % 60;
    if (d) return `${d}d ${h}h`;
    if (h) return `${h}h ${m}m`;
    if (m) return `${m}m ${s}s`;
    return `${s}s`;
  }

  /* ---------- EVENTS ---------- */
  document.addEventListener('rawdrop:uploaded', () => {
    refreshStats();
    refreshRecent();
    refreshHistory();
  });
  document.addEventListener('rawdrop:refresh-history', refreshHistory);

  /* ---------- INIT ---------- */
  refreshStats();
  refreshRecent();
  refreshHistory();

  // Light polling for stats
  setInterval(refreshStats, 20000);

  window.dispatchEvent(new Event('rawdrop:ready'));
})();
