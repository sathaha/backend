const db = require('../config/database');
const response = require('../utils/response');

const getTimeline = async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT t.*, u.name as user_name, u.role as user_role
       FROM laporan_timeline t
       JOIN users u ON t.user_id = u.id
       WHERE t.laporan_id = ?
       ORDER BY t.created_at ASC`,
      [req.params.laporanId]
    )
    return response.success(res, rows)
  } catch (err) {
    return response.error(res, err.message)
  }
}

module.exports = { getTimeline }