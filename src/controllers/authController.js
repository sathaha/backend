const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const db = require('../config/database');
const response = require('../utils/response');

const {
  sendNotificationToRole
} = require('./notificationController');

const generateToken = (user) =>
  jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env.JWT_EXPIRES_IN || '7d'
    }
  );

// ─── REGISTER ────────────────────────────────────────────
const register = async (req, res) => {
  try {
    const {
      name,
      email,
      password
    } = req.body;

    if (!name || !email || !password) {
      return response.error(
        res,
        'Nama, email, dan password wajib diisi.',
        400
      );
    }

    if (password.length < 6) {
      return response.error(
        res,
        'Password minimal 6 karakter.',
        400
      );
    }

    const [existing] = await db.execute(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (existing.length) {
      return response.error(
        res,
        'Email sudah terdaftar.',
        409
      );
    }

    const hashed =
      await bcrypt.hash(password, 10);

    const [result] = await db.execute(
      `
      INSERT INTO users
      (name, email, password)
      VALUES (?, ?, ?)
      `,
      [name, email, hashed]
    );

    const [user] = await db.execute(
      `
      SELECT
        id,
        name,
        email,
        role,
        created_at
      FROM users
      WHERE id = ?
      `,
      [result.insertId]
    );

    const token =
      generateToken(user[0]);

    await sendNotificationToRole(
      'super_admin',
      `User baru terdaftar: ${name}`
    );

    return response.success(
      res,
      {
        user: user[0],
        token
      },
      'Registrasi berhasil.',
      201
    );

  } catch (err) {
    console.log(err);

    return response.error(
      res,
      err.message
    );
  }
};

// ─── LOGIN ───────────────────────────────────────────────
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return response.error(
        res,
        'Email dan password wajib diisi.',
        400
      );
    }

    const [rows] = await db.execute(
      'SELECT * FROM users WHERE email = ?',
      [email]
    );

    // Email tidak ditemukan
    if (!rows.length) {
      return response.error(
        res,
        'EMAIL_NOT_FOUND',
        404
      );
    }

    const user = rows[0];

    if (!user.is_active) {
      return response.error(
        res,
        'Akun Anda telah dinonaktifkan.',
        403
      );
    }

    const match = await bcrypt.compare(
      password,
      user.password
    );

    // Password salah
    if (!match) {
      return response.error(
        res,
        'WRONG_PASSWORD',
        401
      );
    }

    const token = generateToken(user);

    const {
      password: _,
      ...safeUser
    } = user;

    return response.success(
      res,
      {
        user: safeUser,
        token
      },
      'Login berhasil.'
    );

  } catch (err) {
    console.log(err);

    return response.error(
      res,
      err.message
    );
  }
};
// ─── GET ME ──────────────────────────────────────────────
const getMe = async (req, res) => {
  try {
    const [rows] = await db.execute(
      `
      SELECT
        id,
        name,
        email,
        role,
        avatar,
        is_active,
        created_at
      FROM users
      WHERE id = ?
      `,
      [req.user.id]
    );

    return response.success(
      res,
      rows[0],
      'Data user berhasil diambil.'
    );

  } catch (err) {
    console.log(err);

    return response.error(
      res,
      err.message
    );
  }
};

// ─── CHANGE PASSWORD ─────────────────────────────────────
const changePassword = async (req, res) => {
  try {
    const {
      old_password,
      new_password
    } = req.body;

    if (
      !old_password ||
      !new_password
    ) {
      return response.error(
        res,
        'Password lama dan baru wajib diisi.',
        400
      );
    }

    if (new_password.length < 6) {
      return response.error(
        res,
        'Password baru minimal 6 karakter.',
        400
      );
    }

    const [rows] = await db.execute(
      `
      SELECT password
      FROM users
      WHERE id = ?
      `,
      [req.user.id]
    );

    const match =
      await bcrypt.compare(
        old_password,
        rows[0].password
      );

    if (!match) {
      return response.error(
        res,
        'Password lama tidak sesuai.',
        400
      );
    }

    const hashed =
      await bcrypt.hash(
        new_password,
        10
      );

    await db.execute(
      `
      UPDATE users
      SET password = ?
      WHERE id = ?
      `,
      [hashed, req.user.id]
    );

    return response.success(
      res,
      null,
      'Password berhasil diubah.'
    );

  } catch (err) {
    console.log(err);

    return response.error(
      res,
      err.message
    );
  }
};

// ─── FORGOT PASSWORD ─────────────────────────────────────
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return response.error(
        res,
        'Email wajib diisi.',
        400
      );
    }

    const [rows] = await db.execute(
      `
      SELECT *
      FROM users
      WHERE email = ?
      `,
      [email]
    );

    if (!rows.length) {
      return response.error(
        res,
        'Email tidak ditemukan.',
        404
      );
    }

    const user = rows[0];

    const resetToken =
      crypto
        .randomBytes(32)
        .toString('hex');

    const expired =
      Date.now() + 1000 * 60 * 15;

    await db.execute(
      `
      UPDATE users
      SET
        reset_token = ?,
        reset_token_expired = ?
      WHERE id = ?
      `,
      [
        resetToken,
        expired,
        user.id
      ]
    );

    const resetLink =
      `http://localhost:5173/reset-password/${resetToken}`;

    const transporter =
      nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject:
        'Reset Password - LaporIn',
      html: `
        <div style="font-family: Arial; padding: 20px;">
          <h2>Reset Password</h2>

          <p>
            Klik tombol di bawah untuk reset password akun kamu.
          </p>

          <a
            href="${resetLink}"
            style="
              display:inline-block;
              padding:12px 20px;
              background:#2563eb;
              color:white;
              text-decoration:none;
              border-radius:8px;
              margin-top:10px;
            "
          >
            Reset Password
          </a>

          <p style="margin-top:20px;">
            Link akan expired dalam 15 menit.
          </p>
        </div>
      `
    });

    return response.success(
      res,
      null,
      'Link reset password berhasil dikirim.'
    );

  } catch (err) {
    console.log(err);

    return response.error(
      res,
      err.message,
      500
    );
  }
};

// ─── RESET PASSWORD ──────────────────────────────────────
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;

    const { password } = req.body;

    if (!password) {
      return response.error(
        res,
        'Password baru wajib diisi.',
        400
      );
    }

    if (password.length < 6) {
      return response.error(
        res,
        'Password minimal 6 karakter.',
        400
      );
    }

    const [rows] = await db.execute(
      `
      SELECT *
      FROM users
      WHERE reset_token = ?
      `,
      [token]
    );

    if (!rows.length) {
      return response.error(
        res,
        'Token tidak valid.',
        400
      );
    }

    const user = rows[0];

    if (
      Date.now() >
      user.reset_token_expired
    ) {
      return response.error(
        res,
        'Token reset password sudah expired.',
        400
      );
    }

    const hashed =
      await bcrypt.hash(
        password,
        10
      );

    await db.execute(
      `
      UPDATE users
      SET
        password = ?,
        reset_token = NULL,
        reset_token_expired = NULL
      WHERE id = ?
      `,
      [hashed, user.id]
    );

    return response.success(
      res,
      null,
      'Password berhasil direset.'
    );

  } catch (err) {
    console.log(err);

    return response.error(
      res,
      err.message,
      500
    );
  }
};

module.exports = {
  register,
  login,
  getMe,
  changePassword,
  forgotPassword,
  resetPassword
};