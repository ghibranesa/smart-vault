/**
 * SmartVault app.js — v3
 * PWA + AES-256 + IndexedDB/localStorage fallback + Google Drive appDataFolder
 */

/* ═══ CONFIG ═══ */
const CFG = {
  GCI      : '280494613299-vcrnbqvj8ni2pub7gq5q2auodcleb2sf.apps.googleusercontent.com',
  SCOPE    : 'https://www.googleapis.com/auth/drive.appdata',
  DB_KEY   : 'sv_v3_vault',
  META_KEY : 'sv_v3_meta',
  DRV_FILE : 'vault_backup.json',
};

/* ═══ SCHEMA ═══ */
const SCHEMA = {
  home: {
    label: 'Beranda',
    sub: 'Ringkasan brankas dokumen digital'
  },
  identitas: {
    label   : 'Identitas & Kependudukan',
    sub     : 'Data identitas resmi diri kamu',
    docs: [
      { id:'ktp',     label:'Kartu Tanda Penduduk (KTP)',                   type:'both', icon:'id-card',     hint:'Nomor NIK & upload scan/foto KTP' },
      { id:'akta',    label:'Akta Kelahiran',                               type:'file', icon:'scroll',      hint:'Scan atau foto Akta Kelahiran' },
      { id:'kk',      label:'Kartu Keluarga (KK)',                          type:'file', icon:'users',       hint:'Scan atau foto Kartu Keluarga' },
      { id:'npwp',    label:'Nomor Pokok Wajib Pajak (NPWP)',               type:'both', icon:'landmark',    hint:'Nomor NPWP & upload dokumen' },
      { id:'bpjs_kes',label:'Kartu Badan Penyelenggara Jaminan Sosial Kesehatan (BPJS Kesehatan)', type:'both', icon:'heart-pulse', hint:'Nomor peserta & upload kartu' },
      { id:'asal',    label:'Alamat Rumah Asal',                            type:'text', icon:'home',        hint:'Jl. Merdeka No.1, RT/RW 01/01, Kec...' },
      { id:'domisili',label:'Alamat Domisili / Kos',                        type:'text', icon:'map-pin',     hint:'Jl. Kost Nyaman No.12, Kec...' },
    ]
  },
  mobilitas: {
    label   : 'Mobilitas',
    sub     : 'Surat izin & dokumen kendaraan',
    docs: [
      { id:'sim_c', label:'Surat Izin Mengemudi C (SIM C)',                    type:'file', icon:'car',       hint:'Foto atau scan SIM C' },
      { id:'stnk',  label:'Surat Tanda Nomor Kendaraan (STNK)',                type:'file', icon:'file-scan', hint:'Foto atau scan STNK kendaraan' },
    ]
  },
  legalitas: {
    label   : 'Legalitas & Karir',
    sub     : 'Dokumen hukum & keperluan kerja',
    docs: [
      { id:'cv',   label:'Curriculum Vitae (CV)',                              type:'cv',   icon:'scroll-text', hint:'Upload semua versi CV kamu' },
      { id:'skck', label:'Surat Keterangan Catatan Kepolisian (SKCK)',          type:'file', icon:'shield',      hint:'Scan atau foto SKCK' },
      { id:'ak1',  label:'Kartu Tanda Pencari Kerja (Kartu AK-1)',             type:'file', icon:'user-check',  hint:'Kartu AK-1 dari Disnaker' },
    ]
  },
  pendidikan: {
    label   : 'Pendidikan Formal',
    sub     : 'Ijazah, transkrip, dan surat pendidikan',
    docs: [
      { id:'ijazah_d3',    label:'Ijazah Diploma III (D3)',                    type:'file', icon:'graduation-cap', hint:'Ijazah D3' },
      { id:'skl_d3',       label:'Surat Keterangan Lulus Diploma III (SKL D3)',type:'file', icon:'file-check',     hint:'SKL D3' },
      { id:'skpi_d3',      label:'Surat Keterangan Pendamping Ijazah Diploma III (SKPI D3)', type:'file', icon:'file-badge', hint:'SKPI D3' },
      { id:'transkrip_d3', label:'Transkrip Nilai Diploma III',                type:'file', icon:'table-2',        hint:'Transkrip nilai D3' },
      { id:'ijazah_smk',   label:'Ijazah Sekolah Menengah Kejuruan (SMK)',     type:'file', icon:'graduation-cap', hint:'Ijazah SMK' },
      { id:'ijazah_smp',   label:'Ijazah Sekolah Menengah Pertama (SMP)',      type:'file', icon:'graduation-cap', hint:'Ijazah SMP' },
      { id:'ijazah_sd',    label:'Ijazah Sekolah Dasar (SD)',                  type:'file', icon:'graduation-cap', hint:'Ijazah SD' },
    ]
  },
  sertifikasi: {
    label   : 'Sertifikasi & Bahasa',
    sub     : 'Sertifikat kompetensi dan kemampuan bahasa',
    docs: [
      { id:'sertif_komp', label:'Sertifikat Kompetensi Keahlian',             type:'file', icon:'award',     hint:'Sertifikat uji kompetensi' },
      { id:'toeic_tepps', label:'Sertifikat Test of English for International Communication — TEPPS (TOEIC TEPPS)', type:'file', icon:'languages', hint:'Sertifikat TOEIC TEPPS' },
      { id:'toeic_smk',   label:'Sertifikat Test of English for International Communication — SMK (TOEIC SMK)',     type:'file', icon:'languages', hint:'Sertifikat TOEIC SMK' },
      { id:'toefl_smk',   label:'Sertifikat Test of English as a Foreign Language — SMK (TOEFL SMK)',              type:'file', icon:'languages', hint:'Sertifikat TOEFL SMK' },
    ]
  },
  pasfoto: {
    label   : 'Pasfoto Formal',
    sub     : 'Foto resmi untuk berbagai keperluan',
    docs: [
      { id:'foto_merah', label:'Pasfoto Berlatar Merah',  type:'file', icon:'image', hint:'Format JPEG/PNG, latar merah' },
      { id:'foto_biru',  label:'Pasfoto Berlatar Biru',   type:'file', icon:'image', hint:'Format JPEG/PNG, latar biru' },
      { id:'foto_putih', label:'Pasfoto Berlatar Putih',  type:'file', icon:'image', hint:'Format JPEG/PNG, latar putih' },
    ]
  }
};

