/* ═══════════════════════════════════════════════
   TRACER STUDY — PSP MSP FPIK UNSRAT
   Application Logic — v2.0
═══════════════════════════════════════════════ */

'use strict';

/* ────────────────────────────────────────────
   CONFIG  (edit these)
──────────────────────────────────────────────*/
const CONFIG = {
  // ── Super Admin (edit here, cannot be changed via dashboard) ──
  SUPER_ADMIN_USER: 'superadmin',
  SUPER_ADMIN_PASS: 'Admin@2024',
  // ── Legacy single-admin (kept for backward compat) ──
  ADMIN_USER: 'admin',
  ADMIN_PASS: 'tracerstudy2024',
  // Paste your Google Apps Script Web App URL here:
  GOOGLE_SHEET_URL: 'https://script.google.com/macros/s/AKfycbx4iUdspY6ML5bpOPVh_GDGDIfT5hQmdCcp90SuMTuHU0YPAVky5vp9K-9Wmfa1rvJY/exec',
  ROWS_PER_PAGE: 10,
};

/* ────────────────────────────────────────────
   STATE
──────────────────────────────────────────────*/
let currentStep   = 1;
const TOTAL_STEPS = 3;
let currentJenis  = '';
let allData       = [];
let filteredData  = [];
let currentPage   = 1;
let sortField     = 'tanggal';
let sortDir       = 'desc';
let deleteId      = null;

// Auth state
let currentUser   = '';
let currentRole   = ''; // 'superadmin' | 'admin'

// Admin user management
let adminList     = [];
let editAdminId   = null;

// Sync state
let isSyncing     = false;

/* ────────────────────────────────────────────
   INIT
──────────────────────────────────────────────*/
document.addEventListener('DOMContentLoaded', () => {
  updateTopbarDate();
  loadFromStorage();
  renderPublicStats();

  // Radio listeners
  document.querySelectorAll('input[name="jenis"]').forEach(r =>
    r.addEventListener('change', () => handleJenisChange(r.value)));

  document.querySelectorAll('input[name="kesediaan"]').forEach(r =>
    r.addEventListener('change', () => handleKesediaanChange(r.value)));

  document.querySelectorAll('input[name="tahun_lulus"]').forEach(r =>
    r.addEventListener('change', () => syncSelectCards(r)));

  document.querySelectorAll('.radio-card input').forEach(r =>
    r.addEventListener('change', () => syncRadioCards(r)));

  // Form submit
  document.getElementById('tracer-form').addEventListener('submit', handleSubmit);
});

/* ────────────────────────────────────────────
   FORM NAVIGATION
──────────────────────────────────────────────*/
function nextStep() {
  if (!validateStep(currentStep)) return;
  if (currentStep < TOTAL_STEPS) {
    goToStep(currentStep + 1);
  }
}

function prevStep() {
  if (currentStep > 1) goToStep(currentStep - 1);
}

