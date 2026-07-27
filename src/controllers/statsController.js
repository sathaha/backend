const db = require('../config/database');
const response = require('../utils/response');

const getStats = async (req, res) => {
  try {

    // Total per status
    const [byStatus] = await db.query(`
      SELECT status, COUNT(*) as total 
      FROM laporan 
      GROUP BY status
    `)

    // Total per kategori
    const [byCategory] = await db.query(`
      SELECT 
        c.name as category, 
        COUNT(l.id) as total
      FROM categories c
      LEFT JOIN laporan l ON l.category_id = c.id
      GROUP BY c.id, c.name
      ORDER BY total DESC
    `)

    // Total per bulan (6 bulan terakhir)
    const [monthData] = await db.query(`
      SELECT 
        DATE_FORMAT(created_at, '%Y-%m') as month,
        DATE_FORMAT(created_at, '%b %Y') as label,
        COUNT(*) as total
      FROM laporan
      WHERE created_at >= DATE_SUB(NOW(), INTERVAL 5 MONTH)
      GROUP BY month, label
      ORDER BY month ASC
    `)

    // Generate 6 bulan terakhir
    const months = []

    for (let i = 5; i >= 0; i--) {
      const date = new Date()

      date.setMonth(date.getMonth() - i)

      const month = date.toISOString().slice(0, 7)

      const label = date.toLocaleString('en-US', {
        month: 'short',
        year: 'numeric'
      })

      const found = monthData.find(m => m.month === month)

      months.push({
        month,
        label,
        total: found ? Number(found.total) : 0
      })
    }

    const byMonth = months

    // Summary cards
    const [summary] = await db.query(`
      SELECT
        COUNT(*) as total,
        SUM(status = 'pending') as pending,
        SUM(status = 'in_progress') as in_progress,
        SUM(status = 'resolved') as resolved,
        SUM(status = 'rejected') as rejected,
        SUM(status = 'approved') as approved
      FROM laporan
    `)

    // Total user
    const [users] = await db.query(`
      SELECT COUNT(*) as total 
      FROM users 
      WHERE role = 'user'
    `)

    // Laporan hari ini
    const [today] = await db.query(`
      SELECT COUNT(*) as total
      FROM laporan
      WHERE DATE(created_at) = CURDATE()
    `)

    return response.success(res, {
      summary: {
        ...summary[0],
        total_users: users[0].total,
        today: today[0].total
      },
      byStatus,
      byCategory,
      byMonth,
    })

  } catch (err) {
    return response.error(res, err.message)
  }
}

module.exports = { getStats }