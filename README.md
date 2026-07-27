# 🚀 Backend API – Sistem Pelaporan Pengaduan Masyarakat

Backend REST API berbasis **Express JS + MySQL** untuk Uji Kompetensi RPL SMK Taruna Bhakti 2025/2026.

---

## ⚙️ Instalasi

```bash
# 1. Clone & masuk folder
cd backend

# 2. Install dependencies
npm install

# 3. Salin file env
cp .env.example .env
# → Edit .env sesuai konfigurasi database kamu

# 4. Buat database di MySQL
CREATE DATABASE pengaduan_masyarakat;

# 5. Jalankan migrasi (buat tabel)
npm run migrate

# 6. Jalankan seeder (isi data dummy)
npm run seed

# 7. Jalankan server
npm run dev
```

Server berjalan di: `http://localhost:3000`

---

## 👤 Akun Default (setelah seed)

| Role        | Email                       | Password       |
|-------------|-----------------------------|----------------|
| Super Admin | superadmin@pengaduan.id     | superadmin123  |
| Admin       | admin@pengaduan.id          | admin123       |
| User        | budi@gmail.com              | user123        |

---

## 📡 API Endpoints

### Auth
| Method | Endpoint                  | Akses  | Keterangan            |
|--------|---------------------------|--------|-----------------------|
| POST   | /api/auth/register        | Public | Daftar akun baru      |
| POST   | /api/auth/login           | Public | Login & dapat token   |
| GET    | /api/auth/me              | Auth   | Info user login       |
| PUT    | /api/auth/change-password | Auth   | Ganti password        |

### Users (Super Admin only)
| Method | Endpoint        | Keterangan         |
|--------|-----------------|--------------------|
| GET    | /api/users      | List semua user    |
| GET    | /api/users/:id  | Detail user        |
| POST   | /api/users      | Buat user baru     |
| PUT    | /api/users/:id  | Edit user          |
| DELETE | /api/users/:id  | Hapus user         |

### Categories
| Method | Endpoint             | Akses       |
|--------|----------------------|-------------|
| GET    | /api/categories      | Auth        |
| POST   | /api/categories      | Admin+      |
| PUT    | /api/categories/:id  | Admin+      |
| DELETE | /api/categories/:id  | Super Admin |

### Laporan
| Method | Endpoint                   | Akses    | Keterangan              |
|--------|----------------------------|----------|-------------------------|
| GET    | /api/laporan               | Auth     | List laporan            |
| GET    | /api/laporan/:id           | Auth     | Detail + komentar       |
| POST   | /api/laporan               | Auth     | Buat laporan + gambar   |
| PUT    | /api/laporan/:id           | Auth     | Edit laporan            |
| DELETE | /api/laporan/:id           | Auth     | Hapus laporan           |
| PATCH  | /api/laporan/:id/status    | Admin+   | Update status laporan   |

### Comments
| Method | Endpoint                          | Akses |
|--------|-----------------------------------|-------|
| GET    | /api/laporan/:laporanId/comments  | Auth  |
| POST   | /api/laporan/:laporanId/comments  | Auth  |
| PUT    | /api/comments/:id                 | Auth  |
| DELETE | /api/comments/:id                 | Auth  |

---

## 📤 Upload Gambar

Gunakan `multipart/form-data` dengan field `image` saat POST/PUT laporan.
- Format: jpg, jpeg, png, webp
- Maks: 5MB
- Akses: `http://localhost:3000/uploads/<filename>`

---

## 🔐 Autentikasi

Tambahkan header pada setiap request yang butuh autentikasi:
```
Authorization: Bearer <token>
```

---

## 📊 Status Laporan

| Status      | Keterangan             |
|-------------|------------------------|
| pending     | Menunggu review        |
| approved    | Diterima               |
| in_progress | Sedang ditangani       |
| rejected    | Ditolak                |
| resolved    | Selesai                |
