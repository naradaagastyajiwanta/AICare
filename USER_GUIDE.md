# Panduan Pengguna AICare Dashboard

**Versi:** 2.0  
**Dibuat oleh:** [NAJWorks.com](https://NAJWorks.com)  
**Bahasa:** Bahasa Indonesia

---

## 📋 Daftar Isi

1. [Pengenalan AICare](#1-pengenalan-aicare)
2. [Cara Mengakses Dashboard](#2-cara-mengakses-dashboard)
3. [Halaman Overview (Beranda)](#3-halaman-overview-beranda)
4. [Kelola Pasien](#4-kelola-pasien)
5. [Kepatuhan Minum Obat](#5-kepatuhan-minum-obat)
6. [Laporan Harian Pasien](#6-laporan-harian-pasien)
7. [Materi Edukasi & Broadcast](#7-materi-edukasi--broadcast)
8. [Knowledge Base (RAG)](#8-knowledge-base-rag)
9. [Analitik & Statistik](#9-analitik--statistik)
10. [WhatsApp Connection](#10-whatsapp-connection)
11. [FAQ & Troubleshooting](#11-faq--troubleshooting)

---

## 1. Pengenalan AICare

AICare adalah sistem monitoring kesehatan berbasis WhatsApp untuk Posyandu. Sistem ini membantu petugas kesehatan:

- ✅ **Mengirim reminder obat** otomatis ke pasien via WhatsApp
- ✅ **Mencatat respons pasien** — sudah minum obat atau belum
- ✅ **Memonitor aktivitas fisik & pola makan** pasien
- ✅ **Mengirim edukasi kesehatan** ke semua pasien dalam satu klik
- ✅ **Menjawab pertanyaan pasien** menggunakan AI berbahasa Indonesia

### Peran Petugas Posyandu

Sebagai petugas, Anda bertugas:
1. Mendaftarkan pasien ke sistem
2. Mengatur jadwal reminder obat
3. Memantau kepatuhan minum obat harian
4. Mengirim materi edukasi & motivasi
5. Mengelola dokumen knowledge base untuk AI

---

## 2. Cara Mengakses Dashboard

### Desktop (Laptop/Komputer)

1. Buka browser (Chrome, Firefox, Edge)
2. Masukkan alamat: `http://localhost:3005`
3. Tampilan sidebar di sebelah kiri, konten di sebelah kanan

### Mobile (HP/Tablet)

1. Buka Chrome/Safari di HP
2. Masukkan alamat server (sesuai IP server)
3. **Install PWA** — Menu Chrome → "Tambah ke Layar Utama"
4. Gunakan bottom navigation di bawah layar

> 💡 **Tip:** Setelah install PWA, AICare bisa dibuka seperti aplikasi biasa dari homescreen HP, tanpa perlu buka browser lagi.

---

## 3. Halaman Overview (Beranda)

Halaman pertama yang muncul saat login. Berisi ringkasan kondisi hari ini.

### Statistik Kartu

| Kartu | Arti | Cara Baca |
|-------|------|-----------|
| **Pasien Aktif** | Jumlah pasien yang menerima reminder | Angka besar = pasien terdaftar aktif |
| **Reminder Terkirim** | Total reminder hari ini (obat + aktivitas + makan) | Terbagi 3 kategori |
| **Kepatuhan Obat** | Persentase pasien yang sudah minum obat | Target: ≥80% |
| **Belum Merespons** | Pasien yang sudah dikirimi reminder tapi belum jawab | Perlu ditindaklanjuti |

### Grafik

- **Tren Kepatuhan (Batang)** — 7 hari terakhir, hijau = sudah minum, merah = belum
- **Breakdown Kategori (Donut)** — Proporsi reminder: Obat vs Aktivitas vs Pola Makan

> ⚠️ **Perhatian:** Jika ada notifikasi merah "Pasien Belum Merespons", segera cek halaman **Kepatuhan**.

---

## 4. Kelola Pasien

### 4.1 Melihat Daftar Pasien

1. Tap menu **Pasien** di sidebar/bottom nav
2. Tampilkan daftar semua pasien dalam bentuk:
   - **Desktop:** Tabel dengan kolom Nama, No. WA, Obat, Jam, Wali, Kepatuhan
   - **Mobile:** Card list (kartu per pasien)

### 4.2 Menambah Pasien Baru

1. Tap tombol **Tambah Pasien** (warna biru)
2. Isi form:
   - **Data Pribadi:** Nama Lengkap, No. WhatsApp, Nama Obat, Catatan
   - **Data Wali:** Nama Wali, No. WA Wali (opsional)
   - **Jadwal Pengingat:** Jam minum obat, kategori (Obat/Aktivitas/Pola Makan), label (opsional)
3. Tap **Simpan**

> 💡 **Tip:** No. WhatsApp harus diawali `628` (tanpa tanda `+`). Contoh: `6281234567890`

### 4.3 Menambah Jadwal Reminder

Satu pasien bisa punya **banyak jadwal** reminder (pagi, siang, sore):

1. Buka form tambah/edit pasien
2. Di bagian **Jadwal Pengingat**, tap **Tambah**
3. Pilih jam, kategori, dan label (misal: "Pagi", "Sore")
4. Simpan

### 4.4 Mengedit Pasien

1. Cari pasien di daftar
2. **Desktop:** Hover baris pasien → ikon ✏️ muncul → klik Edit
3. **Mobile:** Buka card pasien → tap tombol **Edit**
4. Ubah data → Simpan

### 4.5 Menonaktifkan Pasien

Jika pasien tidak perlu reminder lagi:

- **Desktop:** Klik toggle switch di kolom Status
- **Mobile:** Tap tombol **Nonaktifkan** di card pasien

Pasien nonaktif tidak akan menerima reminder WhatsApp.

### 4.6 Mencari Pasien

Gunakan kotak pencarian di atas tabel/card:
- Ketik nama pasien, nomor WA, atau nama obat
- Hasil langsung muncul saat mengetik

---

## 5. Kepatuhan Minum Obat

Halaman ini menampilkan **tracking harian** — pasien mana saja yang sudah/belum merespons reminder obat.

### 5.1 Membaca Tabel Kepatuhan

- **Baris:** Nama pasien + nama obatnya
- **Kolom:** Tanggal (7/14/30 hari terakhir)
- **Badge:**
  - 🟢 **Sudah** — Pasien menjawab "sudah minum"
  - 🔴 **Belum** — Pasien menjawab "belum minum"
  - 🟡 **Tidak Jelas** — AI tidak mengerti jawaban
  - ⚪ **Tidak merespons** — Pasien tidak balas sama sekali

### 5.2 Mengubah Rentang Waktu

1. Pilih dropdown di pojok kanan atas
2. Pilihan: 7 hari / 14 hari / 30 hari terakhir

> ⚠️ **Perhatian:** Jika ada banyak pasien yang belum merespons, cek:
> 1. Apakah WhatsApp terhubung? (lihat halaman **WhatsApp**)
> 2. Apakah nomor pasien masih aktif?

---

## 6. Laporan Harian Pasien

Halaman ini menampilkan **skor kesehatan harian** setiap pasien.

### 6.1 Skoring System

| Kategori | Poin Maksimal | Cara Dapat |
|----------|---------------|------------|
| **Obat** | 100 | Minum obat (YES) |
| **Aktivitas** | 100 | ≥2 sesi olahraga |
| **Pola Makan** | 100 | Makan sehat |
| **Total** | **300** | — |

### 6.2 Status "Luar Biasa"

Jika pasien mendapat **semua poin sempurna** (obat 100 + aktivitas 100 + makan 100), maka:
- Muncul badge emas ⭐ **Luar Biasa**
- Sistem otomatis kirim pesan motivasi via WhatsApp

### 6.3 Mengubah Rentang Waktu

Sama seperti halaman Kepatuhan — pilih 7/14/30 hari di dropdown.

---

## 7. Materi Edukasi & Broadcast

### 7.1 Melihat Materi Edukasi

1. Tap menu **Edukasi**
2. Tampilkan grid kartu materi edukasi
3. Filter berdasarkan kategori: Semua / Do's & Don'ts / Motivasi / Nutrisi / Aktivitas

Setiap kartu menampilkan:
- Gambar poster (jika ada)
- Judul
- Konten
- Status: Aktif / Nonaktif

### 7.2 Menambah Materi Edukasi

1. Tap **Tambah Materi**
2. Isi form:
   - **Gambar/Poster** — klik area upload atau masukkan URL
   - **Kategori** — pilih jenis materi
   - **Judul** — contoh: "Tips Minum Obat Teratur"
   - **Konten** — tulis pesan yang akan dikirim ke pasien
3. Tap **Simpan Materi**

### 7.3 Broadcast ke Semua Pasien

1. Buka menu **Broadcast**
2. Di kolom kiri, tulis:
   - **Judul** (opsional) — contoh: "Jadwal Posyandu Bulan Ini"
   - **Pesan** — isi pesan yang ingin dikirim
3. Atau gunakan **Template** — klik salah satu materi edukasi di bawah
4. Tap **Kirim ke Semua Pasien**

> ✅ Hasil: Sistem akan mengirim pesan ke semua pasien yang statusnya **Aktif**.

### 7.4 Riwayat Broadcast

Di kolom kanan halaman Broadcast, Anda bisa melihat:
- Pesan yang pernah dikirim
- Jumlah penerima
- Tanggal pengiriman

---

## 8. Knowledge Base (RAG)

Knowledge Base adalah **perpustakaan dokumen** yang digunakan AI untuk menjawab pertanyaan pasien.

### 8.1 Cara Kerja

1. Pasien bertanya via WhatsApp: "Apa itu hipertensi?"
2. AI mencari dokumen paling relevan di Knowledge Base
3. AI menjawab berdasarkan dokumen tersebut

### 8.2 Menambah Dokumen Manual

1. Buka menu **Knowledge Base**
2. Tap **Tambah**
3. Isi:
   - **Kategori** — Penyakit / Obat / Gaya Hidup / Posyandu / Umum
   - **Judul** — contoh: "Cara Minum Obat Hipertensi"
   - **Konten** — tulis penjelasan singkat dan jelas
4. Tap **Simpan**

### 8.3 Upload DOCX (Bulk)

Jika Anda punya dokumen Word (.docx) panjang:

1. Tap **Upload DOCX**
2. Pilih file dari komputer
3. Sistem akan otomatis memecah dokumen menjadi **chunks** (bagian-bagian kecil)
4. Pilih chunk mana yang ingin disimpan
5. Pilih kategori
6. Tap **Simpan**

> 💡 **Tip:** Satu topik = satu dokumen. Jangan gabungkan banyak penyakit dalam satu file.

### 8.4 Mengaktifkan/Nonaktifkan Dokumen

Tap tombol **Aktif** / **Nonaktif** pada setiap baris dokumen. Dokumen nonaktif tidak akan digunakan AI.

### 8.5 Hapus Dokumen

- **Satu dokumen:** Klik ikon 🗑️ di baris dokumen
- **Banyak dokumen:** Centang checkbox → klik **Hapus X dokumen**

---

## 9. Analitik & Statistik

Halaman ini menampilkan **data visual** untuk evaluasi program.

### 9.1 Ringkasan Angka

| Kartu | Keterangan |
|-------|------------|
| Total Reminder | Semua reminder yang pernah dikirim (30 hari) |
| Respons Masuk | Berapa banyak pasien yang membalas |
| Sudah Minum | Total konfirmasi "sudah minum obat" |
| Kepatuhan Overall | Persentase keseluruhan |

### 9.2 Grafik

- **Tren Kepatuhan Harian (Garis)** — Naik turunnya kepatuhan per hari
- **Kepatuhan per Pasien (Batang Horizontal)** — Siapa yang paling rajin minum obat

> 💡 **Tip:** Gunakan data ini untuk laporan bulanan ke puskesmas.

---

## 10. WhatsApp Connection

Halaman untuk mengelola koneksi WhatsApp AICare.

### 10.1 Status Koneksi

| Status | Warna | Arti | Tindakan |
|--------|-------|------|----------|
| Terhubung | 🟢 Hijau | WhatsApp aktif, siap kirim/terima | Tidak perlu tindakan |
| Menunggu QR | 🔵 Biru | Perlu scan QR code | Scan QR dengan HP |
| Terputus | 🔴 Merah | Koneksi putus | Tap **Hubungkan Ulang** |
| Menghubungkan | 🟡 Kuning | Sedang proses | Tunggu 10-30 detik |

### 10.2 Scan QR Code

1. Pastikan status menunjukkan **"Menunggu scan QR"**
2. QR code akan muncul di layar
3. Buka WhatsApp di HP Anda
4. Menu → Perangkat Tertaut → Tautkan Perangkat Baru
5. Scan QR code di layar dashboard
6. Tunggu hingga status berubah menjadi **"Terhubung"**

### 10.3 Menghubungkan Ulang

Jika QR kadaluarsa atau koneksi putus:

1. Tap tombol biru **Hubungkan Ulang / Tampilkan QR Baru**
2. Scan QR code yang baru
3. Status akan berubah menjadi "Terhubung"

> ⚠️ **Penting:** Jangan logout dari WhatsApp Web di HP. Jika logout, QR harus di-scan ulang.

---

## 11. FAQ & Troubleshooting

### Q: Pasien tidak menerima reminder?
**A:** Cek halaman WhatsApp — pastikan status **"Terhubung"**. Jika masih terputus, scan QR ulang.

### Q: Pasien balas "sudah" tapi tidak tercatat?
**A:** Cek halaman **Kepatuhan** — biasanya butuh waktu 5-10 detik. Jika belum muncul, refresh halaman.

### Q: Bagaimana cara ganti jam reminder pasien?
**A:** Buka halaman **Pasien** → Edit pasien → bagian **Jadwal Pengingat** → ubah jam → Simpan.

### Q: Bisa tidak satu pasien punya banyak jadwal obat?
**A:** Bisa. Tap **Tambah** di bagian Jadwal Pengingat saat edit pasien. Maksimal tidak dibatasi.

### Q: AI menjawab pertanyaan pasien dengan jawaban aneh?
**A:** Tambahkan dokumen relevan ke **Knowledge Base**. AI menjawab berdasarkan dokumen yang tersedia.

### Q: Dashboard lambat di HP?
**A:** Install sebagai PWA (Add to Home Screen). PWA lebih cepat daripada buka via browser.

### Q: Lupa cara pakainya?
**A:** Buka halaman **Panduan** di sidebar/bottom nav. Atau baca dokumen ini kapan saja.

---

## 🆘 Butuh Bantuan?

Jika mengalami masalah teknis, hubungi tim developer:

🌐 **Website:** [NAJWorks.com](https://NAJWorks.com)

---

<p align="center">
  <sub>AICare Dashboard v2.0 — Dibuat oleh NAJWorks.com</sub>
</p>
