const express = require('express');
const router = express.Router();
const {
  login,
  register,
  getMe
} = require('../controllers/authController');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', getMe);

module.exports = router;