// routes/debtorRoutes.js
const express = require('express');
const router = express.Router();
const debtorController = require('../controllers/debtorController');
const transactionController = require('../controllers/transactionController');

// Barcha route'lar uchun autentifikatsiya

// Barcha qarzdorlarni olish
router.get('/', debtorController.getAllDebtors);

// Faol qarzdorlarni olish
router.get('/active', debtorController.getActiveDebtors);

// Qarzdor qidirish
router.get('/search', debtorController.searchDebtors);

// Qarzdorni ID bo'yicha olish
router.get('/:id', debtorController.getDebtorById);

// Yangi qarzdor qo'shish
router.post('/', debtorController.createDebtor);

// Qarzdorni yangilash
router.put('/:id', debtorController.updateDebtor);

// Qarzdorni o'chirish
router.delete('/:id', debtorController.deleteDebtor);

// Qarz qo'shish/kamaytirish
router.patch('/:id/debt', debtorController.updateDebt);

// Statistikani olish
router.get('/stats/totals', debtorController.getDebtStats);

// ============ YANGI ENDPOINTS ============

// Qarzdorning transaksiyalarini olish
router.get('/:id/transactions', transactionController.getDebtorTransactions);

// Qarzdorning sotuvlarini olish
router.get('/:id/sales', transactionController.getDebtorSales);

// Qarzdorning tarixini olish
router.get('/:id/history', transactionController.getDebtorHistory);

module.exports = router;