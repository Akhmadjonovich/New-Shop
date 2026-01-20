// controllers/transactionController.js - TO'LIQ YANGILANGAN
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Debtor = require('../models/Debtor');

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Public
exports.getTransactions = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;
    
    let query = {};
    
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        query.createdAt.$lte = new Date(endDate);
      }
    }
    
    if (type) {
      query.type = type;
    }
    
    const transactions = await Transaction.find(query)
      .populate('items.product', 'name barcode price')
      .populate('debtor', 'name phone')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single transaction
// @route   GET /api/transactions/:id
// @access  Public
exports.getTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findById(req.params.id)
      .populate('items.product', 'name barcode price')
      .populate('debtor', 'name phone');
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create transaction
// @route   POST /api/transactions
// @access  Public
exports.createTransaction = async (req, res) => {
  try {
    const { type, items, customerName, customerPhone, notes } = req.body;
    
    // Calculate totals
    let totalAmount = 0;
    let totalCost = 0;
    
    // Update product quantities and calculate totals
    for (const item of items) {
      const product = await Product.findById(item.product);
      
      if (!product) {
        return res.status(404).json({
          success: false,
          message: `Product ${item.product} not found`
        });
      }
      
      if (type === 'sale') {
        if (product.quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `Not enough stock for ${product.name}. Available: ${product.quantity}`
          });
        }
        product.quantity -= item.quantity;
      } else if (type === 'purchase') {
        product.quantity += item.quantity;
      } else if (type === 'return') {
        product.quantity += item.quantity;
      }
      
      await product.save();
      
      totalAmount += item.quantity * item.price;
      totalCost += item.quantity * product.cost;
    }
    
    const transaction = await Transaction.create({
      type,
      items,
      totalAmount,
      totalCost,
      profit: totalAmount - totalCost,
      customerName,
      customerPhone,
      notes
    });
    
    res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      data: transaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update transaction
// @route   PUT /api/transactions/:id
// @access  Public
exports.updateTransaction = async (req, res) => {
  try {
    // Note: Transaction updates are complex due to inventory changes
    // For simplicity, we'll only allow updating notes and customer info
    
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Only allow updating certain fields
    const updateData = {
      customerName: req.body.customerName || transaction.customerName,
      customerPhone: req.body.customerPhone || transaction.customerPhone,
      notes: req.body.notes || transaction.notes
    };
    
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    
    res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      data: updatedTransaction
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete transaction
// @route   DELETE /api/transactions/:id
// @access  Public
exports.deleteTransaction = async (req, res) => {
  try {
    // Important: When deleting a transaction, we need to reverse inventory changes
    
    const transaction = await Transaction.findById(req.params.id);
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }
    
    // Reverse inventory changes
    for (const item of transaction.items) {
      const product = await Product.findById(item.product);
      
      if (product) {
        if (transaction.type === 'sale') {
          product.quantity += item.quantity;
        } else if (transaction.type === 'purchase') {
          product.quantity -= item.quantity;
        } else if (transaction.type === 'return') {
          product.quantity -= item.quantity;
        }
        
        await product.save();
      }
    }
    
    await transaction.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get today's transactions
// @route   GET /api/transactions/today
// @access  Public
exports.getTodayTransactions = async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const transactions = await Transaction.find({
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    })
    .populate('items.product', 'name barcode price')
    .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get transaction statistics
// @route   GET /api/transactions/stats
// @access  Public
exports.getTransactionStats = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let matchStage = {};
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.createdAt.$lte = new Date(endDate);
      }
    }
    
    const stats = await Transaction.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSales: {
            $sum: {
              $cond: [{ $eq: ['$type', 'sale'] }, '$totalAmount', 0]
            }
          },
          totalPurchases: {
            $sum: {
              $cond: [{ $eq: ['$type', 'purchase'] }, '$totalAmount', 0]
            }
          },
          totalProfit: { $sum: '$profit' },
          totalTransactions: { $sum: 1 },
          saleCount: {
            $sum: { $cond: [{ $eq: ['$type', 'sale'] }, 1, 0] }
          },
          purchaseCount: {
            $sum: { $cond: [{ $eq: ['$type', 'purchase'] }, 1, 0] }
          },
          returnCount: {
            $sum: { $cond: [{ $eq: ['$type', 'return'] }, 1, 0] }
          }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: stats[0] || {
        totalSales: 0,
        totalPurchases: 0,
        totalProfit: 0,
        totalTransactions: 0,
        saleCount: 0,
        purchaseCount: 0,
        returnCount: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get sales report
// @route   GET /api/transactions/report/sales
// @access  Public
exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'day' } = req.query;
    
    let matchStage = { type: 'sale' };
    
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) {
        matchStage.createdAt.$gte = new Date(startDate);
      }
      if (endDate) {
        matchStage.createdAt.$lte = new Date(endDate);
      }
    }
    
    let groupStage = {};
    
    if (groupBy === 'day') {
      groupStage = {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' }
        },
        date: { $first: '$createdAt' }
      };
    } else if (groupBy === 'month') {
      groupStage = {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' }
        },
        date: { $first: '$createdAt' }
      };
    } else if (groupBy === 'year') {
      groupStage = {
        _id: { year: { $year: '$createdAt' } },
        date: { $first: '$createdAt' }
      };
    }
    
    Object.assign(groupStage, {
      totalSales: { $sum: '$totalAmount' },
      totalProfit: { $sum: '$profit' },
      transactionCount: { $sum: 1 }
    });
    
    const report = await Transaction.aggregate([
      { $match: matchStage },
      { $group: groupStage },
      { $sort: { '_id.year': -1, '_id.month': -1, '_id.day': -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: report
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// ==================== YANGI FUNKSIYALAR QARZDORLAR UCHUN ====================

// @desc    Get debtor's transactions
// @route   GET /api/debtors/:id/transactions
// @access  Public
exports.getDebtorTransactions = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Qarzdorni topish
    const debtor = await Debtor.findById(id);
    if (!debtor) {
      return res.status(404).json({
        success: false,
        message: 'Qarzdor topilmadi'
      });
    }
    
    // Qarzdorning transaksiyalarini olish (debtor fieldi yoki customerPhone bo'yicha)
    const transactions = await Transaction.find({
      $or: [
        { debtor: id },
        { customerPhone: debtor.phone }
      ]
    })
    .populate('items.product', 'name barcode price')
    .populate('debtor', 'name phone')
    .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: transactions.length,
      data: transactions
    });
  } catch (error) {
    console.error('Debtor transactions fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Tarix yuklashda xatolik',
      error: error.message
    });
  }
};

