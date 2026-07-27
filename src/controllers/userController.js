const bcrypt = require('bcryptjs')
const db = require('../config/database')
const response = require('../utils/response')

const getAll = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1
    const limit = parseInt(req.query.limit) || 10
    const offset = (page - 1) * limit

    const search = (req.query.search || '').trim()

    let query = `
      SELECT
        id,
        name,
        email,
        role,
        avatar,
        is_active,
        created_at
      FROM users
    `

    let countQuery = `
      SELECT COUNT(*) as total
      FROM users
    `

    const params = []
    const countParams = []

    if (search.length > 0) {
      query += `
        WHERE name LIKE ?
        OR email LIKE ?
      `

      countQuery += `
        WHERE name LIKE ?
        OR email LIKE ?
      `

      params.push(`%${search}%`, `%${search}%`)
      countParams.push(`%${search}%`, `%${search}%`)
    }

    query += `
      ORDER BY created_at DESC
      LIMIT ? OFFSET ?
    `

    params.push(limit, offset)

    const [rows] = await db.query(query, params)

    const [totalRows] = await db.query(
      countQuery,
      countParams
    )

    return response.success(
      res,
      rows,
      'Data user berhasil diambil.',
      200,
      {
        page,
        limit,
        total: totalRows[0].total,
        totalPages: Math.ceil(
          totalRows[0].total / limit
        ),
      }
    )

  } catch (err) {
    console.log(err)

    return response.error(res, err.message)
  }
}

const getById = async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT id, name, email, role, avatar, is_active, created_at FROM users WHERE id = ?',
      [req.params.id]
    )

    if (!rows.length) {
      return response.error(res, 'User tidak ditemukan.', 404)
    }

    return response.success(res, rows[0])
  } catch (err) {
    return response.error(res, err.message)
  }
}

const getUserStats = async (req, res) => {
  try {
    const userId = req.params.id

    const [laporanRows] = await db.query(
      `SELECT COUNT(*) AS total_laporan
       FROM laporan
       WHERE user_id = ?`,
      [userId]
    )

    const [likeRows] = await db.query(
      `SELECT COALESCE(SUM(likes), 0) AS total_likes
       FROM laporan
       WHERE user_id = ?`,
      [userId]
    )

    const [commentRows] = await db.query(
      `SELECT COUNT(*) AS total_comments
       FROM comments
       WHERE user_id = ?`,
      [userId]
    )

    return response.success(res, {
      total_laporan: laporanRows[0].total_laporan,
      total_likes: likeRows[0].total_likes,
      total_comments: commentRows[0].total_comments
    })
  } catch (err) {
    return response.error(res, err.message)
  }
}

const create = async (req, res) => {
  try {
    const { name, email, password, role = 'user' } = req.body

    if (!name || !email || !password) {
      return response.error(
        res,
        'Nama, email, dan password wajib diisi.',
        400
      )
    }

    const [existing] = await db.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    )

    if (existing.length) {
      return response.error(res, 'Email sudah terdaftar.', 409)
    }

    const hashed = await bcrypt.hash(password, 10)

    const [result] = await db.query(
      'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
      [name, email, hashed, role]
    )

    const [user] = await db.query(
      'SELECT id, name, email, role, created_at FROM users WHERE id = ?',
      [result.insertId]
    )

    return response.success(res, user[0], 'User berhasil dibuat.', 201)
  } catch (err) {
    return response.error(res, err.message)
  }
}

const update = async (req, res) => {
  try {
    const { name, email, role, is_active } = req.body

    const [existing] = await db.query(
      'SELECT id FROM users WHERE id = ?',
      [req.params.id]
    )

    if (!existing.length) {
      return response.error(res, 'User tidak ditemukan.', 404)
    }

    await db.query(
      `UPDATE users
       SET
         name = COALESCE(?, name),
         email = COALESCE(?, email),
         role = COALESCE(?, role),
         is_active = COALESCE(?, is_active)
       WHERE id = ?`,
      [
        name || null,
        email || null,
        role || null,
        is_active !== undefined ? is_active : null,
        req.params.id
      ]
    )

    const [user] = await db.query(
      'SELECT id, name, email, role, is_active, created_at FROM users WHERE id = ?',
      [req.params.id]
    )

    return response.success(res, user[0], 'User berhasil diperbarui.')
  } catch (err) {
    return response.error(res, err.message)
  }
}

const remove = async (req, res) => {
  try {
    if (parseInt(req.params.id) === req.user.id) {
      return response.error(
        res,
        'Tidak dapat menghapus akun sendiri.',
        400
      )
    }

    const [existing] = await db.query(
      'SELECT id FROM users WHERE id = ?',
      [req.params.id]
    )

    if (!existing.length) {
      return response.error(res, 'User tidak ditemukan.', 404)
    }

    await db.query(
      'DELETE FROM users WHERE id = ?',
      [req.params.id]
    )

    return response.success(res, null, 'User berhasil dihapus.')
  } catch (err) {
    return response.error(res, err.message)
  }
}

const searchMentionUsers = async (req, res) => {
  try {
    const search = req.query.search || ''

    let query = `
      SELECT
        id,
        name,
        role
      FROM users
      WHERE name LIKE ?
    `

    const params = [`%${search}%`]

    // User hanya bisa mention sesama user
    if (req.user.role === 'user') {
      query += `
        AND role = 'user'
        AND id != ?
      `
      params.push(req.user.id)
    }

    // Admin & super_admin bisa mention semua
    query += `
      ORDER BY name ASC
      LIMIT 5
    `

    const [rows] = await db.query(query, params)

    return response.success(res, rows)

  } catch (err) {
    return response.error(res, err.message)
  }
}



module.exports = {
  getAll,
  getById,
  getUserStats,
  create,
  update,
  remove,
    searchMentionUsers
}