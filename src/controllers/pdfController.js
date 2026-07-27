const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');
const db = require('../config/database');

const exportLaporanPdf = async (req, res) => {
  try {
    // 1. Ambil data laporan lengkap beserta relasi user dan kategori
    const [rows] = await db.query(
      `SELECT l.*, 
              u.name as user_name,
              u.email as user_email,
              c.name as category_name
       FROM laporan l
       JOIN users u ON l.user_id = u.id
       JOIN categories c ON l.category_id = c.id
       WHERE l.id = ?`,
      [req.params.id]
    );

    // Jika laporan tidak ditemukan
    if (!rows.length) {
      return res.status(404).json({
        success: false,
        message: 'Laporan tidak ditemukan'
      });
    }

    const laporan = rows[0];

    // 2. VALIDASI OTORISASI (HAK AKSES)
    // Mengambil data user dari middleware 'authenticate' (req.user)
    const userIdYangLogin = req.user.id;
    const roleUserYangLogin = req.user.role;

    // const isOwner = laporan.user_id === userIdYangLogin;
    // const isAdmin = ['admin', 'super_admin'].includes(roleUserYangLogin);

    // // Jika bukan pemilik laporan DAN bukan admin, tolak akses (403 Forbidden)
    // if (!isOwner && !isAdmin) {
    //   return res.status(403).json({
    //     success: false,
    //     message: 'Anda tidak memiliki hak akses untuk mengunduh laporan ini.'
    //   });
    // }

    // 3. INISIALISASI PDF KIT
    const doc = new PDFDocument({ margin: 50 });
    const filename = `laporan-${laporan.id}.pdf`;

    // 4. SET HEADERS (Wajib sebelum dilakukan doc.pipe)
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"`
    );

    // Alirkan data PDF langsung ke object response Express
    doc.pipe(res);

    // ─── DESAIN & KONTEN PDF ─────────────────────────────────────────────

    // HEADER UTAMA
    doc
      .fontSize(22)
      .font('Helvetica-Bold')
      .text('LAPORAN PENGADUAN MASYARAKAT', { align: 'center' });

    doc.moveDown(0.3);

    doc
      .fontSize(12)
      .font('Helvetica')
      .fillColor('gray')
      .text('Sistem Informasi Pengaduan Masyarakat', { align: 'center' });

    doc.moveDown(1.5);
    doc.fillColor('black'); // Reset warna font ke hitam

    // SEPARATOR LINE
    doc
      .moveTo(50, doc.y)
      .lineTo(545, doc.y)
      .stroke();
    
    doc.moveDown(1.5);

    // SUB-HEADER DETAIL
    doc
      .fontSize(16)
      .font('Helvetica-Bold')
      .text('Detail Laporan', { underline: true });

    doc.moveDown(1);

    // Fungsi Helper untuk membuat baris data yang rapi
    const addRow = (label, value) => {
      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .text(label + ': ', { continued: true })
        .font('Helvetica')
        .text(String(value ?? '-'));

      doc.moveDown(0.6);
    };

    // Mengisi data detail laporan
    addRow('ID Laporan', laporan.id);
    addRow('Judul Pengaduan', laporan.title);
    addRow('Kategori', laporan.category_name);
    addRow('Nama Pelapor', laporan.user_name);
    addRow('Email Pelapor', laporan.user_email);
    addRow('Status Saat Ini', laporan.status.toUpperCase());
    addRow('Lokasi Kejadian', laporan.location);
    addRow(
      'Tanggal Dibuat',
      new Date(laporan.created_at).toLocaleString('id-ID', {
        dateStyle: 'long',
        timeStyle: 'short',
      })
    );
    addRow('Catatan Administrasi', laporan.admin_note);

    doc.moveDown(1.5);

    // BAGIAN DESKRIPSI
    doc
      .font('Helvetica-Bold')
      .fontSize(14)
      .text('Deskripsi / Isi Aduan');

    doc.moveDown(0.5);

    doc
      .font('Helvetica')
      .fontSize(11)
      .text(laporan.description || '-', { align: 'justify', lineGap: 4 });

    doc.moveDown(2);

    // BAGIAN LAMPIRAN GAMBAR BUKTI (Aman dari kegagalan file corrupt)
// GANTI BAGIAN INI:
if (laporan.image) {
  const imagePath = path.join(
    __dirname,
    '..',     // Naik ke folder 'src'
    '..',     // Naik lagi ke folder root 'BACKEND'
    'uploads',
    'images',
    laporan.image
  );

  if (fs.existsSync(imagePath)) {
    try {
      doc
        .font('Helvetica-Bold')
        .fontSize(14)
        .text('Foto Bukti Lapangan');

      doc.moveDown(0.8);

      doc.image(imagePath, {
        fit: [450, 280],
        align: 'center'
      });

      doc.moveDown(2);
    } catch (imgErr) {
      doc
        .font('Helvetica-Oblique')
        .fontSize(11)
        .fillColor('red')
        .text('[Gagal memuat gambar lampiran karena berkas tidak valid atau rusak]');
      doc.fillColor('black');
      doc.moveDown(1.5);
    }
  }
}

    // FOOTER DOKUMEN
    doc.moveDown(2);
    doc
      .fontSize(9)
      .font('Helvetica-Oblique')
      .fillColor('gray')
      .text(
        'Dokumen ini diterbitkan secara sah dan otomatis oleh sistem aplikasi pengaduan masyarakat.',
        { align: 'center' }
      );

    // 5. Akhiri stream PDF dokumen
    doc.end();

  } catch (err) {
    // Pengaman: Jika error terjadi sebelum headers dikirim ke client, kirim JSON status 500
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Gagal memproses dokumen PDF: ' + err.message
      });
    } else {
      // Jika headers sudah terlanjur dikirim, segera tutup koneksi stream response agar client tidak menggantung
      console.error('Error fatal saat proses streaming PDF Kit:', err);
      res.end();
    }
  }
};

module.exports = {
  exportLaporanPdf
};