// @desc    Get debtor's sales
// @route   GET /api/debtors/:id/sales
// @access  Public
exports.getDebtorSales = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Qarzdorni topish
    const debtor = await Debtor.findById(id);
    if (!debtor) {
      return res.status(404).json({
        success: false,
        message: 'Qarzdor topilmadi'
      });
    }
    
    // Qarzdorning sotuvlarini olish
    const sales = await Transaction.find({
      $or: [
        { debtor: id },
        { customerPhone: debtor.phone }
      ],
      type: 'sale'
    })
    .populate('items.product', 'name barcode price')
    .populate('debtor', 'name phone')
    .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: sales.length,
      data: sales
    });
  } catch (error) {
    console.error('Debtor sales fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Sotuvlar yuklashda xatolik',
      error: error.message
    });
  }
};

// @desc    Get debtor's history
// @route   GET /api/debtors/:id/history
// @access  Public
exports.getDebtorHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    // Qarzdorni topish
    const debtor = await Debtor.findById(id);
    if (!debtor) {
      return res.status(404).json({
        success: false,
        message: 'Qarzdor topilmadi'
      });
    }
    
    // Transaction modelidan qarzdorning transaksiyalarini olish
    const transactions = await Transaction.find({
      $or: [
        { debtor: id },
        { customerPhone: debtor.phone }
      ]
    })
    .populate('items.product', 'name barcode price')
    .populate('debtor', 'name phone')
    .sort({ createdAt: -1 })
    .limit(100); // Oxirgi 100 ta
    
    // Qarzdorning o'zidagi transaksiyalar (payment qo'shimchalari)
    const debtorTransactions = debtor.transactions || [];
    
    // Barcha ma'lumotlarni birlashtirish
    const allHistory = [
      ...transactions.map(t => ({
        type: 'transaction',
        data: t,
        date: t.createdAt
      })),
      ...debtorTransactions.map(t => ({
        type: 'payment',
        data: t,
        date: t.date
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.status(200).json({
      success: true,
      data: {
        debtorInfo: {
          name: debtor.name,
          phone: debtor.phone,
          debtAmount: debtor.debtAmount,
          status: debtor.status
        },
        history: allHistory,
        summary: {
          totalTransactions: transactions.length,
          totalPayments: debtorTransactions.length,
          totalItems: allHistory.length
        }
      }
    });
  } catch (error) {
    console.error('Debtor history fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Tarix yuklashda xatolik',
      error: error.message
    });
  }
};