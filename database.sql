CREATE DATABASE IF NOT EXISTS pengaduan_tb
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE pengaduan_tb;

-- ─── TABEL USERS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  email       VARCHAR(100) NOT NULL UNIQUE,
  password    VARCHAR(255) NOT NULL,
  role        ENUM('user', 'admin', 'super_admin') DEFAULT 'user',
  avatar      VARCHAR(255) DEFAULT NULL,
  is_active   BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── TABEL CATEGORIES ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(100) NOT NULL,
  description TEXT DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ─── TABEL LAPORAN ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS laporan (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  user_id      INT NOT NULL,
  category_id  INT NOT NULL,
  title        VARCHAR(255) NOT NULL,
  description  TEXT NOT NULL,
  location     VARCHAR(255) DEFAULT NULL,
  image        VARCHAR(255) DEFAULT NULL,
  status       ENUM('pending', 'approved', 'rejected', 'in_progress', 'resolved') DEFAULT 'pending',
  admin_note   TEXT DEFAULT NULL,
  created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT
);

-- ─── TABEL COMMENTS ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS comments (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  laporan_id  INT NOT NULL,
  user_id     INT NOT NULL,
  content     TEXT NOT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (laporan_id) REFERENCES laporan(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)   ON DELETE CASCADE
);

-- ============================================================
-- DATA AWAL (SEED)
-- ============================================================

-- ─── CATEGORIES ──────────────────────────────────────────────
INSERT INTO categories (id, name, description) VALUES
(1, 'Infrastruktur',    'Jalan rusak, jembatan, drainase, dll'),
(2, 'Pelayanan Publik', 'Keluhan pelayanan instansi pemerintah'),
(3, 'Lingkungan',       'Sampah, polusi, banjir, dll'),
(4, 'Keamanan',         'Kriminalitas, gangguan ketertiban umum'),
(5, 'Sosial',           'Kemiskinan, pendidikan, kesehatan');

-- ─── USERS ───────────────────────────────────────────────────
-- Password sudah di-hash dengan bcrypt (cost 10)
-- superadmin123 → hash di bawah
-- admin123      → hash di bawah
-- user123       → hash di bawah
INSERT INTO users (id, name, email, password, role) VALUES
(1, 'Super Admin', 'superadmin@pengaduan.id',
 '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'super_admin'),
(2, 'Admin Kota',  'admin@pengaduan.id',
 '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin'),
(3, 'Budi Santoso','budi@gmail.com',
 '$2a$10$TKh8H1.PffiGHKkL3g5ypOSzQm3xKNwWX1kYVUoSEKJwqmFfbMnlq', 'user');

-- ─── LAPORAN ─────────────────────────────────────────────────
INSERT INTO laporan (id, user_id, category_id, title, description, location, status) VALUES
(1, 3, 1, 'Jalan Rusak di Jl. Sudirman',
 'Terdapat lubang besar di tengah jalan yang membahayakan pengendara motor dan mobil.',
 'Jl. Sudirman No. 10', 'pending'),
(2, 3, 3, 'Tumpukan Sampah di TPS Pasar Baru',
 'Sampah menumpuk dan tidak diangkut lebih dari 1 minggu, menimbulkan bau tidak sedap.',
 'TPS Pasar Baru', 'approved'),
(3, 3, 2, 'Pelayanan KTP Memakan Waktu Lama',
 'Proses pembuatan KTP memakan waktu lebih dari 30 hari tanpa kejelasan.',
 'Kantor Disdukcapil', 'in_progress');

-- ─── COMMENTS ────────────────────────────────────────────────
INSERT INTO comments (laporan_id, user_id, content) VALUES
(1, 2, 'Laporan telah diterima dan akan segera ditindaklanjuti oleh tim terkait.'),
(1, 3, 'Terima kasih, sudah berapa lama lubang ini ada pak?'),
(2, 2, 'Tim kebersihan sudah dijadwalkan untuk pengangkutan besok pagi.'),
(3, 2, 'Sedang dalam proses koordinasi dengan Disdukcapil.');

-- ============================================================
-- CEK HASIL
-- ============================================================
select*from users;
SHOW COLUMNS FROM laporan;
SELECT 'users'      as tabel, COUNT(*) as total FROM users
UNION ALL
SELECT 'categories' as tabel, COUNT(*) as total FROM categories
UNION ALL
SELECT 'laporan'    as tabel, COUNT(*) as total FROM laporan
UNION ALL
SELECT 'comments'   as tabel, COUNT(*) as total FROM comments;

UPDATE users SET role = 'super_admin' WHERE email = 'superadminn@pengaduan.id';
UPDATE users SET role = 'admin' WHERE email = 'adminn@pengaduan.id';

USE pengaduan_tb;
SELECT COUNT(*) as count FROM laporan l WHERE 1=1;
SELECT l.*, u.name as user_name, u.email as user_email, c.name as category_name
FROM laporan l
JOIN users u ON l.user_id = u.id
JOIN categories c ON l.category_id = c.id
WHERE 1=1
ORDER BY l.created_at DESC
LIMIT 5 OFFSET 0;

SELECT l.*, u.name as user_name, u.email as user_email, c.name as category_name
FROM laporan l
JOIN users u ON l.user_id = u.id
JOIN categories c ON l.category_id = c.id
WHERE 1=1
ORDER BY l.created_at DESC
LIMIT 5 OFFSET 0;

CREATE TABLE IF NOT EXISTS laporan_timeline (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  laporan_id  INT NOT NULL,
  user_id     INT NOT NULL,
  status      ENUM('pending','approved','rejected','in_progress','resolved') NOT NULL,
  note        TEXT DEFAULT NULL,
  created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (laporan_id) REFERENCES laporan(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)   ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notifications (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  user_id    INT NOT NULL,
  message    TEXT NOT NULL,
  laporan_id INT DEFAULT NULL,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)    REFERENCES users(id)   ON DELETE CASCADE,
  FOREIGN KEY (laporan_id) REFERENCES laporan(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS laporan_likes (
  id         INT AUTO_INCREMENT PRIMARY KEY,
  laporan_id INT NOT NULL,
  user_id    INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_like (laporan_id, user_id),
  FOREIGN KEY (laporan_id) REFERENCES laporan(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id)    REFERENCES users(id)   ON DELETE CASCADE
);

SELECT avatar FROM users;
SELECT image FROM laporan;
show tables;

drop table laporan_likes;
SELECT * FROM laporan_likes;

CREATE TABLE contact_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES users(id)
    ON DELETE CASCADE
);

CREATE TABLE contacts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) NOT NULL,
  subject VARCHAR(255),
  message TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE users
ADD COLUMN reset_token VARCHAR(255),
ADD COLUMN reset_token_expired BIGINT;
SHOW TABLES;

DESCRIBE users;

drop table contact_messages;

CREATE TABLE comment_reactions (
  id INT PRIMARY KEY AUTO_INCREMENT,
  comment_id INT NOT NULL,
  user_id INT NOT NULL,
  emoji VARCHAR(10) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_reaction (comment_id, user_id, emoji),
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

SELECT *
FROM comment_reactions
WHERE comment_id = 71;

SELECT
  emoji,
  COUNT(*) as count,
  MAX(CASE WHEN user_id = 9 THEN 1 ELSE 0 END) as reacted
FROM comment_reactions
WHERE comment_id = 71
GROUP BY emoji;

