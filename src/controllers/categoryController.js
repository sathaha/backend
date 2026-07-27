const db = require('../config/database');
const response = require('../utils/response');

const getAll = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM categories ORDER BY name ASC');
    return response.success(res, rows);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const getById = async (req, res) => {
  try {
    const [rows] = await db.execute('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    if (!rows.length) return response.error(res, 'Kategori tidak ditemukan.', 404);
    return response.success(res, rows[0]);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const create = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) return response.error(res, 'Nama kategori wajib diisi.', 400);

    const [result] = await db.execute(
      'INSERT INTO categories (name, description) VALUES (?, ?)',
      [name, description || null]
    );
    const [cat] = await db.execute('SELECT * FROM categories WHERE id = ?', [result.insertId]);
    return response.success(res, cat[0], 'Kategori berhasil dibuat.', 201);
  } catch (err) {
    return response.error(res, err.message);
  }
};

const update = async (req, res) => {
  try {
    const [existing] = await db.execute('SELECT id FROM categories WHERE id = ?', [req.params.id]);
    if (!existing.length) return response.error(res, 'Kategori tidak ditemukan.', 404);

    const { name, description } = req.body;
    await db.execute(
      'UPDATE categories SET name = COALESCE(?, name), description = COALESCE(?, description) WHERE id = ?',
      [name, description, req.params.id]
    );
    const [cat] = await db.execute('SELECT * FROM categories WHERE id = ?', [req.params.id]);
    return response.success(res, cat[0], 'Kategori berhasil diperbarui.');
  } catch (err) {
    return response.error(res, err.message);
  }
};

const remove = async (req, res) => {
  try {
    const [existing] = await db.execute('SELECT id FROM categories WHERE id = ?', [req.params.id]);
    if (!existing.length) return response.error(res, 'Kategori tidak ditemukan.', 404);

    await db.execute('DELETE FROM categories WHERE id = ?', [req.params.id]);
    return response.success(res, null, 'Kategori berhasil dihapus.');
  } catch (err) {
    return response.error(res, err.message);
  }
};

module.exports = { getAll, getById, create, update, remove };
