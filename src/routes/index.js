const express = require('express');
const router = express.Router();

const authCtrl = require('../controllers/authController');
const userCtrl = require('../controllers/userController');
const laporanCtrl = require('../controllers/laporanController');
const commentCtrl = require('../controllers/commentController');
const categoryCtrl = require('../controllers/categoryController');
const statsCtrl = require('../controllers/statsController');
const timelineCtrl = require('../controllers/timelineController');
const notifCtrl = require('../controllers/NotificationController');
const pdfCtrl = require('../controllers/pdfController');
const likeCtrl = require('../controllers/likeController');

const db = require('../config/database');

const contactRoutes = require('./contactRoutes');

const {
  authenticate,
  authorize
} = require('../middleware/auth');

const upload = require('../middleware/upload');
const uploadAvatar = require('../middleware/uploadAvatar');

// ─── CONTACTS ────────────────────────────────────────────
router.use('/contacts', contactRoutes);

// ─── AUTH ────────────────────────────────────────────────
router.post('/auth/register', authCtrl.register);

router.post('/auth/login', authCtrl.login);

router.post(
  '/auth/forgot-password',
  authCtrl.forgotPassword
);

router.post(
  '/auth/reset-password/:token',
  authCtrl.resetPassword
);

router.get(
  '/auth/me',
  authenticate,
  authCtrl.getMe
);

router.put(
  '/auth/change-password',
  authenticate,
  authCtrl.changePassword
);

// ─── CATEGORIES ──────────────────────────────────────────
router.get(
  '/categories',
  authenticate,
  categoryCtrl.getAll
);

router.get(
  '/categories/:id',
  authenticate,
  categoryCtrl.getById
);

router.post(
  '/categories',
  authenticate,
  authorize('admin', 'super_admin'),
  categoryCtrl.create
);

router.put(
  '/categories/:id',
  authenticate,
  authorize('admin', 'super_admin'),
  categoryCtrl.update
);

router.delete(
  '/categories/:id',
  authenticate,
  authorize('super_admin'),
  categoryCtrl.remove
);