function goToStep(n) {
  document.querySelectorAll('.step-card').forEach(c => c.classList.remove('active'));
  const target = document.querySelector(`.step-card[data-step="${n}"]`);
  if (target) target.classList.add('active');
  currentStep = n;
  updateProgress();

  // Show intro-card and public stats only on step 1
  const introCard = document.querySelector('.intro-card');
  if (introCard) introCard.style.display = n === 1 ? '' : 'none';
  const publicStats = document.getElementById('public-stats');
  if (publicStats) publicStats.style.display = n === 1 ? '' : 'none';

  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function updateProgress() {
  const pct = Math.round((currentStep / (TOTAL_STEPS + 1)) * 100);
  document.getElementById('progress-fill').style.width = pct + '%';
  document.getElementById('progress-pct').textContent  = pct + '%';
  document.getElementById('step-current').textContent  = currentStep;
  document.getElementById('step-total').textContent    = TOTAL_STEPS;

  document.querySelectorAll('.step-dot').forEach(d => {
    const s = +d.dataset.step;
    d.classList.toggle('active', s === currentStep);
    d.classList.toggle('done',   s < currentStep);
  });
}

/* ────────────────────────────────────────────
   CONDITIONAL LOGIC
──────────────────────────────────────────────*/
function handleJenisChange(val) {
  currentJenis = val;
  const isLulusan = val === 'lulusan';
  document.getElementById('block-lulusan').style.display  = isLulusan ? '' : 'none';
  document.getElementById('block-pengguna').style.display = isLulusan ? 'none' : '';
  document.getElementById('step2-title').textContent =
    isLulusan ? 'Data Lulusan' : 'Data Pengguna Lulusan';
  document.getElementById('step2-desc').textContent =
    isLulusan ? 'Informasi karier dan status Anda saat ini'
              : 'Informasi instansi dan data lulusan yang digunakan';
  // Show NIM only for lulusan
  const groupNim = document.getElementById('group-nim');
  if (groupNim) groupNim.style.display = isLulusan ? '' : 'none';
}

function handleKesediaanChange(val) {
  const info = document.getElementById('info-bersedia');
  info.style.display = val === 'Bersedia' ? 'flex' : 'none';
}

function syncRadioCards(input) {
  const group = input.closest('.radio-group') || input.closest('form');
  document.querySelectorAll(`input[name="${input.name}"]`).forEach(r => {
    r.closest('.radio-card')?.classList.toggle('selected', r.checked);
  });
}

function syncSelectCards(input) {
  document.querySelectorAll(`input[name="${input.name}"]`).forEach(r => {
    r.closest('.select-card')?.classList.toggle('selected', r.checked);
  });
}

/* ────────────────────────────────────────────
   VALIDATION
──────────────────────────────────────────────*/
function validateStep(step) {
  let valid = true;

  if (step === 1) {
    valid &= checkRequired('nama',     'err-nama',     'Nama lengkap wajib diisi');
    if (currentJenis === 'lulusan') {
      valid &= checkRequired('nim', 'err-nim', 'NIM wajib diisi untuk lulusan');
    }
    valid &= checkPhone   ('whatsapp', 'err-whatsapp');
    valid &= checkEmail   ('email',    'err-email');
    valid &= checkRadio   ('jenis',    'err-jenis',    'Pilih jenis responden Anda');
  }

  if (step === 2) {
    if (currentJenis === 'lulusan') {
      valid &= checkRadio('tahun_lulus', 'err-tahun', 'Pilih tahun lulus Anda');
      valid &= checkSelect('status_saat_ini', 'err-status', 'Pilih status Anda saat ini');
    } else if (currentJenis === 'pengguna') {
      valid &= checkRequired('nama_instansi',  'err-instansi', 'Nama instansi wajib diisi');
      valid &= checkRequired('nama_pengguna',  'err-pengguna', 'Nama pengguna wajib diisi');
      valid &= checkRequired('jabatan_pengguna','err-jabatan-p','Jabatan wajib diisi');
    }
  }

  if (step === 3) {
    valid &= checkRadio('kesediaan', 'err-kesediaan', 'Pilih pernyataan kesediaan Anda');
  }

  return !!valid;
}

function checkRequired(id, errId, msg) {
  const el = document.getElementById(id);
  const ok = el && el.value.trim() !== '';
  showErr(id, errId, ok ? '' : msg);
  return ok;
}

function checkEmail(id, errId) {
  const el  = document.getElementById(id);
  const val = el?.value.trim();
  const ok  = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(val);
  showErr(id, errId, ok ? '' : 'Masukkan alamat email yang valid');
  return ok;
}

function checkPhone(id, errId) {
  const el  = document.getElementById(id);
  const val = el?.value.trim().replace(/\D/g,'');
  const ok  = val && val.length >= 8 && val.length <= 15;
  showErr(id, errId, ok ? '' : 'Masukkan nomor WhatsApp yang valid (8–15 digit)');
  return ok;
}

function checkRadio(name, errId, msg) {
  const ok = !!document.querySelector(`input[name="${name}"]:checked`);
  const el = document.getElementById(errId);
  if (el) el.textContent = ok ? '' : msg;
  return ok;
}

function checkSelect(id, errId, msg) {
  const el = document.getElementById(id);
  const ok = el && el.value !== '';
  showErr(id, errId, ok ? '' : msg);
  return ok;
}

function showErr(fieldId, errId, msg) {
  const field = document.getElementById(fieldId);
  const err   = document.getElementById(errId);
  if (field) field.classList.toggle('invalid', !!msg);
  if (err)   err.textContent = msg;
}

/* ────────────────────────────────────────────
   SUBMIT
──────────────────────────────────────────────*/
async function handleSubmit(e) {
  e.preventDefault();
  if (!validateStep(3)) return;

  const btn       = document.getElementById('btn-submit');
  const btnText   = btn.querySelector('.btn-submit-text');
  const btnLoader = btn.querySelector('.btn-submit-loader');

  btn.disabled      = true;
  btnText.style.display  = 'none';
  btnLoader.style.display = 'inline-flex';

  await delay(1200);

  const formData = collectFormData();
  saveToStorage(formData);
  renderPublicStats();

  // Try Google Sheets
  if (CONFIG.GOOGLE_SHEET_URL) {
    try {
      await fetch(CONFIG.GOOGLE_SHEET_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
    } catch (_) { /* Offline — saved locally */ }
  }

  btn.disabled      = false;
  btnText.style.display  = 'inline';
  btnLoader.style.display = 'none';

  showSuccess(formData);
}

function collectFormData() {
  const g  = id => document.getElementById(id)?.value?.trim() ?? '';
  const gr = name => document.querySelector(`input[name="${name}"]:checked`)?.value ?? '';

  return {
    id:              Date.now().toString(36) + Math.random().toString(36).slice(2,6),
    tanggal:         new Date().toISOString(),
    nama:            g('nama'),
    nim:             g('nim'),
    whatsapp:        '+62' + g('whatsapp').replace(/^0/, ''),
    email:           g('email'),
    jenis:           gr('jenis'),
    // Lulusan
    tahun_lulus:     gr('tahun_lulus'),
    status_saat_ini: g('status_saat_ini'),
    instansi:        g('instansi_lulusan'),
    jabatan:         g('jabatan_lulusan'),
    kota:            g('kota'),
    // Pengguna
    nama_instansi:   g('nama_instansi'),
    nama_pengguna:   g('nama_pengguna'),
    jabatan_pengguna:g('jabatan_pengguna'),
    nama_lulusan:    g('nama_lulusan'),
    wa_pengguna:     g('wa_pengguna'),
    email_pengguna:  g('email_pengguna'),
    // Kesediaan
    kesediaan:       gr('kesediaan'),
    catatan:         g('catatan'),
  };
}

function showSuccess(data) {
  document.getElementById('tracer-form').style.display = 'none';
  const card = document.getElementById('success-card');
  card.classList.add('active');
  document.getElementById('success-nama').textContent = data.nama;

  const details = document.getElementById('success-details');
  const badges = [
    `📅 ${formatDate(data.tanggal)}`,
    data.jenis === 'lulusan' ? `🎓 Lulusan ${data.tahun_lulus || ''}` : '🏢 Pengguna Lulusan',
    `${data.kesediaan === 'Bersedia' ? '✅' : '❌'} ${data.kesediaan}`,
  ];
  details.innerHTML = badges.map(b =>
    `<span class="success-badge">${b}</span>`).join('');

  updateProgress();
  document.getElementById('progress-fill').style.width = '100%';
  document.getElementById('progress-pct').textContent  = '100%';
  document.querySelectorAll('.step-dot').forEach(d => d.classList.add('done'));
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetForm() {
  document.getElementById('tracer-form').reset();
  document.getElementById('tracer-form').style.display = '';
  document.getElementById('success-card').classList.remove('active');
  document.querySelectorAll('.radio-card').forEach(c => c.classList.remove('selected'));
  document.querySelectorAll('.select-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('block-lulusan').style.display  = '';
  document.getElementById('block-pengguna').style.display = 'none';
  document.getElementById('info-bersedia').style.display  = 'none';
  currentJenis = '';
  currentStep  = 1;
  goToStep(1);
}

/* ────────────────────────────────────────────
   PAGE ROUTING
──────────────────────────────────────────────*/
function showAdmin(e) {
  e.preventDefault();
  setPage('page-login');
}

function showForm(e) {
  e.preventDefault();
  setPage('page-form');
}

function setPage(id) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById(id).classList.add('active');
}

/* ────────────────────────────────────────────
   ADMIN AUTH
──────────────────────────────────────────────*/
function doLogin() {
  const u   = document.getElementById('admin-user').value.trim();
  const p   = document.getElementById('admin-pass').value;
  const err = document.getElementById('err-login');

  // 1 — Super Admin check (from localStorage, fallback to CONFIG)
  const sa = loadSACredentials();
  if (u === sa.username && p === sa.password) {
    currentUser = u;
    currentRole = 'superadmin';
    _onLoginSuccess();
    return;
  }

  // 2 — Regular admin list check
  loadAdmins();
  const found = adminList.find(a => a.username === u && a.password === p);
  if (found) {
    currentUser = found.username;
    currentRole = 'admin';
    _onLoginSuccess();
    return;
  }

  err.textContent = '⚠️ Username atau password salah.';
}

/* SA credentials stored in localStorage so it can be changed via UI */
function loadSACredentials() {
  try {
    const saved = JSON.parse(localStorage.getItem('tracer_sa') || 'null');
    if (saved && saved.username && saved.password) return saved;
  } catch {}
  // First run: seed from CONFIG
  const defaults = { username: CONFIG.SUPER_ADMIN_USER, password: CONFIG.SUPER_ADMIN_PASS };
  localStorage.setItem('tracer_sa', JSON.stringify(defaults));
  return defaults;
}

function saveSACredentials(username, password) {
  localStorage.setItem('tracer_sa', JSON.stringify({ username, password }));
}

function _onLoginSuccess() {
  document.getElementById('err-login').textContent = '';

  // Set role attribute on admin page — CSS handles menu visibility
  const pageAdmin = document.getElementById('page-admin');
  if (pageAdmin) pageAdmin.setAttribute('data-role', currentRole);

  // Update topbar avatar & user info
  const avatarEl = document.getElementById('admin-avatar');
  if (avatarEl) avatarEl.textContent = currentUser[0].toUpperCase();
  const unEl = document.getElementById('topbar-username');
  if (unEl) unEl.textContent = currentUser;
  const rbEl = document.getElementById('topbar-rolebadge');
  if (rbEl) {
    rbEl.textContent = currentRole === 'superadmin' ? '👑 Super Admin' : '🔑 Admin';
    rbEl.className   = 'topbar-rolebadge ' + currentRole;
  }

  // Populate super admin username on Kelola Admin tab
  const saDisp = document.getElementById('sa-username-display');
  if (saDisp) saDisp.textContent = loadSACredentials().username;

  setPage('page-admin');
  _injectSyncButton();
  refreshDashboard();
  // Auto-sync from sheets on every login
  syncFromSheets();
}

function doLogout() {
  currentUser = '';
  currentRole = '';
  document.getElementById('admin-user').value = '';
  document.getElementById('admin-pass').value = '';
  const pageAdmin = document.getElementById('page-admin');
  if (pageAdmin) pageAdmin.removeAttribute('data-role');
  setPage('page-form');
}

/* ────────────────────────────────────────────
   DASHBOARD
──────────────────────────────────────────────*/
function showTab(name, link) {
  document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');
  if (link) link.classList.add('active');
  const titles = { dashboard: 'Dashboard', data: 'Data Responden', export: 'Export Data', admins: 'Kelola Admin' };
  document.getElementById('topbar-title').textContent = titles[name] || 'Dashboard';

  if (name === 'data')      { filteredData = [...allData]; renderTable(); }
  if (name === 'dashboard') { refreshDashboard(); }
  if (name === 'admins')    { renderAdminUsers(); }
}

function refreshDashboard() {
  loadFromStorage();
  const total    = allData.length;
  const bersedia = allData.filter(d => d.kesediaan === 'Bersedia').length;
  const bekerja  = allData.filter(d => d.status_saat_ini === 'Bekerja').length;
  const s2       = allData.filter(d => d.status_saat_ini === 'Studi Lanjut S2').length;
  const s3       = allData.filter(d => d.status_saat_ini === 'Studi Lanjut S3').length;
  const pengguna = allData.filter(d => d.jenis === 'pengguna').length;

  animateCount('stat-total',    total);
  animateCount('stat-bersedia', bersedia);
  animateCount('stat-bekerja',  bekerja);
  animateCount('stat-s2',       s2);
  animateCount('stat-s3',       s3);
  animateCount('stat-pengguna', pengguna);

  drawDonut(total, pengguna);
  drawBar();
  renderRecent();
}

function animateCount(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let cur = 0;
  const step = Math.max(1, Math.floor(target / 30));
  const iv = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = cur;
    if (cur >= target) clearInterval(iv);
  }, 30);
}

/* Simple canvas charts */
function drawDonut(total, pengguna) {
  const canvas = document.getElementById('chartDonut');
  if (!canvas) return;
  const ctx    = canvas.getContext('2d');
  const lulusan = total - pengguna;
  const cx = 100, cy = 100, r = 75, lw = 28;
  ctx.clearRect(0, 0, 200, 200);

  const segments = [
    { val: lulusan,  color: '#1d4ed8' },
    { val: pengguna, color: '#f59e0b' },
  ];
  const sum = segments.reduce((a, s) => a + s.val, 0) || 1;
  let angle = -Math.PI / 2;
  segments.forEach(s => {
    const sweep = (s.val / sum) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(cx, cy, r, angle, angle + sweep);
    ctx.strokeStyle = s.color;
    ctx.lineWidth   = lw;
    ctx.stroke();
    angle += sweep;
  });

  // Center text
  ctx.fillStyle = '#1e293b';
  ctx.font = 'bold 22px DM Sans, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(total, cx, cy + 4);
  ctx.font = '11px DM Sans, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Total', cx, cy + 18);

  const legend = document.getElementById('donut-legend');
  if (legend) {
    legend.innerHTML = [
      { label: 'Lulusan',          val: lulusan,  color: '#1d4ed8' },
      { label: 'Pengguna Lulusan', val: pengguna, color: '#f59e0b' },
    ].map(l => `
      <div class="legend-item">
        <div class="legend-dot" style="background:${l.color}"></div>
        <span>${l.label}: <strong>${l.val}</strong></span>
      </div>`).join('');
  }
}

