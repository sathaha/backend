const express = require('express')
const router = express.Router()

const {
  createContact,
  getContacts
} = require('../controllers/contactController')

const { authenticate } = require('../middleware/auth')

router.post('/', createContact)

router.get(
  '/',
  authenticate,
  getContacts
)

module.exports = router