/* ═══ STATE ═══ */
const S = {
  pin   : null, loggedIn: false, sec: 'home',
  vault : {},
  docId : null, docType: null,
  pfiles: [], cvTags: [],
  driveToken: null, driveFileId: null,
};

/* ═══ CRYPTO ═══ */
const C = {
  enc : (t,k) => CryptoJS.AES.encrypt(t,k).toString(),
  dec : (c,k) => { try{ const b=CryptoJS.AES.decrypt(c,k); return b.toString(CryptoJS.enc.Utf8)||null; }catch{return null;} },
  h   : s    => CryptoJS.SHA256(s).toString(),
};

/* ═══ STORAGE — IndexedDB → localStorage fallback ═══ */
const DB = (function(){
  let _lf = typeof localforage !== 'undefined' ? localforage : null;
  let _idb = false;

  async function testIDB(){
    if(!_lf) return false;
    try{ await _lf.setItem('__t__','1'); await _lf.removeItem('__t__'); return true; }
    catch{ return false; }
  }
  function lsGet(k){ try{ return Promise.resolve(localStorage.getItem(k)); }catch{ return Promise.resolve(null); } }
  function lsSet(k,v){ try{ localStorage.setItem(k,v); return Promise.resolve(); }catch(e){ return Promise.reject(e); } }

  return {
    async init(){
      _idb = await testIDB();
      if(!_idb) console.warn('SmartVault: fallback ke localStorage');
    },
    async get(k){
      if(_idb){ return _lf.getItem(k); }
      const r = await lsGet(k);
      if(r===null) return null;
      try{ return JSON.parse(r); }catch{ return r; }
    },
    async set(k,v){
      if(_idb) return _lf.setItem(k,v);
      return lsSet(k, typeof v==='string'?v:JSON.stringify(v));
    },
    async getMeta(){ return (await DB.get(CFG.META_KEY))||{}; },
    async setMeta(o){ return DB.set(CFG.META_KEY,o); },
    async getRaw(){ return DB.get(CFG.DB_KEY); },
    async setRaw(v){ return DB.set(CFG.DB_KEY,v); },
    async load(pin){
      const raw = await DB.getRaw();
      if(!raw){ S.vault={}; return true; }
      const p = C.dec(raw,pin);
      if(!p) return false;
      try{ S.vault=JSON.parse(p); return true; }catch{ return false; }
    },
    async save(){
      if(!S.pin) return;
      await DB.setRaw(C.enc(JSON.stringify(S.vault),S.pin));
      flash();
    }
  };
})();

/* ═══ TOAST ═══ */
function toast(msg, type='info', ms=3000){
  const w = $('toasts');
  const e = document.createElement('div');
  const ic = {ok:'check-circle',err:'x-circle',info:'info'}[type]||'info';
  e.className = `toast ${type}`;
  e.innerHTML = `<i data-lucide="${ic}" style="width:14px;height:14px;flex-shrink:0;"></i><span>${msg}</span>`;
  w.appendChild(e);
  lucide.createIcons({element:e});
  setTimeout(()=>{ e.style.transition='opacity .22s'; e.style.opacity='0'; setTimeout(()=>e.remove(),240); }, ms);
}

function flash(){
  const e = $('saved-badge');
  if(!e) return;
  e.style.display='flex';
  clearTimeout(e._t);
  e._t = setTimeout(()=>{ e.style.display='none'; }, 2500);
}

/* ═══ MODAL ═══ */
function showModal(id){ const e=$( id); if(e){ e.style.display='flex'; setTimeout(()=>lucide.createIcons(),30); } }
function hideModal(id){ const e=$(id); if(e) e.style.display='none'; }

/* ═══ UTILS ═══ */
const $ = id => document.getElementById(id);
const esc = s => String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');

function showErr(el,msg){ if(el){ el.textContent=msg; el.style.display='block'; } }
function clearErr(el)   { if(el){ el.textContent=''; el.style.display='none'; } }

function toB64(file){
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=e=>res(e.target.result); r.onerror=rej; r.readAsDataURL(file); });
}
function readTxt(file){
  return new Promise((res,rej)=>{ const r=new FileReader(); r.onload=e=>res(e.target.result); r.onerror=rej; r.readAsText(file); });
}
function dlB64(b64,name){
  const a=Object.assign(document.createElement('a'),{
    href: b64.startsWith('data:')?b64:`data:application/octet-stream;base64,${b64}`,
    download:name
  }); a.click();
}
function dateStr(){ const d=new Date(); return `${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}`; }

function mimeIcon(mime=''){
  if(mime.startsWith('image/')) return 'image';
  if(mime.includes('pdf'))       return 'file-text';
  if(mime.includes('word')||mime.includes('doc')) return 'file-type-2';
  return 'paperclip';
}