function drawBar() {
  const canvas = document.getElementById('chartBar');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const years = ['2021', '2022', '2023'];
  const counts = years.map(y => allData.filter(d => d.tahun_lulus === y).length);
  const max = Math.max(...counts, 1);

  const W = canvas.offsetWidth || 400;
  canvas.width  = W;
  canvas.height = 200;
  ctx.clearRect(0, 0, W, 200);

  const barW = 60, gap = (W - years.length * barW) / (years.length + 1);
  years.forEach((y, i) => {
    const x   = gap + i * (barW + gap);
    const h   = (counts[i] / max) * 140;
    const top = 160 - h;
    const grad = ctx.createLinearGradient(x, top, x, 160);
    grad.addColorStop(0, '#3b82f6');
    grad.addColorStop(1, '#1d4ed8');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.roundRect(x, top, barW, h, [6, 6, 0, 0]);
    ctx.fill();
    ctx.fillStyle = '#1e293b';
    ctx.font      = 'bold 14px DM Sans, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(counts[i], x + barW / 2, top - 8);
    ctx.fillStyle = '#64748b';
    ctx.font      = '12px DM Sans, sans-serif';
    ctx.fillText(y, x + barW / 2, 178);
  });
}

function renderRecent() {
  const el = document.getElementById('recent-table');
  if (!el) return;
  const rows = [...allData].sort((a, b) => b.tanggal.localeCompare(a.tanggal)).slice(0, 5);
  if (!rows.length) { el.innerHTML = emptyState('Belum ada data masuk'); return; }
  el.innerHTML = `
    <table class="data-table">
      <thead><tr>
        <th>Nama</th><th>Jenis</th><th>Status</th><th>Kesediaan</th><th>Tanggal</th>
      </tr></thead>
      <tbody>
        ${rows.map(r => `<tr>
          <td><strong>${esc(r.nama)}</strong></td>
          <td>${jenisBadge(r.jenis)}</td>
          <td>${statusBadge(r.status_saat_ini)}</td>
          <td>${kesediaanBadge(r.kesediaan)}</td>
          <td>${formatDate(r.tanggal)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`;
}

/* ────────────────────────────────────────────
   DATA TABLE
──────────────────────────────────────────────*/
function filterData() {
  const q  = document.getElementById('search-input').value.toLowerCase();
  const fj = document.getElementById('filter-jenis').value;
  const ft = document.getElementById('filter-tahun').value;
  const fs = document.getElementById('filter-status').value;
  const fk = document.getElementById('filter-kesediaan').value;

  filteredData = allData.filter(d => {
    if (q  && !d.nama.toLowerCase().includes(q))   return false;
    if (fj && d.jenis !== fj)                       return false;
    if (ft && d.tahun_lulus !== ft)                 return false;
    if (fs && d.status_saat_ini !== fs)             return false;
    if (fk && d.kesediaan !== fk)                   return false;
    return true;
  });

  sortData();
  currentPage = 1;
  renderTable();
}

function sortBy(field) {
  if (sortField === field) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
  else { sortField = field; sortDir = 'asc'; }
  sortData();
  renderTable();
}

function sortData() {
  filteredData.sort((a, b) => {
    const av = a[sortField] ?? '';
    const bv = b[sortField] ?? '';
    return sortDir === 'asc'
      ? av.localeCompare(bv)
      : bv.localeCompare(av);
  });
}

function renderTable() {
  const tbody = document.getElementById('data-tbody');
  const total = filteredData.length;
  const pages = Math.max(1, Math.ceil(total / CONFIG.ROWS_PER_PAGE));
  currentPage = Math.min(currentPage, pages);
  const start = (currentPage - 1) * CONFIG.ROWS_PER_PAGE;
  const slice = filteredData.slice(start, start + CONFIG.ROWS_PER_PAGE);

  if (!slice.length) { tbody.innerHTML = `<tr><td colspan="12">${emptyState('Tidak ada data ditemukan')}</td></tr>`; }
  else {
    tbody.innerHTML = slice.map((r, i) => `
      <tr>
        <td>${start + i + 1}</td>
        <td><strong>${esc(r.nama)}</strong></td>
        <td>${r.nim ? `<span class="badge badge-gray">${esc(r.nim)}</span>` : '—'}</td>
        <td>${jenisBadge(r.jenis)}</td>
        <td>${r.tahun_lulus ? `<span class="badge badge-blue">${r.tahun_lulus}</span>` : '—'}</td>
        <td>${statusBadge(r.status_saat_ini)}</td>
        <td>${esc(r.instansi || r.nama_instansi || '—')}</td>
        <td><a href="https://wa.me/${r.whatsapp.replace(/\D/g,'')}" target="_blank" style="color:var(--blue)">${esc(r.whatsapp)}</a></td>
        <td>${esc(r.email)}</td>
        <td>${kesediaanBadge(r.kesediaan)}</td>
        <td>${formatDate(r.tanggal)}</td>
        <td><button class="action-btn del-btn" onclick="deleteRow('${r.id}')">Hapus</button></td>
      </tr>`).join('');
  }

  // Pagination
  document.getElementById('page-info').textContent =
    `Menampilkan ${Math.min(start+1,total)}–${Math.min(start+CONFIG.ROWS_PER_PAGE,total)} dari ${total} data`;
  document.getElementById('btn-prev').disabled = currentPage === 1;
  document.getElementById('btn-next').disabled = currentPage === pages;

  const nums = document.getElementById('page-numbers');
  nums.innerHTML = '';
  for (let p = 1; p <= pages; p++) {
    const btn = document.createElement('button');
    btn.className = 'page-num' + (p === currentPage ? ' active' : '');
    btn.textContent = p;
    btn.onclick = () => { currentPage = p; renderTable(); };
    nums.appendChild(btn);
  }
}

function changePage(dir) {
  currentPage += dir;
  renderTable();
}

/* ────────────────────────────────────────────
   DELETE
──────────────────────────────────────────────*/
function deleteRow(id) {
  deleteId = id;
  document.getElementById('delete-modal').classList.add('show');
}

function confirmDelete() {
  allData = allData.filter(d => d.id !== deleteId);
  filteredData = filteredData.filter(d => d.id !== deleteId);
  saveAllToStorage();
  renderTable();
  closeModal();
}

function closeModal() {
  document.getElementById('delete-modal').classList.remove('show');
  deleteId = null;
}

/* ────────────────────────────────────────────
   EXPORT
──────────────────────────────────────────────*/
function exportCSV() {
  const headers = [
    'ID','Tanggal','Nama','NIM','WhatsApp','Email','Jenis',
    'Tahun Lulus','Status','Instansi','Jabatan','Kota',
    'Nama Instansi','Nama Pengguna','Jabatan Pengguna','Nama Lulusan',
    'Kesediaan','Catatan'
  ];
  const rows = allData.map(r => [
    r.id, formatDate(r.tanggal), r.nama, r.nim||'', r.whatsapp, r.email, r.jenis,
    r.tahun_lulus, r.status_saat_ini, r.instansi, r.jabatan, r.kota,
    r.nama_instansi, r.nama_pengguna, r.jabatan_pengguna, r.nama_lulusan,
    r.kesediaan, r.catatan
  ].map(v => `"${(v||'').replace(/"/g,'""')}"`));

  const csv  = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF'+csv], { type: 'text/csv;charset=utf-8;' });
  download(blob, `tracer-study-${today()}.csv`);
}

