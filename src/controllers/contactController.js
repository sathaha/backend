const db = require('../config/database')
const response = require('../utils/response')

const createContact = async (req, res) => {
  try {
    const { name, email, subject, message } = req.body

    await db.query(
      `
      INSERT INTO contacts (name, email, subject, message)
      VALUES (?, ?, ?, ?)
      `,
      [name, email, subject, message]
    )

    return response.success(
      res,
      null,
      'Pesan berhasil dikirim'
    )

  } catch (err) {
    return response.error(res, err.message)
  }
}

const getContacts = async (req, res) => {
  try {
    if (!['admin', 'super_admin'].includes(req.user.role)) {
      return response.error(res, 'Akses ditolak', 403)
    }

    const [contacts] = await db.query(
      `
      SELECT *
      FROM contacts
      ORDER BY created_at DESC
      `
    )

    return response.success(res, contacts)

  } catch (err) {
    return response.error(res, err.message)
  }
}

module.exports = {
  createContact,
  getContacts
}