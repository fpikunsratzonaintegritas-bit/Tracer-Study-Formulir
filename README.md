# 📋 Sistem Tracer Study Online
## PSP MSP FPIK UNSRAT — Panduan Penggunaan Lengkap

---

## 📁 Struktur File

```
tracer-study/
├── index.html              ← File utama (buka ini di browser)
├── style.css               ← Seluruh styling / tampilan
├── app.js                  ← Logic aplikasi + dashboard
├── google-apps-script.js   ← Kode untuk integrasi Google Sheets
└── README.md               ← Panduan ini
```

---

## 🚀 Cara Penggunaan Cepat

1. **Download semua file** ke satu folder
2. **Buka `index.html`** di browser — langsung bisa digunakan
3. Data tersimpan otomatis di **localStorage** browser

---

## 🔐 Login Admin Dashboard

Buka formulir → scroll bawah → klik **"Masuk sebagai Admin"**

| Field    | Value              |
|----------|--------------------|
| Username | `admin`            |
| Password | `tracerstudy2024`  |

**Ganti password** di `app.js` baris 14:
```javascript
ADMIN_PASS: 'password-baru-anda',
```

---

## 🔗 Integrasi Google Sheets (Opsional)

### Langkah 1 — Buat Google Sheets
1. Buka [sheets.google.com](https://sheets.google.com)
2. Buat spreadsheet baru, beri nama **"Tracer Study PSP MSP"**

### Langkah 2 — Tambahkan Apps Script
1. Di Google Sheets: **Extensions → Apps Script**
2. Hapus kode default, paste seluruh isi `google-apps-script.js`
3. Klik **Save** (Ctrl+S)

### Langkah 3 — Deploy
1. Klik **Deploy → New deployment**
2. Type: **Web App**
3. Execute as: **Me**
4. Who has access: **Anyone**
5. Klik **Deploy** → salin URL yang muncul

### Langkah 4 — Hubungkan ke Form
1. Buka `app.js`
2. Temukan baris:
   ```javascript
   GOOGLE_SHEET_URL: '',
   ```
3. Ganti menjadi:
   ```javascript
   GOOGLE_SHEET_URL: 'https://script.google.com/macros/s/AKfyc.../exec',
   ```
4. Simpan file

✅ Sekarang setiap submission form akan otomatis masuk ke Google Sheets!

---

## 🌐 Cara Hosting di Website

### Opsi A — GitHub Pages (Gratis)
1. Buat akun di [github.com](https://github.com)
2. Buat repository baru → Upload semua file
3. Settings → Pages → Branch: main → Save
4. Website aktif di: `https://username.github.io/nama-repo`

### Opsi B — Netlify (Gratis, Mudah)
1. Buka [netlify.com](https://netlify.com) → Sign up
2. Drag & drop folder `tracer-study/` ke dashboard Netlify
3. Website langsung aktif dengan URL gratis
4. Bisa custom domain

### Opsi C — Hosting Biasa (cPanel)
1. Upload semua file ke folder `public_html/tracer-study/`
2. Akses via: `https://domain-anda.com/tracer-study/`

---

## ⚙️ Kustomisasi

### Ganti Nama Prodi
Cari & ganti teks `PSP MSP FPIK UNSRAT` di `index.html`

### Ganti Warna Utama
Di `style.css` baris 6:
```css
--blue:    #1d4ed8;   ← warna utama
--blue-dk: #1e3a8a;   ← warna gelap
```

### Tambah Pertanyaan
Tambahkan field baru di `index.html` dalam div `.form-card[data-step="..."]`
Lalu tambahkan ke fungsi `collectFormData()` di `app.js`

---

## 📊 Fitur Dashboard Admin

| Fitur               | Keterangan                          |
|---------------------|-------------------------------------|
| Statistik Real-time | Total, bersedia, bekerja, S2, S3    |
| Grafik Donut        | Distribusi lulusan vs pengguna      |
| Grafik Batang       | Jumlah lulusan per tahun            |
| Tabel Data          | Semua responden dengan detail       |
| Search              | Cari berdasarkan nama               |
| Filter              | Jenis, tahun, status, kesediaan     |
| Sort                | Klik header kolom untuk sort        |
| Pagination          | 10 data per halaman                 |
| Export CSV          | Untuk Google Sheets / Excel         |
| Export Excel (.xls) | Format tabel siap pakai             |
| Export PDF          | Laporan siap cetak                  |
| Hapus Data          | Per baris atau semua data           |

---

## ❓ FAQ

**Q: Data hilang setelah clear browser?**
A: Gunakan integrasi Google Sheets agar data tersimpan permanen.

**Q: Bisa diakses banyak orang sekaligus?**
A: Ya, jika dihosting online. Data masing-masing tersimpan di localStorage lokal mereka dan juga terkirim ke Google Sheets.

**Q: Bisa ganti logo universitas?**
A: Ya, ganti SVG di dalam `.logo-badge` di `index.html` dengan tag `<img>`.

---

## 📞 Dukungan
Untuk pertanyaan, hubungi Tim IT Program Studi PSP MSP FPIK UNSRAT.