function initDrop(id,cb){
  const el=$(id); if(!el) return;
  el.addEventListener('dragover', e=>{ e.preventDefault(); el.classList.add('over'); });
  el.addEventListener('dragleave',()=>el.classList.remove('over'));
  el.addEventListener('drop', e=>{ e.preventDefault(); el.classList.remove('over'); cb(Array.from(e.dataTransfer.files)); });
}

/* ═══ INIT ═══ */
async function init(){
  await DB.init();
  lucide.createIcons();

  // PWA
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('./sw.js').catch(()=>{});
  }

  // PWA install prompt
  let _deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e=>{
    e.preventDefault();
    _deferredPrompt = e;
    $('pwa-banner').classList.add('show');
  });
  $('pwa-install-btn').addEventListener('click', ()=>{
    if(!_deferredPrompt) return;
    _deferredPrompt.prompt();
    _deferredPrompt.userChoice.then(()=>{ _deferredPrompt=null; $('pwa-banner').classList.remove('show'); });
  });

  const meta = await DB.getMeta();

  if(!meta.pinHash){
    $('pin-setup').style.display = 'block';
    $('pin-login').style.display = 'none';
    $('screen-pin').style.display = 'flex';
    $('s-pin2').addEventListener('keydown', e=>{ if(e.key==='Enter') App.setup(); });
  } else {
    $('pin-setup').style.display = 'none';
    $('pin-login').style.display = 'block';
    $('screen-pin').style.display = 'flex';
    buildDots('');
    const lp = $('l-pin');
    lp.addEventListener('input',  e=>buildDots(e.target.value));
    lp.addEventListener('keydown',e=>{ if(e.key==='Enter') App.login(); });
    lp.focus();
  }

  // Drop zones
  initDrop('mdoc-drop', files=>files.forEach(f=>App._queueFile(f)));
  initDrop('imp-drop',  files=>{ if(files[0]) App._setImpFile(files[0]); });

  // Keyboard shortcuts
  document.addEventListener('keydown', e=>{
    if(e.key==='Escape')['m-doc','m-import','m-drive','m-pin','m-del'].forEach(hideModal);
    if(e.ctrlKey&&e.key==='Enter'&&$('m-doc').style.display!=='none') App.saveDoc();
  });

  // CV tag enter
  const ti=$('mdoc-tag-inp');
  if(ti) ti.addEventListener('keydown',e=>{ if(e.key==='Enter'){ e.preventDefault(); App.addTag(); } });
}

function buildDots(val){
  const el=$('pin-dots'); if(!el) return;
  const n=Math.max(Math.min(val.length,8),6);
  el.innerHTML=Array.from({length:n},(_,i)=>`<div class="pin-dot ${i<val.length?'on':''}"></div>`).join('');
}

