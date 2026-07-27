const db = require('../config/database');
const response = require('../utils/response');
const fs = require('fs');

const {
  sendNotification,
  sendNotificationToRole
} = require('./notificationController');

// GET /api/laporan
const getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const offset = (page - 1) * limit
    const { status, category_id, search } = req.query

    let where = 'WHERE 1=1'
    const params = []

    if (status) {
      where += ' AND l.status = ?'
      params.push(status)
    }

    if (category_id) {
      where += ' AND l.category_id = ?'
      params.push(parseInt(category_id))
    }

    if (search) {
      where += ' AND (l.title LIKE ? OR l.description LIKE ?)'
      params.push(`%${search}%`, `%${search}%`)
    }
    
if (req.query.user_id) {
  console.log('filter user_id:', req.query.user_id)
  where += ' AND l.user_id = ?'
  params.push(parseInt(req.query.user_id))
} 

const [total] = await db.query(
  'SELECT COUNT(*) as count FROM laporan l ' + where,
  params
)

const [rows] = await db.query(
  `SELECT l.*, u.name as user_name, u.email as user_email, c.name as category_name,
   (SELECT COUNT(*) FROM laporan_likes ll WHERE ll.laporan_id = l.id) as total_likes
   FROM laporan l
   JOIN users u ON l.user_id = u.id
   JOIN categories c ON l.category_id = c.id
   ${where}
   ORDER BY l.created_at DESC
   LIMIT ${limit} OFFSET ${offset}`,
  params
)

    return response.paginate(res, rows, {
      total: total[0].count,
      page,
      limit,
      totalPages: Math.ceil(total[0].count / limit),
    })

  } catch (err) {
    return response.error(res, err.message)
  }
}

