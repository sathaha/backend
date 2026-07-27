const db = require('./database');
const bcrypt = require('bcryptjs');

const seed = async () => {
  try {
    // Seed categories
    await db.execute(`
      INSERT IGNORE INTO categories (id, name, description) VALUES
      (1, 'Infrastruktur', 'Jalan rusak, jembatan, drainase, dll'),
      (2, 'Pelayanan Publik', 'Keluhan pelayanan instansi pemerintah'),
      (3, 'Lingkungan', 'Sampah, polusi, banjir, dll'),
      (4, 'Keamanan', 'Kriminalitas, gangguan ketertiban umum'),
      (5, 'Sosial', 'Kemiskinan, pendidikan, kesehatan')
    `);
    console.log('✅ Categories seeded');

    // Seed users
    const hashSuper  = await bcrypt.hash('superadmin123', 10);
    const hashAdmin  = await bcrypt.hash('admin123', 10);
    const hashUser   = await bcrypt.hash('user123', 10);

    await db.execute(`
      INSERT IGNORE INTO users (id, name, email, password, role) VALUES
      (1, 'Super Admin', 'superadmin@pengaduan.id', ?, 'super_admin'),
      (2, 'Admin Kota', 'admin@pengaduan.id', ?, 'admin'),
      (3, 'Budi Santoso', 'budi@gmail.com', ?, 'user')
    `, [hashSuper, hashAdmin, hashUser]);
    console.log('✅ Users seeded');

    // Seed laporan dummy
    await db.execute(`
      INSERT IGNORE INTO laporan (id, user_id, category_id, title, description, location, status) VALUES
      (1, 3, 1, 'Jalan Rusak di Jl. Sudirman', 'Terdapat lubang besar di jalan yang membahayakan pengendara', 'Jl. Sudirman No. 10', 'pending'),
      (2, 3, 3, 'Tumpukan Sampah di TPS', 'Sampah menumpuk dan tidak diangkut lebih dari 1 minggu', 'TPS Pasar Baru', 'approved'),
      (3, 3, 2, 'Pelayanan KTP Lama', 'Proses pembuatan KTP memakan waktu lebih dari 30 hari', 'Kantor Disdukcapil', 'in_progress')
    `);
    console.log('✅ Laporan seeded');

    // Seed comments
    await db.execute(`
      INSERT IGNORE INTO comments (laporan_id, user_id, content) VALUES
      (1, 2, 'Laporan telah diterima dan akan segera ditindaklanjuti'),
      (1, 3, 'Terima kasih, sudah berapa lama ini terjadi?'),
      (2, 2, 'Tim kebersihan sudah dijadwalkan untuk pengangkutan')
    `);
    console.log('✅ Comments seeded');

    console.log('\n🎉 Seeding completed! Akun default:');
    console.log('  Super Admin : superadmin@pengaduan.id / superadmin123');
    console.log('  Admin       : admin@pengaduan.id / admin123');
    console.log('  User        : budi@gmail.com / user123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

seed();
