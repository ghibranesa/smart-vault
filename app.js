/**
 * SmartVault — app.js
 * Enkripsi AES-256 (CryptoJS) + IndexedDB (localForage) + Google Drive appDataFolder
 * ─────────────────────────────────────────────────────────────────────────────
 * CATATAN DEPLOY:
 *  1. Isi GOOGLE_CLIENT_ID dengan OAuth 2.0 Client ID dari Google Cloud Console.
 *  2. Tambahkan domain GitHub Pages kamu di "Authorized JavaScript origins".
 *  3. Gak perlu backend — semua jalan client-side.
 */

/* ══════════════════════════════════════════════════════════════
   CONFIG — WAJIB DIISI
══════════════════════════════════════════════════════════════ */
const GOOGLE_CLIENT_ID = "280494613299-vcrnbqvj8ni2pub7gq5q2auodcleb2sf.apps.googleusercontent.com";
const GOOGLE_SCOPE     = 'https://www.googleapis.com/auth/drive.appdata';
const VAULT_DB_KEY     = 'vault_data';
const VAULT_META_KEY   = 'vault_meta';
const DRIVE_FILENAME   = 'vault_backup.json';

/* ══════════════════════════════════════════════════════════════
   SCHEMA DOKUMEN
   type: 'text' → Quick Copy snippet
   type: 'file' → Upload/Preview/Download
   type: 'cv'   → Multi-upload dengan label/tag
══════════════════════════════════════════════════════════════ */
const DOC_SCHEMA = {
  identitas: {
    label: 'Identitas & Alamat',
    subtitle: 'Nomor identitas & alamat domisili lu',
    docs: [
      { id: 'ktp',      label: 'NIK (KTP)',             type: 'text', icon: 'credit-card', hint: 'cth: 3201XXXXXXXXXX0001' },
      { id: 'npwp',     label: 'NPWP',                  type: 'text', icon: 'file-badge',  hint: 'cth: 00.000.000.0-000.000' },
      { id: 'bpjs',     label: 'No. BPJS Kesehatan',    type: 'text', icon: 'heart-pulse', hint: 'cth: 0001234567890' },
      { id: 'alamat_asal',  label: 'Alamat Rumah Asal', type: 'text', icon: 'home',        hint: 'Jl. Merdeka No.1, RT/RW 01/01...' },
      { id: 'alamat_kos',   label: 'Alamat Kos/Domisili', type: 'text', icon: 'map-pin',  hint: 'Jl. Kost Nyaman No.12...' },
    ]
  },
  mobilitas: {
    label: 'Mobilitas',
    subtitle: 'SIM & surat kendaraan lu',
    docs: [
      { id: 'sim_c',  label: 'SIM C',  type: 'file', icon: 'car',          hint: 'PDF atau foto SIM C lu' },
      { id: 'stnk',   label: 'STNK',   type: 'file', icon: 'file-scan',    hint: 'STNK kendaraan lu' },
    ]
  },
  legalitas: {
    label: 'Legalitas & Karir',
    subtitle: 'Surat-surat penting buat kerjaan',
    docs: [
      { id: 'cv',    label: 'CV',   type: 'cv',   icon: 'scroll-text', hint: 'Upload semua versi CV lu' },
      { id: 'skck',  label: 'SKCK', type: 'file', icon: 'shield',      hint: 'Surat Keterangan Catatan Kepolisian' },
      { id: 'ak1',   label: 'Kartu AK-1 (Pencari Kerja)', type: 'file', icon: 'user-check', hint: 'Kartu Tanda Pencari Kerja' },
    ]
  },
  pendidikan: {
    label: 'Pendidikan Formal',
    subtitle: 'Ijazah & sertifikat pendidikan formal',
    docs: [
      { id: 'ijazah_d3',   label: 'Ijazah Diploma III',   type: 'file', icon: 'graduation-cap', hint: 'Ijazah D3 lu' },
      { id: 'skl_d3',      label: 'SKL Diploma III',       type: 'file', icon: 'file-check',     hint: 'Surat Keterangan Lulus D3' },
      { id: 'skpi_d3',     label: 'SKPI Diploma III',      type: 'file', icon: 'file-badge-2',   hint: 'Surat Keterangan Pendamping Ijazah D3' },
      { id: 'transkrip_d3',label: 'Transkrip D3',          type: 'file', icon: 'table-2',        hint: 'Transkrip nilai D3 lu' },
      { id: 'ijazah_smk',  label: 'Ijazah SMK',            type: 'file', icon: 'graduation-cap', hint: 'Ijazah SMK lu' },
      { id: 'ijazah_smp',  label: 'Ijazah SMP',            type: 'file', icon: 'graduation-cap', hint: 'Ijazah SMP lu' },
      { id: 'ijazah_sd',   label: 'Ijazah SD',             type: 'file', icon: 'graduation-cap', hint: 'Ijazah SD lu' },
    ]
  },
  sertifikasi: {
    label: 'Sertifikasi & Bahasa',
    subtitle: 'Sertifikat kompetensi & bahasa lu',
    docs: [
      { id: 'sertif_kompetensi', label: 'Sertifikat Kompetensi', type: 'file', icon: 'award',         hint: 'Sertifikat kompetensi keahlian lu' },
      { id: 'toeic_tepps',       label: 'TOEIC TEPPS',           type: 'file', icon: 'languages',     hint: 'Sertifikat TOEIC TEPPS lu' },
      { id: 'toeic_smk',         label: 'TOEIC SMK',             type: 'file', icon: 'languages',     hint: 'Sertifikat TOEIC SMK lu' },
      { id: 'toefl_smk',         label: 'TOEFL SMK',             type: 'file', icon: 'languages',     hint: 'Sertifikat TOEFL SMK lu' },
    ]
  },
  pasfoto: {
    label: 'Pasfoto Formal',
    subtitle: 'Foto resmi buat berbagai keperluan',
    docs: [
      { id: 'foto_merah',  label: 'Pasfoto Latar Merah',  type: 'file', icon: 'image', hint: 'JPEG/PNG, latar merah' },
      { id: 'foto_biru',   label: 'Pasfoto Latar Biru',   type: 'file', icon: 'image', hint: 'JPEG/PNG, latar biru' },
      { id: 'foto_putih',  label: 'Pasfoto Latar Putih',  type: 'file', icon: 'image', hint: 'JPEG/PNG, latar putih' },
    ]
  }
};