// GET /api/laporan/:id
const getById = async (req, res) => {
  try {
    const [rows] = await db.execute(
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

    if (!rows.length) {
      return response.error(res, 'Laporan tidak ditemukan.', 404);
    }

    // Get comments
// Get comments
const [comments] = await db.execute(
  `SELECT cm.*, 
          u.name as user_name, 
          u.role as user_role
   FROM comments cm
   JOIN users u ON cm.user_id = u.id
   WHERE cm.laporan_id = ?
   ORDER BY cm.created_at ASC`,
  [req.params.id]
);

// Ambil reactions untuk setiap komentar
for (const comment of comments) {
  const [reactions] = await db.query(
    `
    SELECT
      emoji,
      COUNT(*) as count,
      MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) as reacted
    FROM comment_reactions
    WHERE comment_id = ?
    GROUP BY emoji
    `,
    [req.user.id, comment.id]
  );

  comment.reactions = reactions;
}

    // Total likes
    const [likes] = await db.query(
      'SELECT COUNT(*) as total FROM laporan_likes WHERE laporan_id = ?',
      [req.params.id]
    )

    // Check user liked
    const [liked] = await db.query(
      'SELECT * FROM laporan_likes WHERE laporan_id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    )

    return response.success(res, {
      ...rows[0],
      comments,
      likes: likes[0].total,
      liked: liked.length > 0
    });

  } catch (err) {
    return response.error(res, err.message);
  }
};

// POST /api/laporan
const create = async (req, res) => {
  try {
    const { title, description, category_id, location } = req.body;

    if (!title || !description || !category_id) {
      return response.error(res, 'Judul, deskripsi, dan kategori wajib diisi.', 400);
    }

    const [catCheck] = await db.execute(
      'SELECT id FROM categories WHERE id = ?',
      [category_id]
    );

    if (!catCheck.length) {
      return response.error(res, 'Kategori tidak ditemukan.', 404);
    }

    const image = req.file ? req.file.filename : null;

    const [result] = await db.execute(
      `INSERT INTO laporan 
       (user_id, category_id, title, description, location, image) 
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        req.user.id,
        category_id,
        title,
        description,
        location || null,
        image
      ]
    );

    const [laporan] = await db.execute(
      `SELECT l.*, 
              u.name as user_name, 
              c.name as category_name
       FROM laporan l
       JOIN users u ON l.user_id = u.id
       JOIN categories c ON l.category_id = c.id
       WHERE l.id = ?`,
      [result.insertId]
    );

    // notif admin
    await sendNotificationToRole(
      'admin',
      'Laporan baru masuk: ' + title,
      result.insertId
    )

    // notif super admin
    await sendNotificationToRole(
      'super_admin',
      'Laporan baru masuk: ' + title,
      result.insertId
    )

    return response.success(
      res,
      laporan[0],
      'Laporan berhasil dibuat.',
      201
    );

  } catch (err) {
    return response.error(res, err.message);
  }
};

// PUT /api/laporan/:id
const update = async (req, res) => {
  try {
    const [existing] = await db.execute(
      'SELECT * FROM laporan WHERE id = ?',
      [req.params.id]
    );

    if (!existing.length) {
      return response.error(res, 'Laporan tidak ditemukan.', 404);
    }

    const laporan = existing[0];

    if (req.user.role === 'user') {
      if (laporan.user_id !== req.user.id) {
        return response.error(res, 'Akses ditolak.', 403);
      }

      if (laporan.status !== 'pending') {
        return response.error(
          res,
          'Laporan yang sudah diproses tidak dapat diedit.',
          400
        );
      }
    }

    const {
      title,
      description,
      category_id,
      location,
      status,
      admin_note
    } = req.body;

    const image = req.file ? req.file.filename : laporan.image;

    // delete old image
    if (req.file && laporan.image) {
      const oldPath = `uploads/images/${laporan.image}`;

      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    await db.execute(
      `UPDATE laporan SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        category_id = COALESCE(?, category_id),
        location = COALESCE(?, location),
        image = ?,
        status = COALESCE(?, status),
        admin_note = COALESCE(?, admin_note)
       WHERE id = ?`,
      [
        title || null,
        description || null,
        category_id || null,
        location || null,
        image || null,
        status || null,
        admin_note || null,
        req.params.id
      ]
    );

    const [updated] = await db.execute(
      `SELECT l.*, 
              u.name as user_name, 
              c.name as category_name
       FROM laporan l
       JOIN users u ON l.user_id = u.id
       JOIN categories c ON l.category_id = c.id
       WHERE l.id = ?`,
      [req.params.id]
    );

    return response.success(
      res,
      updated[0],
      'Laporan berhasil diperbarui.'
    );

  } catch (err) {
    return response.error(res, err.message);
  }
};

// DELETE /api/laporan/:id
const remove = async (req, res) => {
  try {
    const [existing] = await db.execute(
      'SELECT * FROM laporan WHERE id = ?',
      [req.params.id]
    );

    if (!existing.length) {
      return response.error(res, 'Laporan tidak ditemukan.', 404);
    }

    const laporan = existing[0];

    if (
      req.user.role === 'user' &&
      laporan.user_id !== req.user.id
    ) {
      return response.error(res, 'Akses ditolak.', 403);
    }

    // delete image
    if (laporan.image) {
      const imgPath = `uploads/images/${laporan.image}`;

      if (fs.existsSync(imgPath)) {
        fs.unlinkSync(imgPath);
      }
    }

    await db.execute(
      'DELETE FROM laporan WHERE id = ?',
      [req.params.id]
    );

    return response.success(
      res,
      null,
      'Laporan berhasil dihapus.'
    );

  } catch (err) {
    return response.error(res, err.message);
  }
};

// PATCH /api/laporan/:id/status
const STATUS_LABELS = {
  pending: 'Menunggu',
  approved: 'Diterima',
  in_progress: 'Diproses',
  resolved: 'Selesai',
  rejected: 'Ditolak'
}

const updateStatus = async (req, res) => {
  try {
    const { status, admin_note } = req.body;

    const validStatus = [
      'pending',
      'approved',
      'rejected',
      'in_progress',
      'resolved'
    ];

    if (!status || !validStatus.includes(status)) {
      return response.error(res, 'Status tidak valid.', 400);
    }

    const [existing] = await db.query(
      'SELECT id, user_id FROM laporan WHERE id = ?',
      [req.params.id]
    );

    if (!existing.length) {
      return response.error(res, 'Laporan tidak ditemukan.', 404);
    }

    await db.query(
      'UPDATE laporan SET status = ?, admin_note = ? WHERE id = ?',
      [status, admin_note || null, req.params.id]
    );

    // timeline
    await db.query(
      `INSERT INTO laporan_timeline 
       (laporan_id, user_id, status, note) 
       VALUES (?, ?, ?, ?)`,
      [
        req.params.id,
        req.user.id,
        status,
        admin_note || null
      ]
    );

    // notif user
    await sendNotification(
      existing[0].user_id,
      'Status laporan kamu diubah menjadi: ' + STATUS_LABELS[status],
      req.params.id
    )

    // notif super admin
    if (req.user.role === 'admin') {
      await sendNotificationToRole(
        'super_admin',
        `Admin ${req.user.name} mengubah status laporan menjadi ${STATUS_LABELS[status]}`,
        req.params.id
      )
    }

    return response.success(
      res,
      null,
      'Status laporan berhasil diperbarui.'
    );

  } catch (err) {
    return response.error(res, err.message);
  }
};

// LIKE / UNLIKE
const toggleLike = async (req, res) => {
  try {
    const laporanId = req.params.id

    const [existing] = await db.query(
      `SELECT * FROM laporan_likes 
       WHERE laporan_id = ? AND user_id = ?`,
      [laporanId, req.user.id]
    )

    if (existing.length) {
      await db.query(
        `DELETE FROM laporan_likes 
         WHERE laporan_id = ? AND user_id = ?`,
        [laporanId, req.user.id]
      )

      return response.success(
        res,
        { liked: false },
        'Dukungan dibatalkan.'
      )
    }

    await db.query(
      `INSERT INTO laporan_likes 
       (laporan_id, user_id) 
       VALUES (?, ?)`,
      [laporanId, req.user.id]
    )

    return response.success(
      res,
      { liked: true },
      'Laporan didukung.'
    )

  } catch (err) {
    return response.error(res, err.message)
  }
}

module.exports = {
  getAll,
  getById,
  create,
  update,
  remove,
  updateStatus,
  toggleLike
}