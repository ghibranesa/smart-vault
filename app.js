/**
 * SmartVault — app.js  (v2, fixed)
 * ─────────────────────────────────────
 * SETUP WAJIB:
 *  GOOGLE_CLIENT_ID sudah diisi. Pastikan domain lo sudah masuk di
 *  "Authorized JavaScript Origins" di Google Cloud Console.
 */

/* ═══════════════════════════════════════════════
   CONFIG
═══════════════════════════════════════════════ */
const CFG = {
  GOOGLE_CLIENT_ID : '280494613299-vcrnbqvj8ni2pub7gq5q2auodcleb2sf.apps.googleusercontent.com',
  GOOGLE_SCOPE     : 'https://www.googleapis.com/auth/drive.appdata',
  DB_KEY           : 'sv_vault',
  META_KEY         : 'sv_meta',
  DRIVE_FILE       : 'vault_backup.json',
};

/* ═══════════════════════════════════════════════
   DOCUMENT SCHEMA
═══════════════════════════════════════════════ */
const SCHEMA = {
  identitas: {
    label    : 'Identitas & Alamat',
    subtitle : 'Nomor identitas & alamat domisili lu',
    docs: [
      { id:'ktp',         label:'NIK (KTP)',             type:'text', icon:'credit-card',  hint:'cth: 3201XXXXXXXXXX0001' },
      { id:'npwp',        label:'NPWP',                  type:'text', icon:'file-badge',   hint:'cth: 00.000.000.0-000.000' },
      { id:'bpjs',        label:'No. BPJS Kesehatan',    type:'text', icon:'heart-pulse',  hint:'cth: 0001234567890' },
      { id:'alamat_asal', label:'Alamat Rumah Asal',     type:'text', icon:'home',         hint:'Jl. Merdeka No.1, RT/RW 01/01...' },
      { id:'alamat_kos',  label:'Alamat Kos / Domisili', type:'text', icon:'map-pin',      hint:'Jl. Kost Nyaman No.12...' },
    ]
  },
  mobilitas: {
    label    : 'Mobilitas',
    subtitle : 'SIM & surat kendaraan lu',
    docs: [
      { id:'sim_c', label:'SIM C', type:'file', icon:'car',       hint:'Foto atau scan SIM C lu' },
      { id:'stnk',  label:'STNK',  type:'file', icon:'file-scan', hint:'STNK kendaraan lu' },
    ]
  },
  legalitas: {
    label    : 'Legalitas & Karir',
    subtitle : 'Surat-surat penting buat kerjaan',
    docs: [
      { id:'cv',   label:'Curriculum Vitae (CV)', type:'cv',   icon:'scroll-text', hint:'Bisa upload banyak versi CV' },
      { id:'skck', label:'SKCK',                  type:'file', icon:'shield',       hint:'Surat Keterangan Catatan Kepolisian' },
      { id:'ak1',  label:'Kartu AK-1',            type:'file', icon:'user-check',  hint:'Kartu Tanda Pencari Kerja' },
    ]
  },
  pendidikan: {
    label    : 'Pendidikan Formal',
    subtitle : 'Ijazah & transkrip pendidikan formal',
    docs: [
      { id:'ijazah_d3',    label:'Ijazah Diploma III',   type:'file', icon:'graduation-cap', hint:'Ijazah D3 lu' },
      { id:'skl_d3',       label:'SKL Diploma III',       type:'file', icon:'file-check',     hint:'Surat Keterangan Lulus D3' },
      { id:'skpi_d3',      label:'SKPI Diploma III',      type:'file', icon:'file-badge-2',   hint:'Surat Keterangan Pendamping Ijazah D3' },
      { id:'transkrip_d3', label:'Transkrip D3',          type:'file', icon:'table-2',        hint:'Transkrip nilai D3 lu' },
      { id:'ijazah_smk',   label:'Ijazah SMK',            type:'file', icon:'graduation-cap', hint:'Ijazah SMK lu' },
      { id:'ijazah_smp',   label:'Ijazah SMP',            type:'file', icon:'graduation-cap', hint:'Ijazah SMP lu' },
      { id:'ijazah_sd',    label:'Ijazah SD',             type:'file', icon:'graduation-cap', hint:'Ijazah SD lu' },
    ]
  },
  sertifikasi: {
    label    : 'Sertifikasi & Bahasa',
    subtitle : 'Sertifikat kompetensi & bahasa lu',
    docs: [
      { id:'sertif_komp', label:'Sertifikat Kompetensi', type:'file', icon:'award',     hint:'Sertifikat kompetensi keahlian lu' },
      { id:'toeic_tepps', label:'TOEIC TEPPS',           type:'file', icon:'languages', hint:'Sertifikat TOEIC TEPPS' },
      { id:'toeic_smk',   label:'TOEIC SMK',             type:'file', icon:'languages', hint:'Sertifikat TOEIC SMK lu' },
      { id:'toefl_smk',   label:'TOEFL SMK',             type:'file', icon:'languages', hint:'Sertifikat TOEFL SMK lu' },
    ]
  },
  pasfoto: {
    label    : 'Pasfoto Formal',
    subtitle : 'Foto resmi berbagai keperluan',
    docs: [
      { id:'foto_merah', label:'Pasfoto Latar Merah',  type:'file', icon:'image', hint:'JPEG/PNG latar merah' },
      { id:'foto_biru',  label:'Pasfoto Latar Biru',   type:'file', icon:'image', hint:'JPEG/PNG latar biru' },
      { id:'foto_putih', label:'Pasfoto Latar Putih',  type:'file', icon:'image', hint:'JPEG/PNG latar putih' },
    ]
  }
};

