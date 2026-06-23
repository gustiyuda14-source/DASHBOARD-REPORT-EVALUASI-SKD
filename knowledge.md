# Perjalanan Redesign Arsitektur Dashboard Evaluasi D'Ajiks Akademi

## Latar Belakang

Dashboard awal (`index.html`) adalah satu file monolitik — semua CSS, logika, dan data siswa ditulis hardcode di dalam satu file HTML. Tidak ada koneksi ke database nyata, tidak bisa di-update tanpa buka kode, dan tidak modular sama sekali.

---

## Tahapan yang Dilalui

### 1. Identifikasi Masalah Arsitektur

Masalah utama yang ditemukan:
- Data siswa hardcoded langsung di JS (harus ubah kode setiap update nilai)
- Tidak ada pemisahan antara data, logika, dan tampilan
- Tidak bisa scale — menambah tab/fitur baru berarti menambah kode ke satu file yang makin besar
- Tidak ada cara mudah untuk orang lain (bukan developer) input data

### 2. Keputusan: Database = Google Sheets via Published CSV

Pilihan database dievaluasi:
- **Google Sheets API (Service Account)** → ditolak karena butuh Google Cloud, kartu kredit, setup rumit
- **Supabase / PostgreSQL** → terlalu berat untuk kebutuhan ini, butuh backend
- **Google Sheets Published CSV** → dipilih karena:
  - Zero auth — tidak perlu API key
  - Update data = buka Google Sheets, isi angka, selesai
  - Guru/pelatih bisa input langsung tanpa sentuh kode
  - URL CSV statis, fetch langsung dari browser

**Cara kerjanya:** File → Share → Publish to web → pilih sheet → format CSV → URL publik siap di-fetch.

### 3. Keputusan: Vite sebagai Build Tool

Dari single HTML file ke project modular:
- `package.json` dengan `"type": "module"`
- Chart.js via npm (bukan CDN) → lebih reliable, bisa tree-shake
- `vite.config.js` dengan `base: './'` untuk relative asset path
- Build output ke `dist/` — siap deploy ke mana saja

### 4. Arsitektur Modular yang Dipilih

```
src/
├── config.js       → semua konstanta (URL CSV, ambang SKD, warna siswa)
├── data.js         → fetch + parsing CSV, merge 4 sheet jadi 1 student array
├── utils.js        → fungsi bantu (isPass, initials, genderBadge, activeTOs)
├── main.js         → app entry, loading state, window functions
└── tabs/
    ├── overview.js
    ├── siswa.js
    ├── ranking.js
    ├── kumulatif.js
    ├── toefl.js
    ├── jasmani.js
    └── psiko.js
```

Prinsip: setiap tab adalah modul independen. Menambah tab baru = buat 1 file JS baru + 1 panel HTML.

### 5. Tantangan Teknis: Parsing CSV 2-Row Header

Google Sheets dengan merged cells mengekspor CSV dengan baris pertama berisi nama grup (TRYOUT 1, TRYOUT 2, ...) dan baris kedua berisi sub-kolom (TWK, TIU, TKP). Sel yang di-merge jadi string kosong di kolom-kolom berikutnya.

Solusi: algoritma **fill-forward** — scan row 1, jika cell kosong maka isi dengan nilai cell sebelumnya. Lalu kombinasikan row1 + row2 menjadi `{group, sub}` tuple per kolom.

### 6. Tantangan: TOTAL = 0 untuk Baris Kosong

Formula `=TWK+TIU+TKP` di Google Sheets menghitung `0+0+0=0` untuk baris siswa yang tidak hadir (cell kosong dianggap 0). Solusi dua lapis:
- Di Sheets: ganti formula jadi `=IF(AND(ISBLANK(B),ISBLANK(C),ISBLANK(D)),"",B+C+D)`
- Di `data.js`: kolom TOTAL dari CSV di-skip, TOTAL dihitung ulang dari TWK+TIU+TKP di JS

### 7. Penambahan 3 Tab Baru (TOEFL, Jasmani, Psiko)

Data baru disimpan di sheet terpisah dalam spreadsheet yang sama. Struktur per sheet:
- **TOEFL**: header 2 baris — TOEFL 1..10 / JUMLAH NILAI, LISTENING, READING, WRITING
- **JASMANI**: header 2 baris — EVALUASI 1..5 / LARI 12 MENIT, PUSH UP, PULL UP/CHIN UP, SIT UP, LARI ANGKA 8
- **PSIKO**: header 2 baris — TRYOUT 1..5 / KECERDASAN, KECERMATAN, KEPRIBADIAN

Parsing menggunakan fungsi yang sama (`buildHeaders` + fill-forward). Setiap tab menampilkan empty-state jika data belum diisi.

### 8. Deploy Pipeline

```
Google Sheets (input data) 
    ↓ Published CSV (public URL)
    ↓ fetch() di browser
Dashboard Vite App (github: gustiyuda14-source/DASHBOARD-REPORT-EVALUASI-SKD)
    ↓ push to main
    ↓ auto-deploy via Vercel git integration
https://dashboard-evaluasi-dajiks.vercel.app
```

---

## Pelajaran Utama

- **Untuk data yang dikelola non-developer:** Google Sheets CSV jauh lebih praktis dari database relasional
- **Single file HTML ≠ simple** — justru makin susah dikelola. Modular dari awal lebih mudah di-maintain
- **Published CSV = realtime** — setiap refresh halaman, data terbaru langsung terbaca
- **Vite + vanilla JS** cukup untuk dashboard seperti ini — tidak perlu React/Vue
- **Ambang batas SKD IPDN:** TWK≥65, TIU≥80, TKP≥166, Total≥311 (PermenPAN-RB No.27/2021)

---

## Status Saat Ini (24 Juni 2026)

- [x] SKD — live, TO1-TO4 ada data
- [x] TOEFL, Jasmani, Psiko — tab tersedia, menunggu input data
- [ ] Threshold logic TOEFL (skor minimum) — belum diimplementasi
- [ ] Threshold logic Jasmani (grade POLRI SAMAPTA) — belum diimplementasi  
- [ ] Threshold logic Psiko — belum diimplementasi
