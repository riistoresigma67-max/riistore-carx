# 🏎️ RIISTORE - CarX Street Account Giveaway System

Website sistem giveaway akun game **CarX Street** otomatis untuk **riistore**. Sistem ini memungkinkan pemilik (admin) menyetok kumpulan akun (Email & Password), membuat kode acak / voucher giveaway, dan pengunjung bisa meredeem kode tersebut untuk langsung mendapatkan 1 akun secara instan!

---

## ✨ Fitur Utama

### 1. Halaman Pengunjung / Member (`/`)
- **Tampilan Gaming Futuristik & Night Street Racing**: Tema gelap dengan aksen neon amber & cyan, glassmorphism, dan responsif untuk HP & PC.
- **Redeem Kode Otomatis**: Pengunjung cukup memasukkan kode giveaway (misal: `RII-XXXX-XXXX`).
- **Reveal Akun & Animasi Menang**: Efek perayaan konfeti, reveal email dan password akun game CarX Street secara instan.
- **Salin Sekali Klik**: Tombol salin Email, salin Password, dan salin seluruh data akun sekaligus ke clipboard.
- **Live Stock Counter**: Menampilkan jumlah stok akun yang tersedia dan jumlah yang telah berhasil diklaim secara real-time.
- **Running Text Announcement**: Banner pengumuman berjalan yang dapat diubah kapan saja oleh admin.
- **FAQ & Panduan Klaim**: Langkah-langkah jelas agar pengunjung paham cara klaim dan mengamankan akunnya.

### 2. Panel Admin Terproteksi PIN (`/admin`)
- **Proteksi PIN Keamanan**: Akses dashboard diamankan dengan PIN (Default: `admin123`).
- **Statistik Lengkap**: Total stok akun, akun ready, akun terklaim, dan jumlah voucher aktif.
- **Manajemen Stok Akun CarX Street**:
  - **Input Satuan**: Masukkan email, password, dan catatan spesifikasi mobil (misal: `Lvl 50 + Nissan GT-R R35 + 15M Gold`).
  - **Bulk Import (Massal)**: Paste puluhan hingga ratusan akun sekaligus dalam format `email:password` atau `email:password:catatan`.
  - **Filter & Cari Akun**: Filter akun Ready atau Terklaim, serta intip password dengan tombol mata.
  - **Bersihkan Akun Terklaim**: 1 klik untuk menghapus akun yang sudah diambil agar database tetap rapi.
- **Generator Kode Giveaway (Voucher)**:
  - **Auto-Generate Kode Acak**: Buat 5, 10, 25, atau 50 kode unik acak sekaligus dengan prefix custom (misal: `RII-`).
  - **Kode Custom Manual**: Buat kode khusus sesuai nama event (misal: `CARX-EVENT-SPESIAL`).
  - **Atur Kuota**: Bisa 1x pakai (1 orang 1 akun) atau multi-kuota (misal kode untuk 10 pemenang tercepat di live stream).
  - **Salin Semua Kode Aktif**: Salin seluruh daftar kode aktif sekaligus dengan 1 klik untuk langsung di-paste ke deskripsi YouTube / TikTok live / Discord / WhatsApp.
- **Riwayat Klaim (Audit Log)**:
  - Catatan waktu klaim, kode yang digunakan, email akun yang didapat, dan IP pengunjung.
  - Tombol **Export ke CSV** untuk backup dan laporan.
- **Pengaturan Toko**:
  - Ganti nama website / toko (`riistore`).
  - Ganti pesan running text pengumuman.
  - Atur link WhatsApp, TikTok, Discord, Telegram.
  - Ubah PIN Admin.

---

## 🚀 Cara Menjalankan

### Cara Cepat (Windows):
Cukup klik dua kali file **`start.bat`**.

### Cara Manual via Terminal:
```bash
# Jalankan server
node server.js
```

Buka di browser:
- 🌐 **Halaman Utama / Klaim Giveaway**: [http://localhost:3000](http://localhost:3000)
- 🔑 **Admin Panel**: [http://localhost:3000/admin](http://localhost:3000/admin)
- 🔒 **PIN Default Admin**: `admin123`

---

## 📁 Struktur File
```
.
├── server.js                 # Server Express & REST API
├── database.js               # Handler database aman & logika klaim
├── package.json              # Konfigurasi npm
├── start.bat                 # Script 1-klik untuk menjalankan server
├── data/
│   └── riistore_data.json    # File penyimpanan data (otomatis tersimpan)
└── public/
    ├── index.html            # Halaman Pengunjung / Redeem
    ├── admin.html            # Dashboard Admin Panel
    ├── css/
    │   └── style.css         # Styling dark racing & animasi
    └── js/
        ├── app.js            # Interaksi halaman utama (klaim, modal, confetti)
        └── admin.js          # Logika admin (CRUD akun, generator kode, history)
```