function exportExcel() {
  const headers = [
    'No','Tanggal','Nama','NIM','WhatsApp','Email','Jenis',
    'Tahun Lulus','Status','Instansi','Jabatan','Kota','Kesediaan'
  ];
  const rows = allData.map((r, i) => `
    <tr>
      <td>${i+1}</td><td>${formatDate(r.tanggal)}</td>
      <td>${r.nama}</td><td>${r.nim||''}</td><td>${r.whatsapp}</td><td>${r.email}</td>
      <td>${r.jenis}</td><td>${r.tahun_lulus||''}</td>
      <td>${r.status_saat_ini||''}</td><td>${r.instansi||r.nama_instansi||''}</td>
      <td>${r.jabatan||r.jabatan_pengguna||''}</td><td>${r.kota||''}</td>
      <td>${r.kesediaan}</td>
    </tr>`).join('');

  const xls = `<html><head><meta charset="utf-8">
    <style>table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px;font-size:12px}th{background:#1d4ed8;color:#fff}</style>
    </head><body><h2>Data Tracer Study PSP MSP FPIK UNSRAT</h2>
    <p>Diekspor: ${new Date().toLocaleString('id-ID')}</p>
    <table><thead><tr>${headers.map(h=>`<th>${h}</th>`).join('')}</tr></thead>
    <tbody>${rows}</tbody></table></body></html>`;

  const blob = new Blob([xls], { type: 'application/vnd.ms-excel' });
  download(blob, `tracer-study-${today()}.xls`);
}

