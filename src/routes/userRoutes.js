const express = require('express')
const router = express.Router()

const {
  getAll,
  getById,
  getUserStats,
  create,
  update,
  remove
} = require('../controllers/userController')

const { verifyToken, checkRole } = require('../middlewares/authMiddleware')

router.get(
  '/',
  verifyToken,
  checkRole('super_admin'),
  getAll
)

const {
  searchMentionUsers
} = require('../controllers/UserController')

router.get(
  '/mention',
  verifyToken,
  searchMentionUsers
)

router.get(
  '/:id/stats',
  verifyToken,
  getUserStats
)

router.get(
  '/:id',
  verifyToken,
  getById
)

router.post(
  '/',
  verifyToken,
  checkRole('super_admin'),
  create
)

router.put(
  '/:id',
  verifyToken,
  checkRole('super_admin'),
  update
)

router.delete(
  '/:id',
  verifyToken,
  checkRole('super_admin'),
  remove
)

module.exports = router