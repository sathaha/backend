const db = require('../config/database');
const response = require('../utils/response');

// GET /api/notifications
const getAll = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT n.*, l.title as laporan_title
       FROM notifications n
       LEFT JOIN laporan l ON n.laporan_id = l.id
       WHERE n.user_id = ?
       ORDER BY n.created_at DESC
       LIMIT 20`,
      [req.user.id]
    )

    const [unread] = await db.query(
      'SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0',
      [req.user.id]
    )

    return response.success(res, {
      notifications: rows,
      unread: unread[0].count
    })
  } catch (err) {
    return response.error(res, err.message)
  }
}

// PATCH /api/notifications/read-all
const readAll = async (req, res) => {
  try {
    await db.query(
      'UPDATE notifications SET is_read = 1 WHERE user_id = ?',
      [req.user.id]
    )

    return response.success(res, null, 'Semua notifikasi telah dibaca.')
  } catch (err) {
    return response.error(res, err.message)
  }
}

// Helper: kirim notif ke user tertentu
const sendNotification = async (userId, message, laporanId = null) => {
  try {
    await db.query(
      'INSERT INTO notifications (user_id, message, laporan_id) VALUES (?, ?, ?)',
      [userId, message, laporanId]
    )
  } catch (err) {
    console.error('Failed to send notification:', err.message)
  }
}

// Helper: kirim notif ke semua user berdasarkan role
const sendNotificationToRole = async (role, message, laporanId = null) => {
  try {
    const [users] = await db.query(
      'SELECT id FROM users WHERE role = ?',
      [role]
    )

    for (const user of users) {
      await db.query(
        'INSERT INTO notifications (user_id, message, laporan_id) VALUES (?, ?, ?)',
        [user.id, message, laporanId]
      )
    }
  } catch (err) {
    console.error('Failed send role notification:', err.message)
  }
}

module.exports = {
  getAll,
  readAll,
  sendNotification,
  sendNotificationToRole
}