/* ═══ APP ═══ */
const App = {

  /* ── AUTH ── */
  async setup(){
    const p1=$('s-pin1').value, p2=$('s-pin2').value, err=$('s-err');
    clearErr(err);
    if(p1.length<6) return showErr(err,'PIN minimal 6 karakter.');
    if(p1!==p2)     return showErr(err,'Konfirmasi PIN tidak cocok.');
    await DB.setMeta({pinHash:C.h(p1),createdAt:Date.now()});
    S.pin=p1; S.vault={};
    await DB.save();
    toast('Vault berhasil dibuat!','ok');
    App._enter();
  },

  async login(){
    const pin=$('l-pin').value, err=$('l-err');
    clearErr(err);
    const meta=await DB.getMeta();
    if(C.h(pin)!==meta.pinHash) return showErr(err,'PIN salah. Coba lagi.');
    const ok=await DB.load(pin);
    if(!ok) return showErr(err,'Gagal dekripsi. Data mungkin rusak.');
    S.pin=pin;
    toast('Vault terbuka!','ok');
    App._enter();
  },

  lock(){
    S.pin=null; S.loggedIn=false; S.vault={}; S.driveToken=null;
    $('app').style.display='none';
    $('screen-pin').style.display='flex';
    $('pin-login').style.display='block';
    $('pin-setup').style.display='none';
    $('l-pin').value=''; buildDots('');
    clearErr($('l-err'));
    lucide.createIcons();
    toast('Vault dikunci.','info');
  },

  _enter(){
    $('screen-pin').style.display='none';
    $('app').style.display='flex';
    S.loggedIn=true;
    App.nav('home', document.querySelector('.nav-item[data-sec="home"]'));
    setTimeout(()=>lucide.createIcons(),80);
  },

  /* ── SIDEBAR ── */
  openSidebar(){
    $('sidebar').classList.add('open');
    $('sidebar-overlay').classList.add('show');
  },
  closeSidebar(){
    $('sidebar').classList.remove('open');
    $('sidebar-overlay').classList.remove('show');
  },
  _overlayClick(e,id){ if(e.target.classList.contains('overlay')) hideModal(id); },

  /* ── NAVIGATION ── */
  nav(secId, el){
    document.querySelectorAll('.sec-content').forEach(s=>s.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    const sec=$(`sec-${secId}`); if(sec) sec.classList.add('active');
    if(el) el.classList.add('active');
    S.sec=secId;
    const m=SCHEMA[secId];
    $('sec-title').innerHTML=esc(m?.label||secId);
    $('sec-sub').textContent=m?.sub||'';
    App.render(secId);
    App.closeSidebar();
    setTimeout(()=>lucide.createIcons(),60);
  },

  /* ── RENDER ── */
  render(secId){
    const schema=SCHEMA[secId]; if(!schema) return;
    const container=$(`sec-${secId}`); if(!container) return;

    if(secId==='home'){
      App._renderHome(container);
    } else if(secId==='legalitas'){
      App._renderLegalitas(container, schema);
    } else {
      container.innerHTML=`<div class="doc-grid">${schema.docs.map(d=>App._card(d)).join('')}</div>`;
    }
    setTimeout(()=>lucide.createIcons(),40);
  },

  _renderHome(container){
    const total = Object.keys(S.vault).length;
    const uName = localStorage.getItem('sv_uname') || 'Ghibran Esa Anugrah'; 
    
    // Algoritma dinamis untuk mencari kategori apa saja yang sudah diisi
    let filledSecs = new Set();
    for (const docId of Object.keys(S.vault)) {
      for (const [secKey, secDef] of Object.entries(SCHEMA)) {
        if (secDef.docs && secDef.docs.find(d => d.id === docId)) {
          filledSecs.add(secKey); break;
        }
      }
    }
    
    // Pemetaan icon statis untuk setiap kategori
    const icons = { identitas:'id-card', mobilitas:'car', legalitas:'briefcase', pendidikan:'graduation-cap', sertifikasi:'award', pasfoto:'image' };
    
    let htmlAkses = '';
    if(filledSecs.size > 0){
      // Ambil maksimal 3 kategori yang sudah diisi
      const activeSecs = Array.from(filledSecs).slice(0, 3);
      htmlAkses = activeSecs.map(secKey => {
        const def = SCHEMA[secKey];
        return `<div class="doc-card" style="cursor:pointer;" onclick="App.nav('${secKey}', document.querySelector('[data-sec=${secKey}]'))">
          <div class="card-icon-wrap filled"><i data-lucide="${icons[secKey]||'folder'}" style="width:16px;height:16px;"></i></div>
          <div class="card-label" style="margin-top:12px;">${esc(def.label)}</div>
        </div>`;
      }).join('');
    } else {
      // Tampilan default jika vault masih kosong sama sekali
      htmlAkses = `<div class="doc-card" style="cursor:pointer;" onclick="App.nav('identitas', document.querySelector('[data-sec=identitas]'))">
        <div class="card-icon-wrap filled"><i data-lucide="id-card" style="width:16px;height:16px;"></i></div>
        <div class="card-label" style="margin-top:12px;">Identitas & Kependudukan</div>
      </div>`;
    }

    container.innerHTML = `
      <div style="background:var(--accent); color:#fff; padding:24px; border-radius:var(--radius-lg); margin-bottom:24px; box-shadow:var(--shadow-sm);">
        <div style="font-size:clamp(1.1rem, 5vw, 1.4rem); font-weight:600; margin-bottom:8px; overflow-wrap:break-word; word-break:break-word; line-height:1.35;">Halo, ${esc(uName)}! 👋</div>
        <div style="font-size:0.85rem; opacity:0.9;">Selamat datang. Brankas lu dalam keadaan aman. Terdapat <strong>${total}</strong> entri data yang tersimpan terenkripsi secara offline.</div>
      </div>
      <div class="subsection-title">Kategori Terisi (Akses Cepat)</div>
      <div class="doc-grid">
        ${htmlAkses}
      </div>
    `;
  },

  _renderLegalitas(container, schema){
    const cvDef=schema.docs.find(d=>d.id==='cv');
    const rest=schema.docs.filter(d=>d.id!=='cv');
    container.innerHTML=`
      <div class="subsection-title">Curriculum Vitae</div>
      <div id="cv-list"></div>
      <div class="subsection-title">Dokumen Legalitas</div>
      <div class="doc-grid">${rest.map(d=>App._card(d)).join('')}</div>`;
    App._renderCv();
    setTimeout(()=>lucide.createIcons(),40);
  },

  _renderCv(){
    const el=$('cv-list'); if(!el) return;
    const files=S.vault['cv']?.files||[];

    if(!files.length){
      el.innerHTML=`
        <div class="cv-item">
          <div class="cv-item-icon"><i data-lucide="scroll-text" style="width:14px;height:14px;"></i></div>
          <div style="flex:1;">
            <div class="cv-item-name">Belum ada CV tersimpan</div>
          </div>
          <button class="btn btn-primary btn-sm" onclick="App.openDoc('cv')">+ Upload</button>
        </div>`;
    } else {
      el.innerHTML = files.map((f,i)=>`
        <div class="cv-item">
          <div class="cv-item-icon"><i data-lucide="${mimeIcon(f.mime)}" style="width:14px;height:14px;"></i></div>
          <div style="flex:1;min-width:0;">
            <div class="cv-item-name">${esc(f.name)}</div>
            <div class="cv-item-tags">${(f.tags||[]).map(t=>`<span class="tag">${esc(t)}</span>`).join('')||`<span style="font-size:0.72rem;color:var(--text-3);">Tanpa label</span>`}</div>
          </div>
          <div style="display:flex;gap:4px;flex-shrink:0;">
            <button class="btn btn-ghost btn-icon" onclick="App.dlFile('cv',${i})" title="Unduh"><i data-lucide="download" style="width:13px;height:13px;"></i></button>
            <button class="btn btn-danger-ghost btn-icon" onclick="App.delCv(${i})" title="Hapus"><i data-lucide="trash-2" style="width:13px;height:13px;"></i></button>
          </div>
        </div>`).join('') + `<button class="btn btn-secondary" style="width:100%;margin-top:4px;" onclick="App.openDoc('cv')">
          <i data-lucide="plus" style="width:13px;height:13px;"></i> Tambah Versi CV
        </button>`;
    }
    setTimeout(()=>lucide.createIcons(),30);
  },

  /* ── CARD ── */
  _card(doc){
    const data=S.vault[doc.id];
    const hasTxt =(doc.type==='text'||doc.type==='both')&&!!data?.value;
    const hasFile=(doc.type==='file'||doc.type==='both'||doc.type==='cv')&&!!data?.files?.length;
    const filled =hasTxt||hasFile;

    // thumb for image
    let thumb='';
    if(hasFile && data.files[0]?.mime?.startsWith('image/')){
      thumb=`<div class="card-thumb"><img src="${data.files[0].b64}" loading="lazy"/></div>`;
    }

    // text preview
    let txtPrev='';
    if(hasTxt) txtPrev=`<div class="card-text-val" title="${esc(data.value)}">${esc(data.value)}</div>`;

    // file indicator (non-image)
    let fileRow='';
    if(hasFile && !data.files[0]?.mime?.startsWith('image/')){
      const cnt=data.files.length;
      fileRow=`<div class="card-file-row"><i data-lucide="${mimeIcon(data.files[0].mime)}" style="width:13px;height:13px;"></i>${esc(data.files[0].name)}${cnt>1?` <span style="color:var(--text-3);">+${cnt-1} lainnya</span>`:''}</div>`;
    }

    // actions
    let acts='';
    if(hasTxt) acts+=`<button class="btn btn-ghost btn-sm" onclick="App.copy('${doc.id}')"><i data-lucide="copy" style="width:12px;height:12px;"></i> Salin</button>`;
    if(hasFile) acts+=`
      <button class="btn btn-ghost btn-sm" onclick="App.preview('${doc.id}')"><i data-lucide="eye" style="width:12px;height:12px;"></i> Lihat</button>
      <button class="btn btn-ghost btn-sm" onclick="App.dlDoc('${doc.id}')"><i data-lucide="download" style="width:12px;height:12px;"></i> Unduh</button>`;

    return `<div class="doc-card" id="card-${doc.id}">
      <div class="card-header">
        <div style="display:flex;align-items:center;gap:10px;">
          <div class="card-icon-wrap${filled?' filled':''}">
            <i data-lucide="${doc.icon}" style="width:16px;height:16px;"></i>
          </div>
          <div>
            <div class="card-label">${esc(doc.label)}</div>
            <div class="card-hint">${esc(doc.hint)}</div>
          </div>
        </div>
        <div class="status-dot${filled?' filled':''}"></div>
      </div>
      ${thumb}${txtPrev}${fileRow}
      <div class="card-actions">
        ${acts}
        <button class="btn btn-secondary btn-sm" style="margin-left:auto;" onclick="App.openDoc('${doc.id}')">
          <i data-lucide="${filled?'pencil':'plus'}" style="width:12px;height:12px;"></i> ${filled?'Ubah':'Tambah'}
        </button>
        ${filled?`<button class="btn btn-danger-ghost btn-icon btn-sm" onclick="App.confirmDel('${doc.id}','${esc(doc.label)}')"><i data-lucide="trash-2" style="width:12px;height:12px;"></i></button>`:''}
      </div>
    </div>`;
  },

  /* ── COPY ── */
  copy(id){
    const v=S.vault[id]?.value; if(!v) return;
    navigator.clipboard.writeText(v)
      .then(()=>toast('Nomor berhasil disalin!','ok'))
      .catch(()=>{ const t=Object.assign(document.createElement('textarea'),{value:v}); document.body.appendChild(t); t.select(); document.execCommand('copy'); t.remove(); toast('Nomor berhasil disalin!','ok'); });
  },

  /* ── DOC MODAL ── */
  openDoc(docId){
    let def=null;
    for(const sec of Object.values(SCHEMA)){ 
      if(sec.docs) { def = sec.docs.find(d=>d.id===docId); }
      if(def) break; 
    }
    if(!def) return;

    S.docId=docId; S.docType=def.type; S.pfiles=[]; S.cvTags=[];
    $('mdoc-title').textContent=def.label;
    $('mdoc-sub').textContent=def.hint;
    $('mdoc-text-sec').style.display='none';
    $('mdoc-file-sec').style.display='none';
    $('mdoc-preview').style.display='none';
    $('mdoc-existing').innerHTML='';
    $('mdoc-tags').innerHTML='';
    $('mdoc-tag-inp').value='';
    $('mdoc-finput').value='';

    const existing=S.vault[docId];

    if(def.type==='text'){
      $('mdoc-text-sec').style.display='block';
      $('mdoc-text').value=existing?.value||'';
    } else if(def.type==='both'){
      // Show both text and file sections
      $('mdoc-text-sec').style.display='block';
      $('mdoc-file-sec').style.display='block';
      $('mdoc-cv-sec').style.display='none';
      $('mdoc-text').value=existing?.value||'';
      if(existing?.files?.length) App._showExisting(existing.files,docId);
    } else {
      $('mdoc-file-sec').style.display='block';
      $('mdoc-cv-sec').style.display=def.type==='cv'?'block':'none';
      if(def.type!=='cv'&&existing?.files?.length) App._showExisting(existing.files,docId);
    }

    showModal('m-doc');
  },

  _showExisting(files,docId){
    $('mdoc-existing').innerHTML=`
      <div style="margin-bottom:8px;">
        <div style="font-size:0.72rem;font-weight:600;color:var(--text-3);margin-bottom:6px;text-transform:uppercase;letter-spacing:0.06em;">File Tersimpan</div>
        ${files.map((f,i)=>`
          <div class="existing-file">
            <i data-lucide="${mimeIcon(f.mime)}" style="width:13px;height:13px;color:var(--accent);flex-shrink:0;"></i>
            <span class="existing-file-name">${esc(f.name)}</span>
            <button class="btn btn-ghost btn-icon" onclick="App.dlFile('${docId}',${i})" title="Unduh"><i data-lucide="download" style="width:12px;height:12px;"></i></button>
            <button class="btn btn-icon" style="background:none;border:none;cursor:pointer;color:var(--text-3);" onclick="App._rmFile('${docId}',${i})" title="Hapus"><i data-lucide="x" style="width:13px;height:13px;"></i></button>
          </div>`).join('')}
        <div style="font-size:0.72rem;color:var(--text-3);margin-top:8px;padding-top:8px;border-top:1px solid var(--border);">Unggah file baru untuk menambah atau mengganti:</div>
      </div>`;
    setTimeout(()=>lucide.createIcons(),30);
  },

  async _rmFile(docId,idx){
    if(!S.vault[docId]?.files) return;
    S.vault[docId].files.splice(idx,1);
    if(!S.vault[docId].files.length) delete S.vault[docId];
    await DB.save();
    App.openDoc(docId);
    App.render(S.sec);
  },

  async onFileSelect(event){
    for(const f of Array.from(event.target.files)) await App._queueFile(f);
  },

  async _queueFile(file){
    const MAX=15*1024*1024;
    if(file.size>MAX){ toast(`${file.name} terlalu besar (maks. 15 MB)`,'err'); return; }
    const b64=await toB64(file);
    S.pfiles.push({name:file.name,b64,mime:file.type,tags:[]});

    if(S.pfiles.length===1){
      $('mdoc-preview').style.display='block';
      if(file.type.startsWith('image/')){
        $('mdoc-pimg').src=b64; $('mdoc-pimg').style.display='block'; $('mdoc-pfile').style.display='none';
      } else {
        $('mdoc-pimg').style.display='none'; $('mdoc-pfile').style.display='flex'; $('mdoc-pfname').textContent=file.name;
      }
      setTimeout(()=>lucide.createIcons(),20);
    }
    toast(`${file.name} siap diunggah`,'info',2000);
  },

  addTag(){
    const inp=$('mdoc-tag-inp'), val=inp.value.trim();
    if(!val||S.cvTags.includes(val)){ inp.value=''; return; }
    S.cvTags.push(val); inp.value='';
    App._renderTags();
  },
  _renderTags(){
    $('mdoc-tags').innerHTML=S.cvTags.map((t,i)=>`
      <span class="tag">${esc(t)}
        <button onclick="App._rmTag(${i})"><i data-lucide="x" style="width:10px;height:10px;"></i></button>
      </span>`).join('');
    setTimeout(()=>lucide.createIcons(),20);
  },
  _rmTag(i){ S.cvTags.splice(i,1); App._renderTags(); },

  async saveDoc(){
    const id=S.docId, type=S.docType;

    if(type==='text'){
      const v=$('mdoc-text').value.trim();
      if(!v){ toast('Isian masih kosong.','err'); return; }
      S.vault[id]={value:v,updatedAt:Date.now()};

    } else if(type==='both'){
      const v=$('mdoc-text').value.trim();
      const existing=S.vault[id]||{};
      const newFiles=[...(existing.files||[]),...S.pfiles];
      if(!v&&!newFiles.length){ toast('Isian masih kosong.','err'); return; }
      S.vault[id]={value:v||existing.value||'',files:newFiles,updatedAt:Date.now()};

    } else if(type==='file'){
      if(!S.pfiles.length){ hideModal('m-doc'); return; }
      S.vault[id]={files:[...(S.vault[id]?.files||[]),...S.pfiles],updatedAt:Date.now()};

    } else if(type==='cv'){
      if(!S.pfiles.length){ toast('Pilih file CV terlebih dahulu.','err'); return; }
      const tagged=S.pfiles.map(f=>({...f,tags:[...S.cvTags]}));
      S.vault[id]={files:[...(S.vault[id]?.files||[]),...tagged],updatedAt:Date.now()};
    }

    await DB.save();
    hideModal('m-doc');
    App.render(S.sec);
    toast('Data berhasil disimpan!','ok');
    setTimeout(()=>lucide.createIcons(),60);
  },

  /* ── PREVIEW & DOWNLOAD ── */
  preview(id){
    const files=S.vault[id]?.files; if(!files?.length) return;
    const f=files[0];
    if(f.mime?.startsWith('image/')){
      const w=window.open('','_blank');
      w.document.write(`<!DOCTYPE html><html><head><style>body{margin:0;background:#111;display:flex;align-items:center;justify-content:center;min-height:100vh;}</style></head><body><img src="${f.b64}" style="max-width:100%;max-height:100vh;object-fit:contain;"/></body></html>`);
    } else {
      const raw=f.b64.includes(',')? f.b64.split(',')[1]:f.b64;
      const bin=atob(raw), buf=new Uint8Array(bin.length).map((_,i)=>bin.charCodeAt(i));
      const mt=f.mime||'application/octet-stream';
      const blob=new Blob([buf],{type:mt});
      window.open(URL.createObjectURL(blob),'_blank');
    }
  },

  dlDoc(id){ const f=S.vault[id]?.files; if(f?.length) f.forEach(file=>dlB64(file.b64,file.name)); },
  dlFile(id,idx){ const f=S.vault[id]?.files?.[idx]; if(f) dlB64(f.b64,f.name); },

  async delCv(idx){
    const cv=S.vault['cv']; if(!cv?.files) return;
    cv.files.splice(idx,1);
    if(!cv.files.length) delete S.vault['cv'];
    await DB.save();
    App._renderCv();
    toast('CV berhasil dihapus.','ok');
    setTimeout(()=>lucide.createIcons(),30);
  },

  /* ── DELETE ── */
  confirmDel(id,label){
    $('del-title').textContent=`Hapus "${label}"?`;
    $('del-sub').textContent='Data ini akan hilang permanen dan tidak bisa dipulihkan.';
    $('del-ok').onclick=()=>{ App.delDoc(id); hideModal('m-del'); };
    showModal('m-del');
  },
  async delDoc(id){
    delete S.vault[id];
    await DB.save();
    App.render(S.sec);
    toast('Data berhasil dihapus.','ok');
    setTimeout(()=>lucide.createIcons(),60);
  },

  /* ── EXPORT / IMPORT ── */
  async exportVault(){
    if(!S.pin){ toast('Login terlebih dahulu.','err'); return; }
    const raw=await DB.getRaw();
    if(!raw){ toast('Vault masih kosong.','info'); return; }
    const meta=await DB.getMeta();
    const blob=new Blob([JSON.stringify({version:3,meta,encrypted:raw,exportedAt:Date.now()})],{type:'application/json'});
    const a=Object.assign(document.createElement('a'),{href:URL.createObjectURL(blob),download:`smartvault_${dateStr()}.vault`});
    a.click(); URL.revokeObjectURL(a.href);
    toast('File .vault berhasil diunduh!','ok');
  },

  showImport(){
    window._impFile=null;
    $('imp-drop').innerHTML=`
      <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="display:block;margin:0 auto 8px;color:var(--text-3);"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      <div class="drop-zone-label">Klik atau seret file .vault</div>`;
    $('imp-pin').value='';
    clearErr($('imp-err'));
    showModal('m-import');
    setTimeout(()=>lucide.createIcons(),30);
  },

  onImportFile(e){ const f=e.target.files[0]; if(f) App._setImpFile(f); },
  _setImpFile(file){
    window._impFile=file;
    $('imp-drop').innerHTML=`
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display:block;margin:0 auto 6px;color:var(--accent);"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
      <div class="drop-zone-label" style="color:var(--accent);">${esc(file.name)}</div>`;
    setTimeout(()=>lucide.createIcons(),20);
  },

  async doImport(){
    const pin=$('imp-pin').value, err=$('imp-err'), file=window._impFile;
    clearErr(err);
    if(!file) return showErr(err,'Pilih file .vault terlebih dahulu.');
    if(!pin)  return showErr(err,'Masukkan PIN.');
    const txt=await readTxt(file);
    let parsed;
    try{ parsed=JSON.parse(txt); }catch{ return showErr(err,'File rusak atau bukan format .vault.'); }
    if(parsed.meta?.pinHash&&C.h(pin)!==parsed.meta.pinHash) return showErr(err,'PIN salah.');
    if(!C.dec(parsed.encrypted,pin)) return showErr(err,'Gagal dekripsi. PIN mungkin salah.');
    await DB.setMeta(parsed.meta);
    await DB.setRaw(parsed.encrypted);
    hideModal('m-import');
    toast('Restore berhasil! Silakan login.','ok');
    App.lock();
  },

  /* ── CHANGE PIN ── */
  async changePin(){
    const old=$('cp-old').value, n1=$('cp-n1').value, n2=$('cp-n2').value, err=$('cp-err');
    clearErr(err);
    const meta=await DB.getMeta();
    if(C.h(old)!==meta.pinHash) return showErr(err,'PIN lama salah.');
    if(n1.length<6)             return showErr(err,'PIN baru minimal 6 karakter.');
    if(n1!==n2)                 return showErr(err,'Konfirmasi PIN tidak cocok.');
    const raw=await DB.getRaw(), plain=C.dec(raw,old);
    if(!plain) return showErr(err,'Gagal dekripsi data lama.');
    await DB.setRaw(C.enc(plain,n1));
    await DB.setMeta({...meta,pinHash:C.h(n1)});
    S.pin=n1;
    hideModal('m-pin');
    toast('PIN berhasil diperbarui!','ok');
  },

  /* ── GOOGLE DRIVE ── */
  driveAuth(){
    if(typeof google==='undefined'||!google?.accounts?.oauth2){
      toast('Google SDK belum siap. Coba refresh.','err'); return;
    }
    const client=google.accounts.oauth2.initTokenClient({
      client_id:CFG.GCI, scope:CFG.SCOPE,
      callback:async resp=>{
        if(resp.error){ toast('Gagal login Google: '+resp.error,'err'); return; }
        S.driveToken=resp.access_token;
        try{
          const u=await(await fetch('https://www.googleapis.com/oauth2/v3/userinfo',{headers:{Authorization:`Bearer ${S.driveToken}`}})).json();
          $('drive-user').textContent=`Terhubung: ${u.email||u.name}`;
          
          localStorage.setItem('sv_uname', u.name || u.email);
          if (S.sec === 'home') App.render('home'); 
        }catch{ $('drive-user').textContent='Terhubung ke Google'; }
        $('btn-gauth').style.display='none';
        $('btn-glgt').style.display='flex';
        $('btn-gbak').disabled=false;
        $('btn-gres').disabled=false;
        toast('Login Google berhasil!','ok');
      }
    });
    client.requestAccessToken();
  },

  driveLogout(){
    if(S.driveToken&&typeof google!=='undefined') google.accounts.oauth2.revoke(S.driveToken,()=>{});
    S.driveToken=null; S.driveFileId=null;
    $('drive-user').textContent='Belum terhubung ke Google';
    $('btn-gauth').style.display='flex';
    $('btn-glgt').style.display='none';
    $('btn-gbak').disabled=true;
    $('btn-gres').disabled=true;
    toast('Koneksi Google diputus.','info');
  },

  async driveBackup(){
    if(!S.driveToken||!S.pin){ toast('Login Google dan buka vault terlebih dahulu.','err'); return; }
    const raw=await DB.getRaw(); if(!raw){ toast('Vault masih kosong.','info'); return; }
    const meta=await DB.getMeta();
    const payload=JSON.stringify({version:3,meta,encrypted:raw,syncedAt:Date.now()});
    const p=$('drive-prog'),fill=$('drive-prog-fill'),txt=$('drive-prog-txt');
    p.style.display='block'; fill.style.width='20%'; txt.textContent='Menyiapkan file...';
    try{
      if(!S.driveFileId){
        fill.style.width='40%'; txt.textContent='Mengecek backup lama...';
        const ls=await(await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${CFG.DRV_FILE}'&orderBy=modifiedTime desc&fields=files(id)&t=${Date.now()}`,{headers:{Authorization:`Bearer ${S.driveToken}`}})).json();
        S.driveFileId=ls.files?.[0]?.id||null;
      }
      
      fill.style.width='60%'; txt.textContent='Inisiasi Upload...';
      const initUrl = S.driveFileId 
        ? `https://www.googleapis.com/upload/drive/v3/files/${S.driveFileId}?uploadType=resumable`
        : `https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable`;
      const fileMeta = S.driveFileId ? {} : { name: CFG.DRV_FILE, parents: ['appDataFolder'] };
      
      const initRes = await fetch(initUrl, {
        method: S.driveFileId ? 'PATCH' : 'POST',
        headers: {
          'Authorization': `Bearer ${S.driveToken}`,
          'Content-Type': 'application/json',
          'X-Upload-Content-Type': 'application/json'
        },
        body: JSON.stringify(fileMeta)
      });
      if (!initRes.ok) throw new Error('Inisiasi ditolak API Google');
      const uploadUrl = initRes.headers.get('Location');
      
      fill.style.width='80%'; txt.textContent='Mengirim data...';
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });
      
      const resp = await uploadRes.json();
      if (!uploadRes.ok || resp.error) throw new Error(resp.error?.message || 'Data terlalu besar atau jaringan putus');
      
      if(!S.driveFileId) S.driveFileId=resp.id;
      fill.style.width='100%'; txt.textContent='Selesai!';
      const t=new Date().toLocaleString('id-ID');
      $('drive-time').textContent=`Terakhir sinkronisasi: ${t}`; $('drive-time').style.display='block';
      toast('Vault berhasil di-backup ke Google Drive!','ok');
    }catch(e){ toast('Gagal backup: '+e.message,'err'); console.error(e); }
    finally{ setTimeout(()=>{ p.style.display='none'; fill.style.width='0%'; },2500); }
  },

  async driveRestore(){
    if(!S.driveToken){ toast('Login Google terlebih dahulu.','err'); return; }
    const p=$('drive-prog'),fill=$('drive-prog-fill'),txt=$('drive-prog-txt');
    p.style.display='block'; fill.style.width='30%'; txt.textContent='Mencari backup...';
    try{
      const ls=await(await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=name='${CFG.DRV_FILE}'&orderBy=modifiedTime desc&fields=files(id)&t=${Date.now()}`,{headers:{Authorization:`Bearer ${S.driveToken}`}})).json();
      const fid=ls.files?.[0]?.id;
      if(!fid){ toast('Belum ada backup di Google Drive.','info'); return; }
      
      fill.style.width='70%'; txt.textContent='Mengunduh data...';
      const getRes = await fetch(`https://www.googleapis.com/drive/v3/files/${fid}?alt=media&t=${Date.now()}`,{headers:{Authorization:`Bearer ${S.driveToken}`}});
      if (!getRes.ok) throw new Error('Gagal mengunduh dari server');
      
      const parsed=JSON.parse(await getRes.text());
      const plain=C.dec(parsed.encrypted,S.pin);
      if(!plain){ toast('PIN berbeda dengan saat backup. Tidak bisa didekripsi.','err',5000); return; }
      
      await DB.setMeta(parsed.meta); await DB.setRaw(parsed.encrypted);
      S.vault=JSON.parse(plain); S.driveFileId=fid;
      fill.style.width='100%'; txt.textContent='Restore selesai!';
      App.render(S.sec);
      toast('Data berhasil ditarik dari Google Drive!','ok');
    }catch(e){ toast('Gagal restore: '+e.message,'err'); console.error(e); }
    finally{ setTimeout(()=>{ p.style.display='none'; fill.style.width='0%'; },2500); }
  },
};

/* ═══ BOOT ═══ */
function waitReady(cb,n){
  n=n||0;
  var miss=[];
  if(typeof lucide==='undefined')      miss.push('Lucide');
  if(typeof localforage==='undefined') miss.push('localForage');
  if(typeof CryptoJS==='undefined')    miss.push('CryptoJS');
  if(!miss.length){ cb(); return; }
  if(n>100){
    document.body.style.cssText='display:flex;align-items:center;justify-content:center;height:100vh;font-family:sans-serif;background:#faf8f5;';
    document.body.innerHTML=`<div style="text-align:center;padding:24px;max-width:320px;">
      <div style="font-size:0.9rem;color:#6b6560;margin-bottom:16px;">Gagal memuat: <strong>${miss.join(', ')}</strong><br><br>Coba matikan Tracking Prevention / Ad Blocker, atau buka di Chrome/Firefox.</div>
      <button onclick="location.reload()" style="padding:10px 24px;background:#c4704a;color:#fff;border:none;border-radius:8px;cursor:pointer;font-size:0.85rem;">Refresh</button>
    </div>`; return;
  }
  setTimeout(()=>waitReady(cb,n+1),100);
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',()=>waitReady(init));
} else {
  waitReady(init);
}
