// routes/transactionRoutes.js
const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');

// @route   GET /api/transactions
// @access  Public
router.get('/', transactionController.getTransactions);

// @route   GET /api/transactions/today
// @access  Public
router.get('/today', transactionController.getTodayTransactions);

// @route   GET /api/transactions/stats
// @access  Public
router.get('/stats', transactionController.getTransactionStats);

// @route   GET /api/transactions/report/sales
// @access  Public
router.get('/report/sales', transactionController.getSalesReport);

// @route   GET /api/transactions/:id
// @access  Public
router.get('/:id', transactionController.getTransaction);

// @route   POST /api/transactions
// @access  Public
router.post('/', transactionController.createTransaction);

// @route   PUT /api/transactions/:id
// @access  Public
router.put('/:id', transactionController.updateTransaction);

// @route   DELETE /api/transactions/:id
// @access  Public
router.delete('/:id', transactionController.deleteTransaction);

module.exports = router;