/* ═══════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════ */
const S = {
  pin          : null,
  loggedIn     : false,
  currentSec   : 'identitas',
  vault        : {},        // decrypted data, in-memory only
  // modal temp
  docId        : null,
  docType      : null,
  pendingFiles : [],
  cvTags       : [],
  // drive
  driveToken   : null,
  driveFileId  : null,
};

/* ═══════════════════════════════════════════════
   CRYPTO
═══════════════════════════════════════════════ */
function enc(plain, key) {
  return CryptoJS.AES.encrypt(plain, key).toString();
}
function dec(cipher, key) {
  try {
    const b = CryptoJS.AES.decrypt(cipher, key);
    return b.toString(CryptoJS.enc.Utf8) || null;
  } catch { return null; }
}
function sha256(str) {
  return CryptoJS.SHA256(str).toString();
}

/* ═══════════════════════════════════════════════
   STORAGE
═══════════════════════════════════════════════ */
const DB = {
  async getMeta()   { return (await localforage.getItem(CFG.META_KEY)) || {}; },
  async setMeta(o)  { return localforage.setItem(CFG.META_KEY, o); },
  async getRaw()    { return localforage.getItem(CFG.DB_KEY); },
  async setRaw(v)   { return localforage.setItem(CFG.DB_KEY, v); },

  async load(pin) {
    const raw = await DB.getRaw();
    if (!raw) { S.vault = {}; return true; }
    const plain = dec(raw, pin);
    if (!plain) return false;
    try { S.vault = JSON.parse(plain); return true; }
    catch { return false; }
  },

  async save() {
    if (!S.pin) return;
    const encrypted = enc(JSON.stringify(S.vault), S.pin);
    await DB.setRaw(encrypted);
    flashSaved();
  }
};

/* ═══════════════════════════════════════════════
   TOAST
═══════════════════════════════════════════════ */
function toast(msg, type = 'info', ms = 3200) {
  const wrap = document.getElementById('toast-wrap');
  const el   = document.createElement('div');
  const icon = { ok:'check-circle', err:'x-circle', info:'info' }[type] || 'info';
  el.className   = `toast ${type}`;
  el.innerHTML   = `<i data-lucide="${icon}" style="width:14px;height:14px;flex-shrink:0;"></i><span>${msg}</span>`;
  wrap.appendChild(el);
  lucide.createIcons({ element: el });
  setTimeout(() => {
    el.style.transition = 'opacity .25s';
    el.style.opacity    = '0';
    setTimeout(() => el.remove(), 280);
  }, ms);
}

function flashSaved() {
  const el = document.getElementById('saved-badge');
  if (!el) return;
  el.style.display = 'flex';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 2400);
}

/* ═══════════════════════════════════════════════
   MODAL HELPERS
═══════════════════════════════════════════════ */
function showModal(id) {
  const el = document.getElementById(id);
  if (el) { el.style.display = 'flex'; setTimeout(() => lucide.createIcons(), 30); }
}
function hideModal(id) {
  const el = document.getElementById(id);
  if (el) el.style.display = 'none';
}

/* ═══════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════ */
async function init() {
  lucide.createIcons();

  document.getElementById('main-layout').style.display = 'flex';

  const meta = await DB.getMeta();

  if (!meta.pinHash) {
    document.getElementById('screen-auth').style.display  = 'flex';
    document.getElementById('auth-setup').style.display   = 'block';
    document.getElementById('auth-login').style.display   = 'none';
    setupPinListeners('setup');
  } else {
    document.getElementById('screen-auth').style.display  = 'flex';
    document.getElementById('auth-setup').style.display   = 'none';
    document.getElementById('auth-login').style.display   = 'block';
    buildPinDots('');
    setupPinListeners('login');
  }

  initDropZone('mdoc-dropzone', async (files) => {
    for (const f of files) await App._addPendingFile(f);
  });
  initDropZone('import-drop', (files) => {
    if (files[0]) App._setImportFile(files[0]);
  });

  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
      ['modal-doc','modal-import','modal-drive','modal-change-pin','modal-delete'].forEach(hideModal);
    }
    if (e.ctrlKey && e.key === 'Enter' && document.getElementById('modal-doc').style.display !== 'none') {
      App.saveDoc();
    }
  });

  const tagInp = document.getElementById('mdoc-tag-inp');
  if (tagInp) tagInp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); App.addTag(); } });
}

function setupPinListeners(mode) {
  if (mode === 'login') {
    const inp = document.getElementById('login-pin');
    if (inp) {
      inp.oninput   = e => buildPinDots(e.target.value);
      inp.onkeydown = e => { if (e.key === 'Enter') App.loginVault(); };
    }
  } else {
    const p2 = document.getElementById('setup-pin2');
    if (p2) p2.addEventListener('keydown', e => { if (e.key === 'Enter') App.setupVault(); });
  }
}

