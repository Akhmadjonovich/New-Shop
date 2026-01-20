const express = require('express');
const router = express.Router();

const {
  getProducts,
  getProduct,
  getProductByBarcode,
  createProduct,
  updateProduct,
  deleteProduct,
  getLowStockProducts,
  getProductStats
} = require('../controllers/productController');

// GET /api/products
router.get('/', getProducts);

// GET /api/products/:id
router.get('/:id', getProduct);

// GET /api/products/barcode/:barcode
router.get('/barcode/:barcode', getProductByBarcode);

// POST /api/products
router.post('/', createProduct);

// PUT /api/products/:id
router.put('/:id', updateProduct);

// DELETE /api/products/:id
router.delete('/:id', deleteProduct);

// GET /api/products/low-stock
router.get('/low-stock', getLowStockProducts);

// GET /api/products/stats
router.get('/stats', getProductStats);

module.exports = router;