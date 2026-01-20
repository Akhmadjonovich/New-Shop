const User = require('../models/User');

// @desc    Get current user
// @route   GET /api/auth/me
// @access  Public
exports.getMe = async (req, res) => {
  try {
    // Bu endpoint hozircha bo'sh, kerak bo'lsa keyinroq ishlatiladi
    res.status(200).json({
      success: true,
      message: 'Auth system is disabled for now'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
};

// @desc    Simple login (token o'rniga session yoki cookie ishlatilishi mumkin)
// @route   POST /api/auth/login
// @access  Public
exports.login = async (req, res) => {
  try {
    // Login kerak emas, lekin endpoint borligi uchun bo'sh response qaytaramiz
    res.status(200).json({
      success: true,
      message: 'Authentication is disabled in this version'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
};

// @desc    Register user (hozircha kerak emas)
// @route   POST /api/auth/register
// @access  Public
exports.register = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Registration is disabled in this version'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
};