// ─── TRENDING LAPORAN ────────────────────────────────────
router.get(
  '/laporan/trending',
  authenticate,
  async (req, res) => {
    try {
      const [rows] = await db.query(`
        SELECT 
          l.*,
          u.name as user_name,
          c.name as category_name,
          COUNT(DISTINCT ll.id) as total_likes,
          COUNT(DISTINCT cm.id) as total_comments,
          (
            COUNT(DISTINCT ll.id) * 2 +
            COUNT(DISTINCT cm.id)
          ) as score
        FROM laporan l
        JOIN users u ON l.user_id = u.id
        JOIN categories c ON l.category_id = c.id
        LEFT JOIN laporan_likes ll 
          ON ll.laporan_id = l.id
          AND ll.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        LEFT JOIN comments cm 
          ON cm.laporan_id = l.id
          AND cm.created_at >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
        WHERE l.created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
        GROUP BY l.id
        ORDER BY score DESC
        LIMIT 5
      `);

      return res.json({
        success: true,
        data: rows
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }
);

// ─── LAPORAN ─────────────────────────────────────────────
router.get(
  '/laporan',
  authenticate,
  laporanCtrl.getAll
);

router.get(
  '/laporan/:id',
  authenticate,
  laporanCtrl.getById
);

router.post(
  '/laporan',
  authenticate,
  upload.single('image'),
  laporanCtrl.create
);

router.put(
  '/laporan/:id',
  authenticate,
  upload.single('image'),
  laporanCtrl.update
);

router.delete(
  '/laporan/:id',
  authenticate,
  laporanCtrl.remove
);

router.patch(
  '/laporan/:id/status',
  authenticate,
  authorize('admin', 'super_admin'),
  laporanCtrl.updateStatus
);

router.get(
  '/laporan/:id/pdf',
  authenticate, // Cukup pastikan user sudah login
  pdfCtrl.exportLaporanPdf
);

// ─── COMMENTS ────────────────────────────────────────────
router.get(
  '/laporan/:laporanId/comments',
  authenticate,
  commentCtrl.getAll
);

router.post(
  '/laporan/:laporanId/comments',
  authenticate,
  commentCtrl.create
);

router.put(
  '/comments/:id',
  authenticate,
  commentCtrl.update
);

router.delete(
  '/comments/:id',
  authenticate,
  commentCtrl.remove
);

router.post(
  '/comments/:id/reactions',
  authenticate,
  commentCtrl.toggleReaction
);

router.get(
  '/comments/:id/reactions',
  authenticate,
  commentCtrl.getReactions
);

// ─── STATS ───────────────────────────────────────────────
router.get(
  '/stats',
  authenticate,
  statsCtrl.getStats
);

// ─── TIMELINE ────────────────────────────────────────────
router.get(
  '/laporan/:laporanId/timeline',
  authenticate,
  timelineCtrl.getTimeline
);

// ─── NOTIFICATIONS ───────────────────────────────────────
router.get(
  '/notifications',
  authenticate,
  notifCtrl.getAll
);

router.patch(
  '/notifications/read-all',
  authenticate,
  notifCtrl.readAll
);

// ─── LIKES ───────────────────────────────────────────────
router.post(
  '/laporan/:id/like',
  authenticate,
  likeCtrl.toggleLike
);

router.get(
  '/laporan/:id/likes',
  authenticate,
  likeCtrl.getLikes
);

// ─── PROFILE ─────────────────────────────────────────────
router.put(
  '/auth/profile',
  authenticate,
  uploadAvatar.single('avatar'),
  async (req, res) => {
    try {
      const { name } = req.body;
      const avatar = req.file
        ? req.file.filename
        : undefined;

      const updates = [];
      const params = [];

      if (name) {
        updates.push('name = ?');
        params.push(name);
      }

      if (avatar) {
        updates.push('avatar = ?');
        params.push(avatar);
      }

      if (!updates.length) {
        return res.json({
          success: false,
          message: 'Tidak ada yang diupdate.'
        });
      }

      params.push(req.user.id);

      await db.query(
        `
        UPDATE users
        SET ${updates.join(', ')}
        WHERE id = ?
        `,
        params
      );

      const [user] = await db.query(
        `
        SELECT
          id,
          name,
          email,
          role,
          avatar,
          created_at
        FROM users
        WHERE id = ?
        `,
        [req.user.id]
      );

      return res.json({
        success: true,
        message: 'Profil berhasil diperbarui.',
        data: user[0]
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }
);

// ─── USER STATS ──────────────────────────────────────────
router.get(
  '/users/me/stats',
  authenticate,
  async (req, res) => {
    try {
      const isAdmin =
        ['admin', 'super_admin']
          .includes(req.user.role);

      if (!isAdmin) {
        const [likes] = await db.query(`
          SELECT COUNT(*) as total
          FROM laporan_likes ll
          JOIN laporan l
            ON ll.laporan_id = l.id
          WHERE l.user_id = ${req.user.id}
        `);

        const [comments] = await db.query(`
          SELECT COUNT(*) as total
          FROM comments c
          JOIN laporan l
            ON c.laporan_id = l.id
          WHERE l.user_id = ${req.user.id}
        `);

        return res.json({
          success: true,
          data: {
            total_likes: likes[0].total,
            total_comments: comments[0].total
          }
        });
      }

      const [today] = await db.query(`
        SELECT COUNT(*) as total
        FROM laporan
        WHERE DATE(created_at) = CURDATE()
      `);

      const [users] = await db.query(`
        SELECT COUNT(*) as total
        FROM users
        WHERE role = 'user'
      `);

      return res.json({
        success: true,
        data: {
          today: today[0].total,
          total_users: users[0].total
        }
      });

    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }
);

// ─── PUBLIC PROFILE ──────────────────────────────────────
router.get(
  '/users/:id/public',
  authenticate,
  async (req, res) => {
    try {
      const [rows] = await db.query(
        `
        SELECT
          id,
          name,
          role,
          avatar,
          created_at
        FROM users
        WHERE id = ?
        `,
        [req.params.id]
      );

      if (!rows.length) {
        return res.status(404).json({
          success: false,
          message: 'User tidak ditemukan.'
        });
      }

      return res.json({
        success: true,
        data: rows[0]
      });

    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }
);

router.get(
  '/users/:id/public/stats',
  authenticate,
  async (req, res) => {
    try {
      const [likes] = await db.query(
        `
        SELECT COUNT(*) as total
        FROM laporan_likes ll
        JOIN laporan l
          ON ll.laporan_id = l.id
        WHERE l.user_id = ?
        `,
        [req.params.id]
      );

      const [comments] = await db.query(
        `
        SELECT COUNT(*) as total
        FROM comments c
        JOIN laporan l
          ON c.laporan_id = l.id
        WHERE l.user_id = ?
        `,
        [req.params.id]
      );

      const [totalLaporan] = await db.query(
        `
        SELECT COUNT(*) as total
        FROM laporan
        WHERE user_id = ?
        `,
        [req.params.id]
      );

      return res.json({
        success: true,
        data: {
          total_likes: likes[0].total,
          total_comments: comments[0].total,
          total_laporan: totalLaporan[0].total
        }
      });

    } catch (err) {
      return res.status(500).json({
        success: false,
        message: err.message
      });
    }
  }
);

// ─── USERS ───────────────────────────────────────────────
router.get(
  '/users',
  authenticate,
  userCtrl.getAll
);

router.get(
  '/users/:id',
  authenticate,
  authorize('super_admin'),
  userCtrl.getById
);

router.post(
  '/users',
  authenticate,
  authorize('super_admin'),
  userCtrl.create
);

router.put(
  '/users/:id',
  authenticate,
  authorize('super_admin'),
  userCtrl.update
);

router.delete(
  '/users/:id',
  authenticate,
  authorize('super_admin'),
  userCtrl.remove
);

module.exports = router;