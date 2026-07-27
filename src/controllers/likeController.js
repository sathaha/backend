const db = require('../config/database');
const response = require('../utils/response');

// POST /api/laporan/:id/like — toggle like
const toggleLike = async (req, res) => {
  try {
    const laporanId = req.params.id;
    const userId = req.user.id;

    const [existing] = await db.query(
      'SELECT id FROM laporan_likes WHERE laporan_id = ? AND user_id = ?',
      [laporanId, userId]
    );

    if (existing.length) {
      // Unlike — hapus like, tidak kirim notifikasi
      await db.query(
        'DELETE FROM laporan_likes WHERE laporan_id = ? AND user_id = ?',
        [laporanId, userId]
      );
    } else {
      // Like — simpan + kirim notifikasi ke pemilik laporan
      await db.query(
        'INSERT INTO laporan_likes (laporan_id, user_id) VALUES (?, ?)',
        [laporanId, userId]
      );

      // Ambil pemilik laporan
      const [laporan] = await db.query(
        'SELECT user_id, title FROM laporan WHERE id = ?',
        [laporanId]
      );

      // Jangan kirim notif ke diri sendiri
      if (laporan.length && laporan[0].user_id !== userId) {
        await db.query(
          'INSERT INTO notifications (user_id, message, laporan_id) VALUES (?, ?, ?)',
          [
            laporan[0].user_id,
            req.user.name + ' mendukung laporan kamu: "' + laporan[0].title + '"',
            laporanId
          ]
        );
      }
    }

    const [count] = await db.query(
      'SELECT COUNT(*) as total FROM laporan_likes WHERE laporan_id = ?',
      [laporanId]
    );

    return response.success(res, {
      liked: !existing.length,
      total_likes: count[0].total,
    }, existing.length ? 'Like dibatalkan.' : 'Laporan didukung!')
  } catch (err) {
    return response.error(res, err.message)
  }
}

// GET /api/laporan/:id/likes
const getLikes = async (req, res) => {
  try {
    const [count] = await db.query(
      'SELECT COUNT(*) as total FROM laporan_likes WHERE laporan_id = ?',
      [req.params.id]
    )
    const [isLiked] = await db.query(
      'SELECT id FROM laporan_likes WHERE laporan_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    )
    return response.success(res, {
      total_likes: count[0].total,
      liked: isLiked.length > 0,
    })
  } catch (err) {
    return response.error(res, err.message)
  }
}

module.exports = { toggleLike, getLikes }