/* ══════════════════════════════════════════════════════════════
   APP STATE
══════════════════════════════════════════════════════════════ */
const State = {
  pin:           null,     // PIN aktif (in-memory only)
  isSetup:       false,
  isLoggedIn:    false,
  currentSection:'identitas',
  vaultData:     {},       // decrypted data in memory
  // modal temp state
  activeDocId:   null,
  activeDocType: null,
  pendingFiles:  [],       // [{name, b64, mime, tag?}]
  cvTags:        [],
  deleteCallback: null,
  // Google Drive
  driveToken:    null,
  driveUser:     null,
  driveFileId:   null,     // cached file id for updates
};

/* ══════════════════════════════════════════════════════════════
   CRYPTO HELPERS
══════════════════════════════════════════════════════════════ */
const Crypto = {
  encrypt(plaintext, key) {
    return CryptoJS.AES.encrypt(plaintext, key).toString();
  },
  decrypt(ciphertext, key) {
    try {
      const bytes = CryptoJS.AES.decrypt(ciphertext, key);
      const result = bytes.toString(CryptoJS.enc.Utf8);
      if (!result) throw new Error('Decryption failed');
      return result;
    } catch {
      return null;
    }
  },
  hash(str) {
    return CryptoJS.SHA256(str).toString();
  }
};

/* ══════════════════════════════════════════════════════════════
   STORAGE HELPERS (localForage = IndexedDB)
══════════════════════════════════════════════════════════════ */
const Store = {
  async getMeta()     { return await localforage.getItem(VAULT_META_KEY) || {}; },
  async setMeta(obj)  { return await localforage.setItem(VAULT_META_KEY, obj); },
  async getRaw()      { return await localforage.getItem(VAULT_DB_KEY); },
  async setRaw(enc)   { return await localforage.setItem(VAULT_DB_KEY, enc); },
  async clear()       { return await localforage.clear(); },

  /** Load and decrypt vault into State.vaultData */
  async load(pin) {
    const raw = await Store.getRaw();
    if (!raw) { State.vaultData = {}; return true; }
    const decrypted = Crypto.decrypt(raw, pin);
    if (!decrypted) return false;
    try {
      State.vaultData = JSON.parse(decrypted);
      return true;
    } catch {
      return false;
    }
  },

  /** Encrypt and persist State.vaultData */
  async save() {
    if (!State.pin) return;
    const enc = Crypto.encrypt(JSON.stringify(State.vaultData), State.pin);
    await Store.setRaw(enc);
    showSyncIndicator();
  }
};

/* ══════════════════════════════════════════════════════════════
   TOAST SYSTEM
══════════════════════════════════════════════════════════════ */
function toast(msg, type = 'info', duration = 3000) {
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;

  const icon = { success: 'check-circle', error: 'x-circle', info: 'info' }[type] || 'info';
  el.innerHTML = `<i data-lucide="${icon}" class="w-4 h-4 flex-shrink-0"></i><span>${msg}</span>`;
  container.appendChild(el);
  lucide.createIcons({ icons: {}, element: el });

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(20px)';
    el.style.transition = 'opacity 0.3s, transform 0.3s';
    setTimeout(() => el.remove(), 300);
  }, duration);
}

function showSyncIndicator() {
  const el = document.getElementById('sync-indicator');
  if (!el) return;
  el.style.display = 'flex';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 2500);
}

/* ══════════════════════════════════════════════════════════════
   MODAL HELPERS
══════════════════════════════════════════════════════════════ */
function openModal(id) {
  document.getElementById(id).style.display = 'flex';
  setTimeout(() => lucide.createIcons(), 50);
}
function closeModal(id) {
  document.getElementById(id).style.display = 'none';
}

/* ══════════════════════════════════════════════════════════════
   INIT — check first run or login
══════════════════════════════════════════════════════════════ */
async function init() {
  lucide.createIcons();

  const meta = await Store.getMeta();

  if (!meta.pinHash) {
    // First run → setup
    document.getElementById('screen-auth').style.display = 'flex';
    document.getElementById('auth-setup').style.display = 'block';
  } else {
    // Returning user → login
    document.getElementById('screen-auth').style.display = 'flex';
    document.getElementById('auth-login').style.display = 'block';
    buildPinDots('');
    document.getElementById('login-pin').addEventListener('input', e => buildPinDots(e.target.value));
    document.getElementById('login-pin').addEventListener('keydown', e => { if (e.key === 'Enter') App.loginVault(); });
  }

  // Drag-and-drop on import modal
  setupDropZone('import-drop', file => {
    window._importFile = file;
    document.getElementById('import-drop').innerHTML = `<i data-lucide="file-check" class="w-5 h-5 text-emerald-500 mx-auto mb-1"></i><div class="text-emerald-500 text-sm">${file.name}</div>`;
    lucide.createIcons();
  });
}