function exportPDF() {
  const w = window.open('', '_blank');
  const rows = allData.map((r, i) => `
    <tr>
      <td>${i+1}</td><td>${formatDate(r.tanggal)}</td>
      <td><strong>${r.nama}</strong></td>
      <td>${r.nim||'—'}</td>
      <td>${r.jenis === 'lulusan' ? 'Lulusan' : 'Pengguna Lulusan'}</td>
      <td>${r.tahun_lulus || '—'}</td>
      <td>${r.status_saat_ini || '—'}</td>
      <td>${r.instansi || r.nama_instansi || '—'}</td>
      <td>${r.whatsapp}</td><td>${r.email}</td>
      <td style="color:${r.kesediaan==='Bersedia'?'#16a34a':'#dc2626'};font-weight:600">${r.kesediaan}</td>
    </tr>`).join('');

  w.document.write(`<!DOCTYPE html><html><head>
    <meta charset="utf-8"><title>Laporan Tracer Study</title>
    <style>
      body{font-family:Arial,sans-serif;padding:2cm;font-size:11px}
      h1{color:#1d4ed8;font-size:14px;margin-bottom:4px}
      p{color:#64748b;font-size:10px;margin-bottom:16px}
      table{width:100%;border-collapse:collapse}
      th{background:#1d4ed8;color:#fff;padding:6px 8px;text-align:left;font-size:10px}
      td{padding:5px 8px;border-bottom:1px solid #e2e8f0;font-size:10px}
      tr:nth-child(even){background:#f8fafc}
      @media print{@page{margin:1.5cm}}
    </style></head><body>
    <h1>Laporan Tracer Study — PSP MSP FPIK UNSRAT</h1>
    <p>Dicetak: ${new Date().toLocaleString('id-ID')} &nbsp;|&nbsp; Total: ${allData.length} responden</p>
    <table>
      <thead><tr>
        <th>#</th><th>Tanggal</th><th>Nama</th><th>NIM</th><th>Jenis</th>
        <th>Tahun</th><th>Status</th><th>Instansi</th>
        <th>WhatsApp</th><th>Email</th><th>Kesediaan</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <script>window.onload=()=>window.print()<\/script>
    </body></html>`);
  w.document.close();
}

function clearData() {
  if (confirm('Hapus SEMUA data responden? Tindakan ini tidak dapat dibatalkan.')) {
    allData = [];
    filteredData = [];
    localStorage.removeItem('tracer_data');
    renderTable();
    refreshDashboard();
  }
}

