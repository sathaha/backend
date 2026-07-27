const jwt = require('jsonwebtoken');
const db = require('../config/database');
const response = require('../utils/response');

// Verify JWT token
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return response.error(res, 'Token tidak ditemukan. Silakan login terlebih dahulu.', 401);
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const [rows] = await db.execute(
      'SELECT id, name, email, role, is_active FROM users WHERE id = ?',
      [decoded.id]
    );

    if (!rows.length) {
      return response.error(res, 'User tidak ditemukan.', 401);
    }
    if (!rows[0].is_active) {
      return response.error(res, 'Akun Anda telah dinonaktifkan.', 403);
    }

    req.user = rows[0];
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return response.error(res, 'Token telah kadaluarsa. Silakan login kembali.', 401);
    }
    return response.error(res, 'Token tidak valid.', 401);
  }
};

// Role-based middleware factory
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return response.error(res, 'Anda tidak memiliki izin untuk mengakses resource ini.', 403);
    }
    next();
  };
};

module.exports = { authenticate, authorize };