function buildPinDots(val) {
  const container = document.getElementById('pin-dots');
  if (!container) return;
  const len = Math.min(val.length, 8);
  const dots = Math.max(len, 6);
  container.innerHTML = Array.from({length: dots}, (_, i) =>
    `<div class="pin-dot ${i < len ? 'filled' : ''}"></div>`
  ).join('');
}

function setupDropZone(zoneId, cb) {
  const zone = document.getElementById(zoneId);
  if (!zone) return;
  zone.addEventListener('dragover', e => { e.preventDefault(); zone.classList.add('dragover'); });
  zone.addEventListener('dragleave', () => zone.classList.remove('dragover'));
  zone.addEventListener('drop', e => {
    e.preventDefault(); zone.classList.remove('dragover');
    const file = e.dataTransfer.files[0];
    if (file) cb(file);
  });
}

/* ══════════════════════════════════════════════════════════════
   APP NAMESPACE — public methods
══════════════════════════════════════════════════════════════ */
const App = {

  /* ─── AUTH ─── */
  async setupVault() {
    const p1 = document.getElementById('setup-pin1').value;
    const p2 = document.getElementById('setup-pin2').value;
    const err = document.getElementById('setup-error');
    err.style.display = 'none';

    if (p1.length < 6) { err.textContent = 'PIN minimal 6 karakter bro.'; err.style.display = 'block'; return; }
    if (p1 !== p2)     { err.textContent = 'PIN-nya beda bos.'; err.style.display = 'block'; return; }

    await Store.setMeta({ pinHash: Crypto.hash(p1), createdAt: Date.now() });
    State.pin = p1;
    State.vaultData = {};
    await Store.save();

    toast('Vault berhasil dibuat!', 'success');
    App._enterApp();
  },

  async loginVault() {
    const pin = document.getElementById('login-pin').value;
    const err = document.getElementById('login-error');
    err.style.display = 'none';

    const meta = await Store.getMeta();
    if (Crypto.hash(pin) !== meta.pinHash) {
      err.textContent = 'PIN salah bos. Coba lagi.';
      err.style.display = 'block';
      return;
    }

    const ok = await Store.load(pin);
    if (!ok) {
      err.textContent = 'Gagal dekripsi. Data mungkin corrupt.';
      err.style.display = 'block';
      return;
    }

    State.pin = pin;
    toast('Vault kebuka!', 'success');
    App._enterApp();
  },

  lockVault() {
    State.pin = null;
    State.isLoggedIn = false;
    State.vaultData = {};
    State.driveToken = null;

    document.getElementById('screen-main').style.cssText = 'display:none !important';
    document.getElementById('screen-auth').style.display = 'flex';
    document.getElementById('auth-login').style.display = 'block';
    document.getElementById('auth-setup').style.display = 'none';
    document.getElementById('login-pin').value = '';
    buildPinDots('');
    document.getElementById('login-error').style.display = 'none';

    lucide.createIcons();
    toast('Vault udah dikunci.', 'info');
  },

  _enterApp() {
    document.getElementById('screen-auth').style.display = 'none';
    document.getElementById('screen-main').style.cssText = 'display:flex';
    State.isLoggedIn = true;
    App.switchSection('identitas', document.querySelector('.nav-item[data-section="identitas"]'));
    setTimeout(() => lucide.createIcons(), 100);
  },

  /* ─── SECTION SWITCHING ─── */
  switchSection(sectionId, navEl) {
    document.querySelectorAll('.section-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const section = document.getElementById(`section-${sectionId}`);
    if (section) section.style.display = 'block';
    if (navEl) navEl.classList.add('active');

    State.currentSection = sectionId;
    const meta = DOC_SCHEMA[sectionId];
    document.getElementById('section-title').textContent   = meta?.label || sectionId;
    document.getElementById('section-subtitle').textContent = meta?.subtitle || '';

    App.renderSection(sectionId);
    setTimeout(() => lucide.createIcons(), 100);
  },

  renderSection(sectionId) {
    const schema = DOC_SCHEMA[sectionId];
    if (!schema) return;

    if (sectionId === 'legalitas') {
      App.renderCvSection();
      const grid = document.getElementById('grid-legalitas');
      const nonCv = schema.docs.filter(d => d.type !== 'cv');
      grid.innerHTML = nonCv.map(d => App.buildCard(d)).join('');
    } else {
      const grid = document.getElementById(`grid-${sectionId}`);
      if (!grid) return;
      grid.innerHTML = schema.docs.map(d => App.buildCard(d)).join('');
    }
    setTimeout(() => lucide.createIcons(), 50);
  },

  /* ─── CARD BUILDER ─── */
  buildCard(docDef) {
    const data = State.vaultData[docDef.id];
    const hasText = docDef.type === 'text' && data?.value;
    const hasFile = (docDef.type === 'file') && data?.files?.length;
    const status  = hasText || hasFile
      ? `<span class="badge-filled text-xs px-2 py-0.5 rounded font-medium">Terisi</span>`
      : `<span class="badge-empty text-xs px-2 py-0.5 rounded font-medium">Kosong</span>`;

    let actions = '';
    if (docDef.type === 'text') {
      if (hasText) {
        actions = `
          <button class="btn btn-ghost" onclick="App.quickCopy('${docDef.id}')">
            <i data-lucide="copy" class="w-3.5 h-3.5"></i> Salin
          </button>`;
      }
    } else if (docDef.type === 'file' && hasFile) {
      const count = data.files.length;
      actions = `
        <button class="btn btn-ghost" onclick="App.previewDoc('${docDef.id}')">
          <i data-lucide="eye" class="w-3.5 h-3.5"></i> Lihat
        </button>
        <button class="btn btn-ghost" onclick="App.downloadDoc('${docDef.id}')">
          <i data-lucide="download" class="w-3.5 h-3.5"></i> ${count > 1 ? count + ' File' : 'Unduh'}
        </button>`;
    }

    return `
    <div class="doc-card p-4 flex flex-col gap-3" id="card-${docDef.id}">
      <div class="flex items-start justify-between gap-2">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
            <i data-lucide="${docDef.icon}" class="w-4 h-4 text-slate-300"></i>
          </div>
          <div>
            <div class="text-slate-200 text-sm font-medium leading-tight">${docDef.label}</div>
            <div class="text-slate-500 text-xs mt-0.5">${docDef.hint}</div>
          </div>
        </div>
        ${status}
      </div>

      ${hasText ? `<div class="font-mono text-emerald-400 text-sm bg-slate-900 rounded-lg px-3 py-2 truncate" title="${escHtml(data.value)}">${escHtml(data.value)}</div>` : ''}
      ${hasFile && docDef.type === 'file' && data.files[0]?.mime?.startsWith('image/') ? `
        <div class="rounded-lg overflow-hidden border border-slate-700" style="height:80px;">
          <img src="${data.files[0].b64}" class="w-full h-full object-cover" />
        </div>` : ''}

      <div class="flex items-center gap-2 mt-auto pt-1">
        ${actions}
        <button class="btn btn-secondary ml-auto" onclick="App.openDocModal('${docDef.id}')">
          <i data-lucide="${hasText || hasFile ? 'pencil' : 'plus'}" class="w-3.5 h-3.5"></i>
          ${hasText || hasFile ? 'Edit' : 'Tambah'}
        </button>
        ${hasText || hasFile ? `<button class="btn btn-danger p-2" onclick="App.confirmDelete('${docDef.id}', '${escHtml(docDef.label)}')">
          <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
        </button>` : ''}
      </div>
    </div>`;
  },

  /* ─── CV SECTION (multi-upload) ─── */
  renderCvSection() {
    const container = document.getElementById('cv-container');
    const cvData = State.vaultData['cv'] || { files: [] };
    const files  = cvData.files || [];

    if (files.length === 0) {
      container.innerHTML = `
        <div class="doc-card p-5 flex items-center justify-between">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center">
              <i data-lucide="scroll-text" class="w-4 h-4 text-slate-300"></i>
            </div>
            <div>
              <div class="text-slate-200 text-sm font-medium">Curriculum Vitae</div>
              <div class="text-slate-500 text-xs">Belum ada CV yang disimpen</div>
            </div>
          </div>
          <button class="btn btn-secondary" onclick="App.openDocModal('cv')">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i> Tambah CV
          </button>
        </div>`;
    } else {
      const items = files.map((f, idx) => `
        <div class="doc-card p-3 flex items-center gap-3">
          <div class="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center flex-shrink-0">
            <i data-lucide="${f.mime?.startsWith('image/') ? 'image' : 'file-text'}" class="w-4 h-4 text-slate-300"></i>
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-slate-200 text-sm font-medium truncate">${escHtml(f.name)}</div>
            <div class="flex flex-wrap gap-1 mt-1">
              ${(f.tags || []).map(t => `<span class="tag-pill">${escHtml(t)}</span>`).join('')}
              ${!f.tags?.length ? '<span class="text-slate-600 text-xs">Tanpa label</span>' : ''}
            </div>
          </div>
          <div class="flex items-center gap-1.5 flex-shrink-0">
            <button class="btn btn-ghost p-2" onclick="App.downloadSingleFile('cv', ${idx})" title="Unduh">
              <i data-lucide="download" class="w-3.5 h-3.5"></i>
            </button>
            <button class="btn btn-danger p-2" onclick="App.deleteCvFile(${idx})" title="Hapus file ini">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
            </button>
          </div>
        </div>`).join('');

      container.innerHTML = `
        <div class="flex flex-col gap-2">
          ${items}
          <button class="btn btn-secondary w-full mt-1" onclick="App.openDocModal('cv')">
            <i data-lucide="plus" class="w-3.5 h-3.5"></i> Tambah Versi CV
          </button>
        </div>`;
    }
    setTimeout(() => lucide.createIcons(), 50);
  },

  async deleteCvFile(idx) {
    const cvData = State.vaultData['cv'] || { files: [] };
    cvData.files.splice(idx, 1);
    State.vaultData['cv'] = cvData;
    await Store.save();
    App.renderCvSection();
    toast('CV berhasil dihapus.', 'success');
  },

  /* ─── QUICK COPY ─── */
  quickCopy(docId) {
    const data = State.vaultData[docId];
    if (!data?.value) return;
    navigator.clipboard.writeText(data.value).then(() => {
      toast('Nomor udah kecopy cuy!', 'success');
    }).catch(() => {
      // Fallback
      const ta = document.createElement('textarea');
      ta.value = data.value;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
      toast('Nomor udah kecopy cuy!', 'success');
    });
  },

  /* ─── DOC MODAL (Add / Edit) ─── */
  openDocModal(docId) {
    // Find doc schema
    let docDef = null;
    for (const sec of Object.values(DOC_SCHEMA)) {
      docDef = sec.docs.find(d => d.id === docId);
      if (docDef) break;
    }
    if (!docDef) return;

    State.activeDocId   = docId;
    State.activeDocType = docDef.type;
    State.pendingFiles  = [];
    State.cvTags        = [];

    document.getElementById('modal-doc-title').textContent    = docDef.label;
    document.getElementById('modal-doc-subtitle').textContent = docDef.hint;
    document.getElementById('modal-text-section').style.display = 'none';
    document.getElementById('modal-file-section').style.display = 'none';
    document.getElementById('modal-cv-tags-section').style.display = 'none';
    document.getElementById('modal-preview').style.display   = 'none';
    document.getElementById('modal-existing-files').innerHTML = '';
    document.getElementById('modal-cv-tags-list').innerHTML  = '';
    document.getElementById('modal-cv-tag-input').value      = '';
    document.getElementById('modal-file-input').value        = '';

    const existing = State.vaultData[docId];

    if (docDef.type === 'text') {
      document.getElementById('modal-text-section').style.display = 'block';
      document.getElementById('modal-text-input').value = existing?.value || '';
    } else if (docDef.type === 'file' || docDef.type === 'cv') {
      document.getElementById('modal-file-section').style.display = 'block';
      if (docDef.type === 'cv') {
        document.getElementById('modal-cv-tags-section').style.display = 'block';
      }
      if (existing?.files?.length && docDef.type === 'file') {
        App._buildExistingFilesUI(existing.files, docId);
      }
    }

    openModal('modal-doc');
  },

  _buildExistingFilesUI(files, docId) {
    const container = document.getElementById('modal-existing-files');
    container.innerHTML = `
      <div class="text-slate-400 text-xs mb-2">File tersimpan (${files.length})</div>
      ${files.map((f, i) => `
        <div class="flex items-center gap-2 py-1.5 border-b border-slate-700">
          <i data-lucide="${f.mime?.startsWith('image/') ? 'image' : 'file-text'}" class="w-3.5 h-3.5 text-slate-400 flex-shrink-0"></i>
          <span class="text-slate-300 text-xs truncate flex-1">${escHtml(f.name)}</span>
          <button class="btn btn-ghost p-1" onclick="App.downloadSingleFile('${docId}', ${i})" title="Unduh">
            <i data-lucide="download" class="w-3.5 h-3.5"></i>
          </button>
          <button class="text-rose-400 hover:text-rose-300 p-1" onclick="App._removeExistingFile('${docId}', ${i})" title="Hapus">
            <i data-lucide="x" class="w-3.5 h-3.5"></i>
          </button>
        </div>`).join('')}
      <div class="mt-2 text-slate-500 text-xs">Upload file baru untuk tambah atau ganti:</div>
    `;
    setTimeout(() => lucide.createIcons(), 50);
  },

  async _removeExistingFile(docId, idx) {
    if (!State.vaultData[docId]?.files) return;
    State.vaultData[docId].files.splice(idx, 1);
    if (!State.vaultData[docId].files.length) delete State.vaultData[docId];
    await Store.save();
    App.openDocModal(docId); // re-open to refresh
    App.renderSection(State.currentSection);
  },

  async handleModalFileSelect(event) {
    const files = Array.from(event.target.files);
    if (!files.length) return;

    for (const file of files) {
      if (file.size > 10 * 1024 * 1024) { toast(`${file.name} kegedean bos (max 10MB)`, 'error'); continue; }
      const b64 = await fileToBase64(file);
      State.pendingFiles.push({ name: file.name, b64, mime: file.type, tags: [] });

      // Show preview for first file
      if (State.pendingFiles.length === 1) {
        const preview = document.getElementById('modal-preview');
        preview.style.display = 'block';
        if (file.type.startsWith('image/')) {
          document.getElementById('modal-preview-img').src = b64;
          document.getElementById('modal-preview-img').style.display = 'block';
          document.getElementById('modal-preview-pdf').style.display = 'none';
        } else {
          document.getElementById('modal-preview-img').style.display = 'none';
          document.getElementById('modal-preview-pdf').style.display = 'flex';
          document.getElementById('modal-preview-pdf-name').textContent = file.name;
        }
      }
    }
    toast(`${files.length} file siap diupload.`, 'info');
    lucide.createIcons();
  },

  addCvTag() {
    const inp = document.getElementById('modal-cv-tag-input');
    const val = inp.value.trim();
    if (!val) return;
    if (State.cvTags.includes(val)) { inp.value = ''; return; }
    State.cvTags.push(val);
    inp.value = '';
    App._renderCvTagsList();
  },

  _renderCvTagsList() {
    const container = document.getElementById('modal-cv-tags-list');
    container.innerHTML = State.cvTags.map((t, i) => `
      <span class="tag-pill">
        ${escHtml(t)}
        <button onclick="App._removeCvTag(${i})" class="ml-1 text-slate-400 hover:text-white">
          <i data-lucide="x" class="w-2.5 h-2.5"></i>
        </button>
      </span>`).join('');
    setTimeout(() => lucide.createIcons(), 30);
  },

  _removeCvTag(idx) {
    State.cvTags.splice(idx, 1);
    App._renderCvTagsList();
  },

  async saveModalDoc() {
    const docId = State.activeDocId;
    const type  = State.activeDocType;

    if (type === 'text') {
      const val = document.getElementById('modal-text-input').value.trim();
      if (!val) { toast('Isian masih kosong bos.', 'error'); return; }
      State.vaultData[docId] = { value: val, updatedAt: Date.now() };

    } else if (type === 'file') {
      if (!State.pendingFiles.length) {
        // If there are existing files, just close
        closeModal('modal-doc');
        return;
      }
      const existing = State.vaultData[docId]?.files || [];
      State.vaultData[docId] = {
        files: [...existing, ...State.pendingFiles],
        updatedAt: Date.now()
      };

    } else if (type === 'cv') {
      if (!State.pendingFiles.length) { toast('Pilih file CV dulu bos.', 'error'); return; }
      const existing = State.vaultData[docId]?.files || [];
      const newFiles = State.pendingFiles.map(f => ({ ...f, tags: [...State.cvTags] }));
      State.vaultData[docId] = {
        files: [...existing, ...newFiles],
        updatedAt: Date.now()
      };
    }

    await Store.save();
    closeModal('modal-doc');
    App.renderSection(State.currentSection);
    toast('Data berhasil disimpen!', 'success');
    lucide.createIcons();
  },

  /* ─── PREVIEW & DOWNLOAD ─── */
  previewDoc(docId) {
    const data = State.vaultData[docId];
    if (!data?.files?.length) return;
    const file = data.files[0];
    if (file.mime?.startsWith('image/')) {
      const win = window.open();
      win.document.write(`<html><body style="margin:0;background:#0f172a;"><img src="${file.b64}" style="max-width:100%;"/></body></html>`);
    } else {
      // PDF in new tab
      const byteStr = atob(file.b64.split(',')[1] || file.b64);
      const buf = new ArrayBuffer(byteStr.length);
      const view = new Uint8Array(buf);
      for (let i = 0; i < byteStr.length; i++) view[i] = byteStr.charCodeAt(i);
      const blob = new Blob([buf], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob));
    }
  },

  downloadDoc(docId) {
    const data = State.vaultData[docId];
    if (!data?.files?.length) return;
    data.files.forEach(f => App._downloadB64(f.b64, f.name, f.mime));
  },

  downloadSingleFile(docId, idx) {
    const data = State.vaultData[docId];
    if (!data?.files?.[idx]) return;
    const f = data.files[idx];
    App._downloadB64(f.b64, f.name, f.mime);
  },

  _downloadB64(b64, filename, mime) {
    const link = document.createElement('a');
    link.href     = b64.startsWith('data:') ? b64 : `data:${mime};base64,${b64}`;
    link.download = filename;
    link.click();
  },

  /* ─── DELETE ─── */
  confirmDelete(docId, label) {
    document.getElementById('modal-delete-title').textContent = `Hapus "${label}"?`;
    document.getElementById('modal-delete-desc').textContent  = 'Data ini bakal ilang selamanya bos.';
    const btn = document.getElementById('modal-delete-confirm-btn');
    btn.onclick = () => { App.deleteDoc(docId); closeModal('modal-delete'); };
    openModal('modal-delete');
  },

  async deleteDoc(docId) {
    delete State.vaultData[docId];
    await Store.save();
    App.renderSection(State.currentSection);
    toast('Data berhasil dihapus.', 'success');
    lucide.createIcons();
  },

  /* ─── EXPORT / IMPORT .vault ─── */
  async exportVault() {
    if (!State.pin) { toast('Login dulu bos!', 'error'); return; }
    const raw = await Store.getRaw();
    if (!raw) { toast('Vault masih kosong!', 'info'); return; }

    const meta = await Store.getMeta();
    const exportObj = { version: 1, meta, encrypted: raw, exportedAt: Date.now() };
    const blob = new Blob([JSON.stringify(exportObj)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `smartvault_backup_${dateStr()}.vault`;
    a.click();
    URL.revokeObjectURL(url);
    toast('File .vault berhasil diunduh!', 'success');
  },

  showImportModal() {
    window._importFile = null;
    document.getElementById('import-drop').innerHTML = `
      <i data-lucide="file-up" class="w-6 h-6 text-slate-500 mx-auto mb-2"></i>
      <div class="text-slate-400 text-sm">Klik atau drop file .vault di sini</div>`;
    document.getElementById('import-pin').value = '';
    document.getElementById('import-error').style.display = 'none';
    openModal('modal-import');
    setTimeout(() => lucide.createIcons(), 50);
  },

  handleImportFile(event) {
    const file = event.target.files[0];
    if (!file) return;
    window._importFile = file;
    document.getElementById('import-drop').innerHTML = `
      <i data-lucide="file-check" class="w-5 h-5 text-emerald-500 mx-auto mb-1"></i>
      <div class="text-emerald-500 text-sm">${file.name}</div>`;
    setTimeout(() => lucide.createIcons(), 30);
  },

  async importVaultFile() {
    const pin  = document.getElementById('import-pin').value;
    const err  = document.getElementById('import-error');
    const file = window._importFile;
    err.style.display = 'none';

    if (!file) { err.textContent = 'Pilih file .vault dulu bos.'; err.style.display = 'block'; return; }
    if (!pin)  { err.textContent = 'Masukin PIN bos.';           err.style.display = 'block'; return; }

    const text = await readFileAsText(file);
    let parsed;
    try { parsed = JSON.parse(text); } catch {
      err.textContent = 'File rusak atau bukan format .vault.'; err.style.display = 'block'; return;
    }

    // Verify PIN
    if (parsed.meta?.pinHash && Crypto.hash(pin) !== parsed.meta.pinHash) {
      err.textContent = 'PIN salah bos.'; err.style.display = 'block'; return;
    }

    // Decrypt check
    const dec = Crypto.decrypt(parsed.encrypted, pin);
    if (!dec) { err.textContent = 'Gagal dekripsi. PIN mungkin salah.'; err.style.display = 'block'; return; }

    // Restore
    await Store.setMeta(parsed.meta);
    await Store.setRaw(parsed.encrypted);

    closeModal('modal-import');
    toast('Restore berhasil! Login sekarang.', 'success');

    // Redirect to login
    App.lockVault();
  },

  /* ─── CHANGE PIN ─── */
  async changePIN() {
    const old  = document.getElementById('cp-old').value;
    const n1   = document.getElementById('cp-new1').value;
    const n2   = document.getElementById('cp-new2').value;
    const err  = document.getElementById('cp-error');
    err.style.display = 'none';

    const meta = await Store.getMeta();
    if (Crypto.hash(old) !== meta.pinHash) { err.textContent = 'PIN lama salah bos.'; err.style.display = 'block'; return; }
    if (n1.length < 6) { err.textContent = 'PIN baru minimal 6 karakter.'; err.style.display = 'block'; return; }
    if (n1 !== n2)     { err.textContent = 'Konfirmasi PIN beda bos.'; err.style.display = 'block'; return; }

    // Re-encrypt with new PIN
    const raw    = await Store.getRaw();
    const dec    = Crypto.decrypt(raw, old);
    if (!dec) { err.textContent = 'Gagal dekripsi data lama.'; err.style.display = 'block'; return; }

    const newEnc = Crypto.encrypt(dec, n1);
    await Store.setRaw(newEnc);
    await Store.setMeta({ ...meta, pinHash: Crypto.hash(n1) });
    State.pin = n1;

    closeModal('modal-change-pin');
    toast('PIN berhasil diganti!', 'success');
  },

  /* ─── GOOGLE DRIVE ─── */
  openModal(id) { openModal(id); },
  closeModal(id) { closeModal(id); },

  driveAuth() {
    if (GOOGLE_CLIENT_ID === 'GANTI_DENGAN_CLIENT_ID_KAMU.apps.googleusercontent.com') {
      toast('Set dulu Client ID Google lu di app.js bos!', 'error', 5000);
      return;
    }

    const client = google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope:     GOOGLE_SCOPE,
      callback:  (resp) => {
        if (resp.error) { toast('Gagal login Google: ' + resp.error, 'error'); return; }
        State.driveToken = resp.access_token;

        // Get user info
        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${State.driveToken}` }
        }).then(r => r.json()).then(u => {
          State.driveUser = u;
          document.getElementById('drive-user-info').textContent = `Connected: ${u.email || u.name}`;
          document.getElementById('btn-drive-auth').style.display = 'none';
          document.getElementById('btn-drive-logout').style.display = 'flex';
          document.getElementById('btn-drive-backup').disabled  = false;
          document.getElementById('btn-drive-restore').disabled = false;
          toast('Login Google berhasil!', 'success');
        });
      }
    });
    client.requestAccessToken();
  },

  driveLogout() {
    if (State.driveToken) {
      google.accounts.oauth2.revoke(State.driveToken, () => {});
    }
    State.driveToken  = null;
    State.driveUser   = null;
    State.driveFileId = null;
    document.getElementById('drive-user-info').textContent     = 'Belum connect ke Google...';
    document.getElementById('btn-drive-auth').style.display    = 'flex';
    document.getElementById('btn-drive-logout').style.display  = 'none';
    document.getElementById('btn-drive-backup').disabled       = true;
    document.getElementById('btn-drive-restore').disabled      = true;
    toast('Disconnect dari Google.', 'info');
  },

  async driveBackup() {
    if (!State.driveToken) { toast('Login Google dulu bos!', 'error'); return; }
    if (!State.pin)        { toast('Vault belum kebuka!', 'error');    return; }

    const raw = await Store.getRaw();
    if (!raw) { toast('Vault masih kosong!', 'info'); return; }

    const meta     = await Store.getMeta();
    const payload  = JSON.stringify({ version: 1, meta, encrypted: raw, syncedAt: Date.now() });
    const progress = document.getElementById('drive-progress');
    const fillEl   = document.getElementById('drive-progress-fill');
    const textEl   = document.getElementById('drive-progress-text');

    progress.style.display = 'block';
    textEl.textContent = 'Nyiapin file...';
    fillEl.style.width = '20%';

    try {
      // Check if file already exists
      let fileId = State.driveFileId;
      if (!fileId) {
        textEl.textContent = 'Cek file lama...';
        fillEl.style.width = '40%';
        const listResp = await fetch(
          `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${DRIVE_FILENAME}'&fields=files(id)`,
          { headers: { Authorization: `Bearer ${State.driveToken}` } }
        );
        const listJson = await listResp.json();
        fileId = listJson.files?.[0]?.id || null;
        State.driveFileId = fileId;
      }

      textEl.textContent = 'Upload ke Drive...';
      fillEl.style.width = '70%';

      let response;
      const metadata = { name: DRIVE_FILENAME, parents: ['appDataFolder'] };
      const blob     = new Blob([payload], { type: 'application/json' });
      const form     = new FormData();
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
      form.append('file', blob);

      if (fileId) {
        // Update existing
        response = await fetch(
          `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`,
          { method: 'PATCH', headers: { Authorization: `Bearer ${State.driveToken}` }, body: form }
        );
      } else {
        // Create new
        response = await fetch(
          'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
          { method: 'POST', headers: { Authorization: `Bearer ${State.driveToken}` }, body: form }
        );
        const rj = await response.json();
        State.driveFileId = rj.id;
      }

      fillEl.style.width = '100%';
      textEl.textContent = 'Selesai!';

      const syncTime = new Date().toLocaleString('id-ID');
      const syncEl   = document.getElementById('drive-last-sync');
      syncEl.textContent  = `Terakhir sync: ${syncTime}`;
      syncEl.style.display = 'block';

      toast('Vault berhasil di-backup ke Google Drive!', 'success');
      setTimeout(() => { progress.style.display = 'none'; fillEl.style.width = '0%'; }, 2000);

    } catch (e) {
      toast('Gagal backup ke Drive: ' + e.message, 'error');
      progress.style.display = 'none';
    }
  },

  async driveRestore() {
    if (!State.driveToken) { toast('Login Google dulu bos!', 'error'); return; }

    const progress = document.getElementById('drive-progress');
    const fillEl   = document.getElementById('drive-progress-fill');
    const textEl   = document.getElementById('drive-progress-text');
    progress.style.display = 'block';
    textEl.textContent = 'Cari file backup...';
    fillEl.style.width = '30%';

    try {
      // Find file
      const listResp = await fetch(
        `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${DRIVE_FILENAME}'&fields=files(id)`,
        { headers: { Authorization: `Bearer ${State.driveToken}` } }
      );
      const listJson = await listResp.json();
      const fileId   = listJson.files?.[0]?.id;

      if (!fileId) { toast('Belum ada backup di Drive bos!', 'info'); progress.style.display = 'none'; return; }

      textEl.textContent = 'Download data...';
      fillEl.style.width = '70%';

      const dlResp  = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        { headers: { Authorization: `Bearer ${State.driveToken}` } }
      );
      const dlText  = await dlResp.text();
      const parsed  = JSON.parse(dlText);

      // Verify with current PIN
      const dec = Crypto.decrypt(parsed.encrypted, State.pin);
      if (!dec) {
        toast('PIN yang kepake buat backup beda sama PIN sekarang bos!', 'error', 5000);
        progress.style.display = 'none';
        return;
      }

      fillEl.style.width = '90%';

      await Store.setMeta(parsed.meta);
      await Store.setRaw(parsed.encrypted);
      State.vaultData = JSON.parse(dec);
      State.driveFileId = fileId;

      fillEl.style.width = '100%';
      textEl.textContent = 'Restore selesai!';

      App.renderSection(State.currentSection);
      toast('Data berhasil ditarik dari Google Drive!', 'success');
      setTimeout(() => { progress.style.display = 'none'; fillEl.style.width = '0%'; }, 2000);

    } catch (e) {
      toast('Gagal restore: ' + e.message, 'error');
      progress.style.display = 'none';
    }
  },

};