function download(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

/* ────────────────────────────────────────────
   SYNC FROM GOOGLE SHEETS
──────────────────────────────────────────────*/
async function syncFromSheets() {
  if (!CONFIG.GOOGLE_SHEET_URL || isSyncing) return;
  isSyncing = true;
  _setSyncUI('syncing');

  try {
    const url = CONFIG.GOOGLE_SHEET_URL + '?action=getData&t=' + Date.now();
    const res  = await fetch(url);
    const json = await res.json();

    if (!json.success || !Array.isArray(json.data)) throw new Error('Format data tidak valid');

    // Merge: sheet data takes priority; deduplicate by id
    loadFromStorage();
    const localMap = {};
    allData.forEach(d => { if (d.id) localMap[d.id] = d; });

    let newCount = 0;
    json.data.forEach(row => {
      if (!row.id) return;
      if (!localMap[row.id]) newCount++;
      localMap[row.id] = row; // sheet data wins
    });

    allData = Object.values(localMap).sort((a, b) =>
      (b.tanggal || '').localeCompare(a.tanggal || ''));
    filteredData = [...allData];
    saveAllToStorage();

    _setSyncUI('success', newCount);
    refreshDashboard();
    // Also refresh table if on data tab
    const dataTab = document.getElementById('tab-data');
    if (dataTab && dataTab.classList.contains('active')) {
      filteredData = [...allData]; renderTable();
    }
  } catch (err) {
    _setSyncUI('error', 0, err.message);
  } finally {
    isSyncing = false;
  }
}

function _setSyncUI(state, newCount, errMsg) {
  const btn  = document.getElementById('sync-btn');
  const info = document.getElementById('sync-info');
  if (!btn || !info) return;

  if (state === 'syncing') {
    btn.disabled   = true;
    btn.innerHTML  = '⏳ Menyinkron…';
    info.textContent = '';
    info.className = 'sync-info';
  } else if (state === 'success') {
    btn.disabled   = false;
    btn.innerHTML  = '🔄 Sync Sheets';
    const msg = newCount > 0
      ? `✅ ${newCount} data baru ditambahkan — ${_timeNow()}`
      : `✅ Data sudah terkini — ${_timeNow()}`;
    info.textContent = msg;
    info.className = 'sync-info success';
  } else {
    btn.disabled   = false;
    btn.innerHTML  = '🔄 Sync Sheets';
    info.textContent = `❌ Gagal: ${errMsg || 'Periksa koneksi'}`;
    info.className = 'sync-info error';
  }
}

function _timeNow() {
  return new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' });
}

function _injectSyncButton() {
  // Only inject once
  if (document.getElementById('sync-btn')) return;

  const dashTab = document.getElementById('tab-dashboard');
  if (!dashTab) return;

  // Insert a sync bar at the very top of the dashboard tab
  const bar = document.createElement('div');
  bar.id        = 'sync-bar';
  bar.className = 'sync-bar';
  bar.innerHTML = `
    <div class="sync-bar-left">
      <span class="sync-bar-label">📡 Data dari Google Sheets</span>
      <span id="sync-info" class="sync-info"></span>
    </div>
    <button id="sync-btn" class="sync-btn" onclick="syncFromSheets()">🔄 Sync Sheets</button>`;
  dashTab.insertBefore(bar, dashTab.firstChild);
}

/* ────────────────────────────────────────────
   LOCAL STORAGE
──────────────────────────────────────────────*/
function saveToStorage(data) {
  allData.unshift(data);
  saveAllToStorage();
}

function saveAllToStorage() {
  localStorage.setItem('tracer_data', JSON.stringify(allData));
}

function loadFromStorage() {
  try {
    allData = JSON.parse(localStorage.getItem('tracer_data') || '[]');
  } catch { allData = []; }
  filteredData = [...allData];
}

/* ────────────────────────────────────────────
   HELPERS
──────────────────────────────────────────────*/
function jenisBadge(j) {
  return j === 'lulusan'
    ? '<span class="badge badge-blue">🎓 Lulusan</span>'
    : '<span class="badge badge-amber">🏢 Pengguna</span>';
}

function statusBadge(s) {
  if (!s) return '<span class="badge badge-gray">—</span>';
  const map = {
    'Bekerja':         'badge-green',
    'Studi Lanjut S2': 'badge-violet',
    'Studi Lanjut S3': 'badge-indigo',
    'Wirausaha':       'badge-amber',
    'Belum Bekerja':   'badge-gray',
  };
  return `<span class="badge ${map[s] || 'badge-gray'}">${s}</span>`;
}

function kesediaanBadge(k) {
  return k === 'Bersedia'
    ? '<span class="badge badge-green">✅ Bersedia</span>'
    : '<span class="badge badge-red">❌ Tidak</span>';
}

function emptyState(msg) {
  return `<div style="text-align:center;padding:3rem;color:var(--muted)">
    <div style="font-size:2.5rem;margin-bottom:.5rem">📭</div>
    <p>${msg}</p></div>`;
}

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('id-ID', {
    day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit'
  });
}

function today() {
  return new Date().toISOString().slice(0,10);
}

function esc(str) {
  return (str||'').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[m]);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

function updateTopbarDate() {
  const el = document.getElementById('topbar-date');
  if (el) el.textContent = new Date().toLocaleDateString('id-ID', {
    weekday:'long', day:'numeric', month:'long', year:'numeric'
  });
}

function toggleSidebar() {
  document.querySelector('.sidebar').classList.toggle('open');
}