function buildPinDots(val) {
  const el = document.getElementById('pin-dots');
  if (!el) return;
  const filled = Math.min(val.length, 8);
  const total  = Math.max(filled, 6);
  el.innerHTML = Array.from({length: total}, (_, i) =>
    `<div class="pin-dot ${i < filled ? 'filled' : ''}"></div>`
  ).join('');
}

function initDropZone(id, cb) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener('dragover', e => { e.preventDefault(); el.classList.add('dragover'); });
  el.addEventListener('dragleave', () => el.classList.remove('dragover'));
  el.addEventListener('drop', e => {
    e.preventDefault(); el.classList.remove('dragover');
    cb(Array.from(e.dataTransfer.files));
  });
}

/* ═══════════════════════════════════════════════
   APP
═══════════════════════════════════════════════ */
const App = {

  /* ── AUTH ── */
  async setupVault() {
    const p1  = qs('setup-pin1').value;
    const p2  = qs('setup-pin2').value;
    const err = qs('setup-err');

    clearErr(err);
    if (p1.length < 6) return showErr(err, 'PIN minimal 6 karakter bro.');
    if (p1 !== p2)     return showErr(err, 'PIN-nya beda bos.');

    await DB.setMeta({ pinHash: sha256(p1), createdAt: Date.now() });
    S.pin   = p1;
    S.vault = {};
    await DB.save();
    toast('Vault berhasil dibuat!', 'ok');
    App._enterApp();
  },

  async loginVault() {
    const pin = qs('login-pin').value;
    const err = qs('login-err');
    clearErr(err);

    const meta = await DB.getMeta();
    if (sha256(pin) !== meta.pinHash) return showErr(err, 'PIN salah bos. Coba lagi.');

    const ok = await DB.load(pin);
    if (!ok) return showErr(err, 'Gagal dekripsi. Data mungkin corrupt.');

    S.pin = pin;
    toast('Vault kebuka!', 'ok');
    App._enterApp();
  },

  lockVault() {
    S.pin = null; S.loggedIn = false; S.vault = {}; S.driveToken = null;
    document.getElementById('screen-auth').style.display = 'flex';
    document.getElementById('auth-login').style.display  = 'block';
    document.getElementById('auth-setup').style.display  = 'none';
    qs('login-pin').value = '';
    buildPinDots('');
    clearErr(qs('login-err'));
    lucide.createIcons();
    toast('Vault udah dikunci.', 'info');
  },

  _enterApp() {
    document.getElementById('screen-auth').style.display = 'none';
    S.loggedIn = true;
    App.switchSection('identitas', document.querySelector('.nav-item[data-sec="identitas"]'));
    setTimeout(() => lucide.createIcons(), 80);
  },

  /* ── SECTION ── */
  switchSection(secId, navEl) {
    document.querySelectorAll('.sec-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));

    const sec = document.getElementById(`sec-${secId}`);
    if (sec) sec.style.display = secId === 'legalitas' ? 'block' : 'grid';
    if (navEl) navEl.classList.add('active');

    S.currentSec = secId;
    const meta   = SCHEMA[secId];
    qs('sec-title').textContent    = meta?.label    || secId;
    qs('sec-subtitle').textContent = meta?.subtitle || '';

    App.renderSection(secId);
    setTimeout(() => lucide.createIcons(), 60);
  },

  renderSection(secId) {
    const schema = SCHEMA[secId];
    if (!schema) return;

    if (secId === 'legalitas') {
      App._renderLegalitas();
    } else {
      const grid = document.getElementById(`sec-${secId}`);
      if (!grid) return;
      grid.innerHTML = schema.docs.map(d => App._card(d)).join('');
    }
    setTimeout(() => lucide.createIcons(), 40);
  },

  _renderLegalitas() {
    const el    = document.getElementById('sec-legalitas');
    const rest  = SCHEMA.legalitas.docs.filter(d => d.id !== 'cv');

    el.innerHTML = `
      <div style="margin-bottom:6px;display:flex;align-items:center;justify-content:space-between;">
        <div style="font-size:0.75rem;color:#64748b;font-weight:600;">Curriculum Vitae</div>
        <div style="font-size:0.72rem;color:#475569;">Bisa upload banyak versi</div>
      </div>
      <div id="cv-list" style="margin-bottom:20px;"></div>
      <div style="font-size:0.75rem;color:#64748b;font-weight:600;margin-bottom:10px;">Dokumen Legalitas</div>
      <div class="doc-grid">${rest.map(d => App._card(d)).join('')}</div>`;

    App._renderCvList();
    setTimeout(() => lucide.createIcons(), 40);
  },

  _renderCvList() {
    const el    = document.getElementById('cv-list');
    if (!el) return;
    const files = S.vault['cv']?.files || [];

    if (!files.length) {
      el.innerHTML = `
        <div class="doc-card" style="padding:16px;display:flex;align-items:center;justify-content:space-between;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:34px;height:34px;border-radius:8px;background:#334155;display:flex;align-items:center;justify-content:center;">
              <i data-lucide="scroll-text" style="width:15px;height:15px;color:#94a3b8;"></i>
            </div>
            <div>
              <div style="font-size:0.85rem;font-weight:500;color:#cbd5e1;">Curriculum Vitae</div>
              <div style="font-size:0.75rem;color:#475569;">Belum ada CV tersimpan</div>
            </div>
          </div>
          <button class="btn btn-secondary" onclick="App.openDocModal('cv')">
            <i data-lucide="plus" style="width:13px;height:13px;"></i> Tambah CV
          </button>
        </div>`;
    } else {
      const items = files.map((f, i) => `
        <div class="doc-card" style="padding:12px;display:flex;align-items:center;gap:10px;margin-bottom:8px;">
          <div style="width:32px;height:32px;border-radius:7px;background:#334155;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <i data-lucide="${f.mime?.startsWith('image/') ? 'image' : 'file-text'}" style="width:14px;height:14px;color:#94a3b8;"></i>
          </div>
          <div style="flex:1;min-width:0;">
            <div style="font-size:0.82rem;font-weight:500;color:#cbd5e1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${esc(f.name)}</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px;">
              ${(f.tags||[]).map(t=>`<span class="tag-pill">${esc(t)}</span>`).join('') || '<span style="font-size:0.72rem;color:#475569;">Tanpa label</span>'}
            </div>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;">
            <button class="btn btn-ghost btn-icon" onclick="App.downloadFile('cv',${i})" title="Unduh">
              <i data-lucide="download" style="width:13px;height:13px;"></i>
            </button>
            <button class="btn btn-danger btn-icon" onclick="App.deleteCvFile(${i})" title="Hapus">
              <i data-lucide="trash-2" style="width:13px;height:13px;"></i>
            </button>
          </div>
        </div>`).join('');

      el.innerHTML = items + `
        <button class="btn btn-secondary" style="width:100%;margin-top:4px;" onclick="App.openDocModal('cv')">
          <i data-lucide="plus" style="width:13px;height:13px;"></i> Tambah Versi CV
        </button>`;
    }
    setTimeout(() => lucide.createIcons(), 30);
  },

  /* ── CARD ── */
  _card(doc) {
    const data    = S.vault[doc.id];
    const hasTxt  = doc.type === 'text' && !!data?.value;
    const hasFile = doc.type === 'file' && !!data?.files?.length;
    const filled  = hasTxt || hasFile;

    const badge = filled
      ? `<span class="badge-on"  style="font-size:0.7rem;padding:2px 8px;border-radius:4px;">Terisi</span>`
      : `<span class="badge-off" style="font-size:0.7rem;padding:2px 8px;border-radius:4px;">Kosong</span>`;

    let thumb = '';
    if (hasFile && data.files[0]?.mime?.startsWith('image/')) {
      thumb = `<div style="border-radius:6px;overflow:hidden;height:70px;margin-bottom:4px;border:1px solid #334155;">
        <img src="${data.files[0].b64}" style="width:100%;height:100%;object-fit:cover;" /></div>`;
    }

    let txtPrev = '';
    if (hasTxt) {
      txtPrev = `<div style="font-family:monospace;font-size:0.82rem;color:#10b981;background:#0f172a;border-radius:6px;padding:7px 10px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${esc(data.value)}">${esc(data.value)}</div>`;
    }

    let actions = '';
    if (hasTxt) {
      actions = `<button class="btn btn-ghost" onclick="App.quickCopy('${doc.id}')">
        <i data-lucide="copy" style="width:12px;height:12px;"></i> Salin
      </button>`;
    }
    if (hasFile) {
      actions = `
        <button class="btn btn-ghost" onclick="App.previewDoc('${doc.id}')">
          <i data-lucide="eye" style="width:12px;height:12px;"></i> Lihat
        </button>
        <button class="btn btn-ghost" onclick="App.downloadDoc('${doc.id}')">
          <i data-lucide="download" style="width:12px;height:12px;"></i> Unduh
        </button>`;
    }

    return `
    <div class="doc-card" style="padding:14px;display:flex;flex-direction:column;gap:10px;" id="card-${doc.id}">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;">
        <div style="display:flex;align-items:center;gap:10px;">
          <div style="width:34px;height:34px;border-radius:8px;background:#334155;display:flex;align-items:center;justify-content:center;flex-shrink:0;">
            <i data-lucide="${doc.icon}" style="width:15px;height:15px;color:#94a3b8;"></i>
          </div>
          <div>
            <div style="font-size:0.85rem;font-weight:500;color:#cbd5e1;line-height:1.3;">${esc(doc.label)}</div>
            <div style="font-size:0.72rem;color:#475569;margin-top:1px;">${esc(doc.hint)}</div>
          </div>
        </div>
        ${badge}
      </div>
      ${thumb}${txtPrev}
      <div style="display:flex;align-items:center;gap:6px;margin-top:auto;">
        ${actions}
        <button class="btn btn-secondary" style="margin-left:auto;" onclick="App.openDocModal('${doc.id}')">
          <i data-lucide="${filled ? 'pencil' : 'plus'}" style="width:12px;height:12px;"></i>
          ${filled ? 'Edit' : 'Tambah'}
        </button>
        ${filled ? `<button class="btn btn-danger btn-icon" onclick="App.confirmDelete('${doc.id}','${esc(doc.label)}')">
          <i data-lucide="trash-2" style="width:12px;height:12px;"></i>
        </button>` : ''}
      </div>
    </div>`;
  },

  /* ── QUICK COPY ── */
  quickCopy(id) {
    const val = S.vault[id]?.value;
    if (!val) return;
    navigator.clipboard.writeText(val)
      .then(() => toast('Nomor udah kecopy cuy!', 'ok'))
      .catch(() => {
        const ta = Object.assign(document.createElement('textarea'), { value: val });
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        toast('Nomor udah kecopy cuy!', 'ok');
      });
  },

  /* ── DOC MODAL ── */
  openDocModal(docId) {
    let def = null;
    for (const sec of Object.values(SCHEMA)) {
      def = sec.docs.find(d => d.id === docId);
      if (def) break;
    }
    if (!def) return;

    S.docId        = docId;
    S.docType      = def.type;
    S.pendingFiles = [];
    S.cvTags       = [];

    qs('mdoc-title').textContent    = def.label;
    qs('mdoc-subtitle').textContent = def.hint;
    qs('mdoc-text-sec').style.display  = 'none';
    qs('mdoc-file-sec').style.display  = 'none';
    qs('mdoc-preview').style.display   = 'none';
    qs('mdoc-existing').innerHTML      = '';
    qs('mdoc-tags-list').innerHTML     = '';
    qs('mdoc-tag-inp').value           = '';
    qs('mdoc-file-input').value        = '';

    const existing = S.vault[docId];

    if (def.type === 'text') {
      qs('mdoc-text-sec').style.display = 'block';
      qs('mdoc-text').value = existing?.value || '';
    } else {
      qs('mdoc-file-sec').style.display = 'block';
      if (def.type === 'cv') {
        qs('mdoc-cv-tags').style.display = 'block';
      } else {
        qs('mdoc-cv-tags').style.display = 'none';
        if (existing?.files?.length) App._showExistingFiles(existing.files, docId);
      }
    }

    showModal('modal-doc');
  },

  _showExistingFiles(files, docId) {
    qs('mdoc-existing').innerHTML = `
      <div style="font-size:0.75rem;color:#94a3b8;margin-bottom:6px;">File tersimpan (${files.length})</div>
      ${files.map((f,i) => `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #334155;">
          <i data-lucide="${f.mime?.startsWith('image/') ? 'image' : 'file-text'}" style="width:13px;height:13px;color:#64748b;flex-shrink:0;"></i>
          <span style="font-size:0.8rem;color:#94a3b8;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${esc(f.name)}</span>
          <button class="btn btn-ghost btn-icon" onclick="App.downloadFile('${docId}',${i})" title="Unduh">
            <i data-lucide="download" style="width:12px;height:12px;"></i>
          </button>
          <button class="btn btn-icon" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;"
            onclick="App._removeExistingFile('${docId}',${i})" title="Hapus">
            <i data-lucide="x" style="width:13px;height:13px;"></i>
          </button>
        </div>`).join('')}
      <div style="font-size:0.72rem;color:#475569;margin-top:8px;">Upload file baru untuk ganti atau tambah:</div>`;
    setTimeout(() => lucide.createIcons(), 30);
  },

  async _removeExistingFile(docId, idx) {
    if (!S.vault[docId]?.files) return;
    S.vault[docId].files.splice(idx, 1);
    if (!S.vault[docId].files.length) delete S.vault[docId];
    await DB.save();
    App.openDocModal(docId);
    App.renderSection(S.currentSec);
  },

  async handleFileSelect(event) {
    for (const file of Array.from(event.target.files)) {
      await App._addPendingFile(file);
    }
  },

  async _addPendingFile(file) {
    if (file.size > 10 * 1024 * 1024) { toast(`${file.name} kegedean bos (maks 10MB)`, 'err'); return; }
    const b64 = await toBase64(file);
    S.pendingFiles.push({ name: file.name, b64, mime: file.type, tags: [] });

    if (S.pendingFiles.length === 1) {
      qs('mdoc-preview').style.display = 'block';
      if (file.type.startsWith('image/')) {
        qs('mdoc-prev-img').src           = b64;
        qs('mdoc-prev-img').style.display = 'block';
        qs('mdoc-prev-pdf').style.display = 'none';
      } else {
        qs('mdoc-prev-img').style.display    = 'none';
        qs('mdoc-prev-pdf').style.display    = 'flex';
        qs('mdoc-prev-pdf-name').textContent = file.name;
      }
      setTimeout(() => lucide.createIcons(), 20);
    }
    toast(`${file.name} siap diupload`, 'info', 2000);
  },

  addTag() {
    const inp = qs('mdoc-tag-inp');
    const val = inp.value.trim();
    if (!val || S.cvTags.includes(val)) { inp.value = ''; return; }
    S.cvTags.push(val);
    inp.value = '';
    App._renderTags();
  },

  _renderTags() {
    qs('mdoc-tags-list').innerHTML = S.cvTags.map((t, i) => `
      <span class="tag-pill">${esc(t)}
        <button onclick="App._removeTag(${i})" style="background:none;border:none;cursor:pointer;color:#94a3b8;padding:0;display:flex;align-items:center;margin-left:2px;">
          <i data-lucide="x" style="width:9px;height:9px;"></i>
        </button>
      </span>`).join('');
    setTimeout(() => lucide.createIcons(), 20);
  },

  _removeTag(i) { S.cvTags.splice(i, 1); App._renderTags(); },

  async saveDoc() {
    const id   = S.docId;
    const type = S.docType;

    if (type === 'text') {
      const val = qs('mdoc-text').value.trim();
      if (!val) { toast('Isian masih kosong bos.', 'err'); return; }
      S.vault[id] = { value: val, updatedAt: Date.now() };

    } else if (type === 'file') {
      if (!S.pendingFiles.length) { hideModal('modal-doc'); return; }
      const existing = S.vault[id]?.files || [];
      S.vault[id] = { files: [...existing, ...S.pendingFiles], updatedAt: Date.now() };

    } else if (type === 'cv') {
      if (!S.pendingFiles.length) { toast('Pilih file CV dulu bos.', 'err'); return; }
      const existing = S.vault[id]?.files || [];
      const tagged   = S.pendingFiles.map(f => ({ ...f, tags: [...S.cvTags] }));
      S.vault[id] = { files: [...existing, ...tagged], updatedAt: Date.now() };
    }

    await DB.save();
    hideModal('modal-doc');
    App.renderSection(S.currentSec);
    toast('Data berhasil disimpen!', 'ok');
    setTimeout(() => lucide.createIcons(), 60);
  },

  /* ── PREVIEW & DOWNLOAD ── */
  previewDoc(id) {
    const files = S.vault[id]?.files;
    if (!files?.length) return;
    const f = files[0];
    if (f.mime?.startsWith('image/')) {
      const w = window.open('', '_blank');
      w.document.write(`<!DOCTYPE html><html><body style="margin:0;background:#0f172a;display:flex;justify-content:center;">
        <img src="${f.b64}" style="max-width:100%;max-height:100vh;object-fit:contain;" /></body></html>`);
    } else {
      const raw  = f.b64.includes(',') ? f.b64.split(',')[1] : f.b64;
      const bin  = atob(raw);
      const buf  = new Uint8Array(bin.length).map((_, i) => bin.charCodeAt(i));
      const blob = new Blob([buf], { type: 'application/pdf' });
      window.open(URL.createObjectURL(blob), '_blank');
    }
  },

  downloadDoc(id) {
    const files = S.vault[id]?.files;
    if (!files?.length) return;
    files.forEach(f => dlB64(f.b64, f.name));
  },

  downloadFile(id, idx) {
    const f = S.vault[id]?.files?.[idx];
    if (f) dlB64(f.b64, f.name);
  },

  async deleteCvFile(idx) {
    const cv = S.vault['cv'];
    if (!cv?.files) return;
    cv.files.splice(idx, 1);
    if (!cv.files.length) delete S.vault['cv'];
    await DB.save();
    App._renderCvList();
    toast('CV berhasil dihapus.', 'ok');
    setTimeout(() => lucide.createIcons(), 30);
  },

  /* ── DELETE ── */
  confirmDelete(id, label) {
    qs('del-title').textContent = `Hapus "${label}"?`;
    qs('del-desc').textContent  = 'Data ini bakal ilang selamanya bos.';
    qs('del-confirm-btn').onclick = () => { App.deleteDoc(id); hideModal('modal-delete'); };
    showModal('modal-delete');
  },

  async deleteDoc(id) {
    delete S.vault[id];
    await DB.save();
    App.renderSection(S.currentSec);
    toast('Data berhasil dihapus.', 'ok');
    setTimeout(() => lucide.createIcons(), 60);
  },

  /* ── EXPORT / IMPORT ── */
  async exportVault() {
    if (!S.pin) { toast('Login dulu bos!', 'err'); return; }
    const raw = await DB.getRaw();
    if (!raw)  { toast('Vault masih kosong!', 'info'); return; }
    const meta = await DB.getMeta();
    const obj  = JSON.stringify({ version: 2, meta, encrypted: raw, exportedAt: Date.now() });
    const blob = new Blob([obj], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = Object.assign(document.createElement('a'), { href: url, download: `smartvault_${dateStr()}.vault` });
    a.click();
    URL.revokeObjectURL(url);
    toast('File .vault berhasil diunduh!', 'ok');
  },

  showImportModal() {
    window._importFile = null;
    qs('import-drop').innerHTML = `
      <i data-lucide="file-up" style="width:22px;height:22px;color:#475569;margin:0 auto 6px;display:block;"></i>
      <div style="font-size:0.82rem;color:#94a3b8;">Klik atau drop file .vault di sini</div>`;
    qs('import-pin').value = '';
    clearErr(qs('import-err'));
    showModal('modal-import');
    setTimeout(() => lucide.createIcons(), 30);
  },

  handleImportFile(e) {
    const file = e.target.files[0];
    if (file) App._setImportFile(file);
  },

  _setImportFile(file) {
    window._importFile = file;
    qs('import-drop').innerHTML = `
      <i data-lucide="file-check" style="width:20px;height:20px;color:#10b981;margin:0 auto 5px;display:block;"></i>
      <div style="font-size:0.82rem;color:#10b981;">${esc(file.name)}</div>`;
    setTimeout(() => lucide.createIcons(), 20);
  },

  async importVaultFile() {
    const pin  = qs('import-pin').value;
    const err  = qs('import-err');
    const file = window._importFile;
    clearErr(err);

    if (!file) return showErr(err, 'Pilih file .vault dulu bos.');
    if (!pin)  return showErr(err, 'Masukin PIN bos.');

    const text = await readText(file);
    let parsed;
    try { parsed = JSON.parse(text); }
    catch { return showErr(err, 'File rusak atau bukan format .vault.'); }

    if (parsed.meta?.pinHash && sha256(pin) !== parsed.meta.pinHash)
      return showErr(err, 'PIN salah bos.');

    if (!dec(parsed.encrypted, pin))
      return showErr(err, 'Gagal dekripsi. PIN mungkin salah.');

    await DB.setMeta(parsed.meta);
    await DB.setRaw(parsed.encrypted);
    hideModal('modal-import');
    toast('Restore berhasil! Silakan login.', 'ok');
    App.lockVault();
  },

  /* ── CHANGE PIN ── */
  async changePIN() {
    const old = qs('cp-old').value;
    const n1  = qs('cp-new1').value;
    const n2  = qs('cp-new2').value;
    const err = qs('cp-err');
    clearErr(err);

    const meta = await DB.getMeta();
    if (sha256(old) !== meta.pinHash) return showErr(err, 'PIN lama salah bos.');
    if (n1.length < 6) return showErr(err, 'PIN baru minimal 6 karakter.');
    if (n1 !== n2)     return showErr(err, 'Konfirmasi PIN beda bos.');

    const raw   = await DB.getRaw();
    const plain = dec(raw, old);
    if (!plain) return showErr(err, 'Gagal dekripsi data lama.');

    await DB.setRaw(enc(plain, n1));
    await DB.setMeta({ ...meta, pinHash: sha256(n1) });
    S.pin = n1;
    hideModal('modal-change-pin');
    toast('PIN berhasil diganti!', 'ok');
  },

  /* ── GOOGLE DRIVE ── */
  driveAuth() {
    if (typeof google === 'undefined' || !google?.accounts?.oauth2) {
      toast('Google SDK belum siap. Coba refresh dulu bos.', 'err'); return;
    }
    const client = google.accounts.oauth2.initTokenClient({
      client_id: CFG.GOOGLE_CLIENT_ID,
      scope: CFG.GOOGLE_SCOPE,
      callback: async resp => {
        if (resp.error) { toast('Gagal login Google: ' + resp.error, 'err'); return; }
        S.driveToken = resp.access_token;
        try {
          const u = await (await fetch('https://www.googleapis.com/oauth2/v3/userinfo',
            { headers: { Authorization: `Bearer ${S.driveToken}` } })).json();
          qs('drive-user').textContent = `Connected: ${u.email || u.name}`;
        } catch { qs('drive-user').textContent = 'Connected ke Google'; }
        qs('btn-gauth').style.display   = 'none';
        qs('btn-glogout').style.display = 'flex';
        qs('btn-gbackup').disabled      = false;
        qs('btn-grestore').disabled     = false;
        toast('Login Google berhasil!', 'ok');
      }
    });
    client.requestAccessToken();
  },

  driveLogout() {
    if (S.driveToken && typeof google !== 'undefined') google.accounts.oauth2.revoke(S.driveToken, ()=>{});
    S.driveToken = null; S.driveFileId = null;
    qs('drive-user').textContent    = 'Belum connect ke Google...';
    qs('btn-gauth').style.display   = 'flex';
    qs('btn-glogout').style.display = 'none';
    qs('btn-gbackup').disabled      = true;
    qs('btn-grestore').disabled     = true;
    toast('Disconnect dari Google.', 'info');
  },

  async driveBackup() {
    if (!S.driveToken) { toast('Login Google dulu bos!', 'err'); return; }
    if (!S.pin)        { toast('Vault belum kebuka!', 'err'); return; }

    const raw  = await DB.getRaw();
    if (!raw)  { toast('Vault masih kosong!', 'info'); return; }

    const meta    = await DB.getMeta();
    const payload = JSON.stringify({ version: 2, meta, encrypted: raw, syncedAt: Date.now() });
    const prog    = qs('drive-prog');
    const fill    = qs('drive-prog-fill');
    const txt     = qs('drive-prog-txt');

    prog.style.display = 'block';
    txt.textContent    = 'Nyiapin file...';
    fill.style.width   = '20%';

    try {
      if (!S.driveFileId) {
        txt.textContent  = 'Cek file lama...';
        fill.style.width = '40%';
        const ls = await (await fetch(
          `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${CFG.DRIVE_FILE}'&fields=files(id)`,
          { headers: { Authorization: `Bearer ${S.driveToken}` } }
        )).json();
        S.driveFileId = ls.files?.[0]?.id || null;
      }

      txt.textContent  = 'Upload ke Drive...';
      fill.style.width = '70%';

      const meta2  = { name: CFG.DRIVE_FILE, parents: ['appDataFolder'] };
      const form   = new FormData();
      form.append('metadata', new Blob([JSON.stringify(meta2)], { type: 'application/json' }));
      form.append('file',     new Blob([payload],                { type: 'application/json' }));

      const url    = S.driveFileId
        ? `https://www.googleapis.com/upload/drive/v3/files/${S.driveFileId}?uploadType=multipart`
        : 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
      const method = S.driveFileId ? 'PATCH' : 'POST';
      const resp   = await (await fetch(url, { method, headers: { Authorization: `Bearer ${S.driveToken}` }, body: form })).json();
      if (!S.driveFileId) S.driveFileId = resp.id;

      fill.style.width = '100%';
      txt.textContent  = 'Selesai!';
      const t = new Date().toLocaleString('id-ID');
      qs('drive-sync-time').textContent   = `Terakhir sync: ${t}`;
      qs('drive-sync-time').style.display = 'block';
      toast('Vault berhasil di-backup ke Google Drive!', 'ok');
    } catch (e) {
      toast('Gagal backup: ' + e.message, 'err');
    } finally {
      setTimeout(() => { prog.style.display = 'none'; fill.style.width = '0%'; }, 2500);
    }
  },

  async driveRestore() {
    if (!S.driveToken) { toast('Login Google dulu bos!', 'err'); return; }

    const prog = qs('drive-prog');
    const fill = qs('drive-prog-fill');
    const txt  = qs('drive-prog-txt');
    prog.style.display = 'block';
    txt.textContent    = 'Cari backup...';
    fill.style.width   = '30%';

    try {
      const ls = await (await fetch(
        `https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${CFG.DRIVE_FILE}'&fields=files(id)`,
        { headers: { Authorization: `Bearer ${S.driveToken}` } }
      )).json();
      const fid = ls.files?.[0]?.id;
      if (!fid) { toast('Belum ada backup di Drive bos!', 'info'); return; }

      txt.textContent  = 'Download data...';
      fill.style.width = '70%';

      const parsed = JSON.parse(await (await fetch(
        `https://www.googleapis.com/drive/v3/files/${fid}?alt=media`,
        { headers: { Authorization: `Bearer ${S.driveToken}` } }
      )).text());

      const plain = dec(parsed.encrypted, S.pin);
      if (!plain) { toast('PIN beda sama waktu backup bos!', 'err', 5000); return; }

      await DB.setMeta(parsed.meta);
      await DB.setRaw(parsed.encrypted);
      S.vault       = JSON.parse(plain);
      S.driveFileId = fid;

      fill.style.width = '100%';
      txt.textContent  = 'Restore selesai!';
      App.renderSection(S.currentSec);
      toast('Data berhasil ditarik dari Google Drive!', 'ok');
    } catch (e) {
      toast('Gagal restore: ' + e.message, 'err');
    } finally {
      setTimeout(() => { prog.style.display = 'none'; fill.style.width = '0%'; }, 2500);
    }
  },

};

/* ═══════════════════════════════════════════════
   UTILS
═══════════════════════════════════════════════ */
const qs  = id => document.getElementById(id);
const esc = s  => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function showErr(el, msg)  { if (el) { el.textContent = msg; el.style.display = 'block'; } }
function clearErr(el)      { if (el) { el.textContent = ''; el.style.display = 'none'; } }

function toBase64(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = e => res(e.target.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

function readText(file) {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload  = e => res(e.target.result);
    r.onerror = rej;
    r.readAsText(file);
  });
}

function dlB64(b64, name) {
  const a = Object.assign(document.createElement('a'), {
    href: b64.startsWith('data:') ? b64 : `data:application/octet-stream;base64,${b64}`,
    download: name,
  });
  a.click();
}

function dateStr() {
  const d = new Date();
  return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`;
}

/* ═══════════════════════════════════════════════
   BOOT — poll sampai semua lib ready, baru init
═══════════════════════════════════════════════ */
function waitForLibs(cb, attempt) {
  attempt = attempt || 0;

  var missing = [];
  if (typeof lucide      === 'undefined') missing.push('Lucide');
  if (typeof localforage === 'undefined') missing.push('localForage');
  if (typeof CryptoJS    === 'undefined') missing.push('CryptoJS');

  if (missing.length === 0) {
    cb();
  } else if (attempt > 80) {
    document.body.innerHTML =
      '<div style="display:flex;align-items:center;justify-content:center;height:100vh;' +
      'flex-direction:column;gap:12px;font-family:sans-serif;color:#94a3b8;background:#0f172a;">' +
      '<svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">' +
      '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/>' +
      '<line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
      '<div style="font-size:0.88rem;text-align:center;max-width:320px;">' +
      'Gagal load: <strong style="color:#f87171;">' + missing.join(', ') + '</strong><br><br>' +
      'Kemungkinan penyebab:<br>· Browser memblokir CDN (matiin Tracking Prevention)<br>' +
      '· Koneksi internet bermasalah<br>· Coba buka di Chrome / Firefox</div>' +
      '<button onclick="location.reload()" style="margin-top:8px;padding:8px 20px;' +
      'background:#059669;color:#fff;border:none;border-radius:7px;cursor:pointer;font-size:0.85rem;">' +
      'Refresh Sekarang</button></div>';
  } else {
    setTimeout(function() { waitForLibs(cb, attempt + 1); }, 100);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', function() { waitForLibs(init); });
} else {
  waitForLibs(init);
}
