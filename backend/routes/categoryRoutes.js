const express = require('express');
const router = express.Router();

const {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');

// Fayl yo'li va funksiya nomlari to'g'ri ekanligini tekshiring
// Agar controller faylida boshqacha nomlar bo'lsa, ularga moslashtiring

// GET /api/categories
router.get('/', getCategories);

// GET /api/categories/:id
router.get('/:id', getCategory);

// POST /api/categories
router.post('/', createCategory);

// PUT /api/categories/:id
router.put('/:id', updateCategory);

// DELETE /api/categories/:id
router.delete('/:id', deleteCategory);

module.exports = router;