// Seed demo data if empty (remove in production)
(function seedDemo() {
  if (localStorage.getItem('tracer_data')) return;
  const demo = [
    { id:'demo1', tanggal: new Date(2024,10,5).toISOString(), nama:'Agus Salim Malarangeng', nim:'17051101001', whatsapp:'+6281234567890', email:'agus@gmail.com', jenis:'lulusan', tahun_lulus:'2021', status_saat_ini:'Bekerja', instansi:'BKIPM Manado', jabatan:'Staf Teknis', kota:'Manado', kesediaan:'Bersedia', catatan:'' },
    { id:'demo2', tanggal: new Date(2024,10,6).toISOString(), nama:'Sitti Rahmawati Patunru', nim:'18051101002', whatsapp:'+6285678901234', email:'sitti@yahoo.com', jenis:'lulusan', tahun_lulus:'2022', status_saat_ini:'Studi Lanjut S2', instansi:'IPB University', jabatan:'Ilmu Kelautan', kota:'Bogor', kesediaan:'Bersedia', catatan:'' },
    { id:'demo3', tanggal: new Date(2024,10,7).toISOString(), nama:'John Frederik Wuntu', nim:'19051101003', whatsapp:'+6287890123456', email:'john@outlook.com', jenis:'lulusan', tahun_lulus:'2023', status_saat_ini:'Bekerja', instansi:'PT. Indofisheries', jabatan:'QC Analyst', kota:'Bitung', kesediaan:'Bersedia', catatan:'' },
    { id:'demo4', tanggal: new Date(2024,10,8).toISOString(), nama:'Dr. Marthen Pongoh', nim:'', whatsapp:'+6289012345678', email:'marthen@unsrat.ac.id', jenis:'pengguna', nama_instansi:'FPIK UNSRAT', nama_pengguna:'Dr. Marthen Pongoh', jabatan_pengguna:'Dekan', nama_lulusan:'Berbagai Alumni', kesediaan:'Bersedia', catatan:'' },
    { id:'demo5', tanggal: new Date(2024,10,9).toISOString(), nama:'Rini Mokoagow', nim:'17051101005', whatsapp:'+6281122334455', email:'rini@gmail.com', jenis:'lulusan', tahun_lulus:'2021', status_saat_ini:'Wirausaha', instansi:'UD. Segar Laut', jabatan:'Pemilik', kota:'Tomohon', kesediaan:'Tidak Bersedia', catatan:'Sedang sibuk' },
    { id:'demo6', tanggal: new Date(2024,10,10).toISOString(), nama:'Hendri Tumewu', nim:'18051101006', whatsapp:'+6282233445566', email:'hendri@gmail.com', jenis:'lulusan', tahun_lulus:'2022', status_saat_ini:'Studi Lanjut S3', instansi:'Universitas Gadjah Mada', jabatan:'Manajemen Sumberdaya Perairan', kota:'Yogyakarta', kesediaan:'Bersedia', catatan:'' },
  ];
  localStorage.setItem('tracer_data', JSON.stringify(demo));
})();

/* ── Super Admin: ganti password sendiri ── */
function toggleSAPassForm() {
  const form = document.getElementById('sa-pass-form');
  if (!form) return;
  const isHidden = form.style.display === 'none';
  form.style.display = isHidden ? '' : 'none';
  if (isHidden) {
    ['sa-old-pass','sa-new-pass','sa-confirm-pass'].forEach(id => {
      document.getElementById(id).value = '';
    });
    ['sa-err-old','sa-err-new','sa-err-confirm'].forEach(id => {
      document.getElementById(id).textContent = '';
    });
  }
}

function changeSAPassword() {
  const oldPass     = document.getElementById('sa-old-pass').value;
  const newPass     = document.getElementById('sa-new-pass').value;
  const confirmPass = document.getElementById('sa-confirm-pass').value;
  const sa = loadSACredentials();
  let valid = true;

  if (!oldPass || oldPass !== sa.password) {
    document.getElementById('sa-err-old').textContent = 'Password lama tidak sesuai';
    valid = false;
  } else { document.getElementById('sa-err-old').textContent = ''; }

  if (!newPass || newPass.length < 6) {
    document.getElementById('sa-err-new').textContent = 'Password baru minimal 6 karakter';
    valid = false;
  } else { document.getElementById('sa-err-new').textContent = ''; }

  if (newPass && confirmPass !== newPass) {
    document.getElementById('sa-err-confirm').textContent = 'Konfirmasi password tidak cocok';
    valid = false;
  } else { document.getElementById('sa-err-confirm').textContent = ''; }

  if (!valid) return;

  saveSACredentials(sa.username, newPass);
  toggleSAPassForm();
  currentUser = sa.username; // refresh
  alert('✅ Password Super Admin berhasil diubah! Gunakan password baru saat login berikutnya.');
}

/* ────────────────────────────────────────────
   ADMIN USER MANAGEMENT (Super Admin only)
──────────────────────────────────────────────*/
function loadAdmins() {
  try {
    adminList = JSON.parse(localStorage.getItem('tracer_admins') || '[]');
  } catch { adminList = []; }

  // Seed default admin if empty
  if (!adminList.length) {
    adminList = [{
      id:        'admin_default',
      nama:      'Administrator',
      username:  CONFIG.ADMIN_USER,
      password:  CONFIG.ADMIN_PASS,
      createdAt: new Date().toISOString(),
    }];
    saveAdmins();
  }
}

function saveAdmins() {
  localStorage.setItem('tracer_admins', JSON.stringify(adminList));
}

function renderAdminUsers() {
  loadAdmins();
  const tbody = document.getElementById('admin-tbody');
  if (!tbody) return;

  if (!adminList.length) {
    tbody.innerHTML = `<tr><td colspan="6">${emptyState('Belum ada akun admin')}</td></tr>`;
    return;
  }

  tbody.innerHTML = adminList.map((a, i) => `
    <tr>
      <td>${i + 1}</td>
      <td><strong>${esc(a.nama)}</strong></td>
      <td><code class="user-code">${esc(a.username)}</code></td>
      <td><span class="pass-dots">••••••••</span></td>
      <td>${formatDate(a.createdAt)}</td>
      <td class="action-cell">
        <button class="action-btn edit-btn" onclick="openAdminModal('edit','${a.id}')">✏️ Edit</button>
        <button class="action-btn del-btn"  onclick="deleteAdminUser('${a.id}')">🗑 Hapus</button>
      </td>
    </tr>`).join('');
}

function openAdminModal(mode, id) {
  editAdminId = id || null;
  const isEdit = mode === 'edit';
  document.getElementById('admin-modal-icon').textContent  = isEdit ? '✏️' : '👤';
  document.getElementById('admin-modal-title').textContent = isEdit ? 'Edit Admin' : 'Tambah Admin Baru';
  document.getElementById('am-pass-hint').style.display    = isEdit ? '' : 'none';

  // Clear fields
  document.getElementById('am-nama').value     = '';
  document.getElementById('am-username').value = '';
  document.getElementById('am-password').value = '';
  ['am-err-nama','am-err-username','am-err-password'].forEach(id => {
    document.getElementById(id).textContent = '';
  });

  if (isEdit && id) {
    loadAdmins();
    const a = adminList.find(x => x.id === id);
    if (a) {
      document.getElementById('am-nama').value     = a.nama;
      document.getElementById('am-username').value = a.username;
    }
  }

  document.getElementById('admin-modal').classList.add('show');
}

