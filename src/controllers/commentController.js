const db = require('../config/database');
const response = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `SELECT cm.*, u.name as user_name, u.role as user_role
       FROM comments cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.laporan_id = ?
       ORDER BY cm.created_at ASC`,
      [req.params.laporanId]
    );

    return response.success(res, rows);

  } catch (err) {
    return response.error(res, err.message);
  }
};

const create = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return response.error(
        res,
        'Konten komentar wajib diisi.',
        400
      );
    }

    // cek laporan
    const [laporan] = await db.execute(
      'SELECT id FROM laporan WHERE id = ?',
      [req.params.laporanId]
    );

    if (!laporan.length) {
      return response.error(
        res,
        'Laporan tidak ditemukan.',
        404
      );
    }

    // insert komentar
    const [result] = await db.execute(
      `INSERT INTO comments 
       (laporan_id, user_id, content) 
       VALUES (?, ?, ?)`,
      [
        req.params.laporanId,
        req.user.id,
        content.trim()
      ]
    );

    // ======================
    // DETECT MENTION
    // ======================
    const mentions = [
      ...content.matchAll(/@([a-zA-Z0-9_]+)/g)
    ];

    for (const mention of mentions) {
      const username = mention[1];

      const [mentioned] = await db.query(
        `SELECT id, name 
         FROM users 
         WHERE LOWER(name) = LOWER(?)`,
        [username]
      );

      // jangan notif diri sendiri
      if (
        mentioned.length &&
        mentioned[0].id !== req.user.id
      ) {
        await db.query(
          `INSERT INTO notifications 
           (user_id, message, laporan_id) 
           VALUES (?, ?, ?)`,
          [
            mentioned[0].id,
            req.user.name + ' menyebut kamu di komentar',
            parseInt(req.params.laporanId)
          ]
        );
      }
    }

    // ambil komentar terbaru
    const [comment] = await db.execute(
      `SELECT cm.*, 
              u.name as user_name, 
              u.role as user_role
       FROM comments cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.id = ?`,
      [result.insertId]
    );

    return response.success(
      res,
      comment[0],
      'Komentar berhasil ditambahkan.',
      201
    );

  } catch (err) {
    return response.error(res, err.message);
  }
};

const update = async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      return response.error(
        res,
        'Konten wajib diisi.',
        400
      );
    }

    const [existing] = await db.execute(
      'SELECT * FROM comments WHERE id = ?',
      [req.params.id]
    );

    if (!existing.length) {
      return response.error(
        res,
        'Komentar tidak ditemukan.',
        404
      );
    }

    // user hanya bisa edit komentar sendiri
    if (
      req.user.role === 'user' &&
      existing[0].user_id !== req.user.id
    ) {
      return response.error(
        res,
        'Anda tidak dapat mengedit komentar orang lain.',
        403
      );
    }

    await db.execute(
      'UPDATE comments SET content = ? WHERE id = ?',
      [
        content.trim(),
        req.params.id
      ]
    );

    const [updated] = await db.execute(
      `SELECT cm.*, 
              u.name as user_name,
              u.role as user_role
       FROM comments cm
       JOIN users u ON cm.user_id = u.id
       WHERE cm.id = ?`,
      [req.params.id]
    );

    return response.success(
      res,
      updated[0],
      'Komentar berhasil diperbarui.'
    );

  } catch (err) {
    return response.error(res, err.message);
  }
};

const remove = async (req, res) => {
  try {
    const [existing] = await db.execute(
      'SELECT * FROM comments WHERE id = ?',
      [req.params.id]
    );

    if (!existing.length) {
      return response.error(
        res,
        'Komentar tidak ditemukan.',
        404
      );
    }

    const isOwner =
      existing[0].user_id === req.user.id;

    const isAdmin =
      ['admin', 'super_admin']
      .includes(req.user.role);

    if (!isOwner && !isAdmin) {
      return response.error(
        res,
        'Anda tidak dapat menghapus komentar ini.',
        403
      );
    }

    await db.execute(
      'DELETE FROM comments WHERE id = ?',
      [req.params.id]
    );

    return response.success(
      res,
      null,
      'Komentar berhasil dihapus.'
    );

  } catch (err) {
    return response.error(res, err.message);
  }
};

const toggleReaction = async (req, res) => {
  try {
    const { emoji } = req.body
    const ALLOWED = ['👍', '❤️', '😂', '😮']

    if (!ALLOWED.includes(emoji)) {
      return response.error(res, 'Emoji tidak valid.', 400)
    }

    const [existing] = await db.execute(
      'SELECT id FROM comment_reactions WHERE comment_id = ? AND user_id = ? AND emoji = ?',
      [req.params.id, req.user.id, emoji]
    )

    if (existing.length) {
      await db.execute(
        'DELETE FROM comment_reactions WHERE id = ?',
        [existing[0].id]
      )
    } else {
      await db.execute(
        'INSERT INTO comment_reactions (comment_id, user_id, emoji) VALUES (?, ?, ?)',
        [req.params.id, req.user.id, emoji]
      )
    }

    const [reactions] = await db.execute(
      `SELECT emoji, COUNT(*) as count,
        MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) as reacted
       FROM comment_reactions
       WHERE comment_id = ?
       GROUP BY emoji`,
      [req.user.id, req.params.id]
    )

    return response.success(res, reactions)
  } catch (err) {
    return response.error(res, err.message)
  }
}

const getReactions = async (req, res) => {
  try {
    const userId = req.user?.id || null

    const [reactions] = await db.execute(
      `SELECT emoji, COUNT(*) as count,
        MAX(CASE WHEN user_id = ? THEN 1 ELSE 0 END) as reacted
       FROM comment_reactions
       WHERE comment_id = ?
       GROUP BY emoji`,
      [userId, req.params.id]
    )

    return response.success(res, reactions)
  } catch (err) {
    return response.error(res, err.message)
  }
}

module.exports = { getAll, create, update, remove, toggleReaction, getReactions }