/* ══════════════════════════════════════════════════════════════
   UTILITY FUNCTIONS
══════════════════════════════════════════════════════════════ */
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = e => resolve(e.target.result);
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function escHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function dateStr() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}

/* ══════════════════════════════════════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    ['modal-doc','modal-import','modal-drive','modal-change-pin','modal-delete']
      .forEach(id => closeModal(id));
  }
  if (e.key === 'Enter' && document.getElementById('modal-doc').style.display !== 'none') {
    // Ctrl+Enter to save doc modal
    if (e.ctrlKey) App.saveModalDoc();
  }
});

/* ══════════════════════════════════════════════════════════════
   DRAG-AND-DROP for modal file zone
══════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', () => {
  const dropZone = document.getElementById('modal-drop-zone');
  if (dropZone) {
    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', async e => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const files = Array.from(e.dataTransfer.files);
      for (const file of files) {
        if (file.size > 10 * 1024 * 1024) { toast(`${file.name} kegedean (max 10MB)`, 'error'); continue; }
        const b64 = await fileToBase64(file);
        State.pendingFiles.push({ name: file.name, b64, mime: file.type, tags: [] });
      }
      toast(`${files.length} file siap diupload.`, 'info');
    });
  }

  // Enter key on CV tag input
  const cvTagInput = document.getElementById('modal-cv-tag-input');
  if (cvTagInput) {
    cvTagInput.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); App.addCvTag(); } });
  }
});

/* ══════════════════════════════════════════════════════════════
   BOOT
══════════════════════════════════════════════════════════════ */
window.addEventListener('DOMContentLoaded', init);