function closeAdminModal() {
  document.getElementById('admin-modal').classList.remove('show');
  editAdminId = null;
}

function saveAdminUser() {
  const nama     = document.getElementById('am-nama').value.trim();
  const username = document.getElementById('am-username').value.trim().replace(/\s+/g, '');
  const password = document.getElementById('am-password').value;
  const isEdit   = !!editAdminId;
  let valid      = true;

  // Validate
  if (!nama) {
    document.getElementById('am-err-nama').textContent = 'Nama lengkap wajib diisi';
    valid = false;
  } else { document.getElementById('am-err-nama').textContent = ''; }

  if (!username) {
    document.getElementById('am-err-username').textContent = 'Username wajib diisi';
    valid = false;
  } else if (username === CONFIG.SUPER_ADMIN_USER) {
    document.getElementById('am-err-username').textContent = 'Username ini sudah digunakan oleh Super Admin';
    valid = false;
  } else {
    // Check duplicate username (excluding self on edit)
    loadAdmins();
    const dup = adminList.find(a => a.username === username && a.id !== editAdminId);
    if (dup) {
      document.getElementById('am-err-username').textContent = 'Username sudah digunakan';
      valid = false;
    } else {
      document.getElementById('am-err-username').textContent = '';
    }
  }

  if (!isEdit && !password) {
    document.getElementById('am-err-password').textContent = 'Password wajib diisi';
    valid = false;
  } else if (password && password.length < 6) {
    document.getElementById('am-err-password').textContent = 'Password minimal 6 karakter';
    valid = false;
  } else { document.getElementById('am-err-password').textContent = ''; }

  if (!valid) return;

  loadAdmins();
  if (isEdit) {
    const idx = adminList.findIndex(a => a.id === editAdminId);
    if (idx > -1) {
      adminList[idx].nama     = nama;
      adminList[idx].username = username;
      if (password) adminList[idx].password = password;
    }
  } else {
    adminList.push({
      id:        Date.now().toString(36),
      nama,
      username,
      password,
      createdAt: new Date().toISOString(),
    });
  }

  saveAdmins();
  closeAdminModal();
  renderAdminUsers();
}

function deleteAdminUser(id) {
  loadAdmins();
  if (adminList.length <= 1) {
    alert('Tidak dapat menghapus admin terakhir. Tambah admin lain terlebih dahulu.');
    return;
  }
  if (confirm('Hapus akun admin ini? Tindakan ini tidak dapat dibatalkan.')) {
    adminList = adminList.filter(a => a.id !== id);
    saveAdmins();
    renderAdminUsers();
  }
}

function togglePassVis(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn   = document.getElementById(btnId);
  if (!input) return;
  if (input.type === 'password') {
    input.type   = 'text';
    if (btn) btn.textContent = '🙈';
  } else {
    input.type   = 'password';
    if (btn) btn.textContent = '👁';
  }
}

function renderPublicStats() {
  loadFromStorage();
  const total = allData.length;

  // Update count badge
  const totalEl = document.getElementById('pstat-total');
  if (totalEl) totalEl.textContent = total;

  // Year pills
  const yearRow = document.getElementById('pstat-years');
  const emptyEl = document.getElementById('pstat-empty');
  const listEl  = document.getElementById('pstat-list');
  if (!yearRow || !listEl) return;

  if (total === 0) {
    yearRow.innerHTML = '';
    listEl.innerHTML  = '';
    if (emptyEl) emptyEl.style.display = '';
    document.querySelector('.pstat-list-wrap').style.display = 'none';
    return;
  }
  if (emptyEl) emptyEl.style.display = 'none';
  document.querySelector('.pstat-list-wrap').style.display = '';

  // Count per year
  const years = { '2021': 0, '2022': 0, '2023': 0 };
  let penggunaCount = 0;
  allData.forEach(d => {
    if (d.jenis === 'pengguna') penggunaCount++;
    else if (d.tahun_lulus && years[d.tahun_lulus] !== undefined) years[d.tahun_lulus]++;
  });

  let pillsHtml = '';
  Object.entries(years).forEach(([yr, cnt]) => {
    if (cnt > 0) pillsHtml += `<span class="pstat-year-pill">TS ${yr}: ${cnt} orang</span>`;
  });
  if (penggunaCount > 0) pillsHtml += `<span class="pstat-year-pill pengguna">Pengguna: ${penggunaCount} instansi</span>`;
  yearRow.innerHTML = pillsHtml;

  // List items (show all, newest first)
  listEl.innerHTML = allData.map(d => {
    const isPengguna = d.jenis === 'pengguna';
    const initial    = (d.nama || '?')[0].toUpperCase();
    const displayName = d.nama || '-';
    const meta = isPengguna
      ? (d.nama_instansi ? `🏢 ${d.nama_instansi}` : 'Pengguna Lulusan')
      : `🎓 Lulusan ${d.tahun_lulus || ''}${d.status_saat_ini ? ' · ' + d.status_saat_ini : ''}`;
    const tagClass = isPengguna ? 'pengguna' : 'lulus';
    const tagLabel = isPengguna ? 'Pengguna' : (d.tahun_lulus || 'Lulusan');
    const avatarClass = isPengguna ? 'pstat-avatar pengguna' : 'pstat-avatar';
    return `
      <div class="pstat-item">
        <div class="${avatarClass}">${initial}</div>
        <div class="pstat-info">
          <div class="pstat-name">${displayName}</div>
          <div class="pstat-meta">${meta}</div>
        </div>
        <span class="pstat-tag ${tagClass}">${tagLabel}</span>
      </div>`;
  }).join('');
}
