const express = require('express');
const router = express.Router();
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const Debtor = require('../models/Debtor'); // Debtor modelini import qo'shdim

// @route   GET /api/sales/test
// @desc    Test endpoint
// @access  Public
router.get('/test', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Sales API ishlayapti ✅'
  });
});

// @route   GET /api/sales/debtor/:debtorId
// @desc    Qarzdor ID bo'yicha savdolarni olish
// @access  Private
router.get('/debtor/:debtorId', async (req, res) => {
  try {
    const { debtorId } = req.params;
    
    console.log(`🔍 Qarzdor uchun savdolar so'rovi: ${debtorId}`);
    
    // Qarzdorni tekshirish
    const debtor = await Debtor.findById(debtorId);
    if (!debtor) {
      return res.status(404).json({
        success: false,
        message: 'Qarzdor topilmadi'
      });
    }
    
    // Savdolarni olish
    const sales = await Sale.find({ 
      $or: [
        { debtorId: debtorId },
        { debtor: debtorId } // Eski model uchun ham qo'shdim
      ]
    })
    .populate('items.product', 'name price barcode category')
    .sort({ createdAt: -1 });
    
    console.log(`✅ ${debtor.name} uchun ${sales.length} ta savdo topildi`);
    
    // Formatlash
    const formattedSales = sales.map(sale => ({
      _id: sale._id,
      saleNumber: sale.saleNumber,
      date: sale.createdAt,
      totalAmount: sale.totalAmount,
      paymentMethod: sale.paymentMethod,
      itemsCount: sale.items.length,
      items: sale.items.map(item => ({
        productName: item.product?.name || item.productName || 'Noma\'lum',
        quantity: item.quantity,
        price: item.price,
        total: item.total
      })),
      notes: sale.notes || ''
    }));
    
    res.status(200).json({
      success: true,
      data: {
        debtor: {
          _id: debtor._id,
          name: debtor.name,
          phone: debtor.phone,
          debtAmount: debtor.debtAmount,
          status: debtor.status
        },
        sales: formattedSales,
        count: sales.length,
        totalAmount: sales.reduce((sum, sale) => sum + sale.totalAmount, 0)
      }
    });
    
  } catch (error) {
    console.error('❌ Qarzdor savdolarini olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
});

// @route   GET /api/sales
// @desc    Barcha sotuvlarni olish (filtirlash bilan)
// @access  Private
router.get('/', async (req, res) => {
  try {
    const { 
      startDate, 
      endDate, 
      paymentMethod, 
      debtorId,
      limit = 50, 
      page = 1 
    } = req.query;
    
    let query = {};
    
    // Filtrlash
    if (startDate && endDate) {
      query.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    if (paymentMethod) {
      query.paymentMethod = paymentMethod;
    }
    
    if (debtorId) {
      query.$or = [
        { debtorId: debtorId },
        { debtor: debtorId }
      ];
    }
    
    const skip = (page - 1) * limit;
    const limitNum = parseInt(limit);
    
    const sales = await Sale.find(query)
      .populate('items.product', 'name price barcode category')
      .populate({
        path: 'debtorId',
        select: 'name phone debtAmount',
        model: 'Debtor'
      })
      .populate('debtor', 'name phone') // Eski model uchun
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum);
    
    const total = await Sale.countDocuments(query);
    
    res.status(200).json({
      success: true,
      count: sales.length,
      total,
      pages: Math.ceil(total / limitNum),
      currentPage: parseInt(page),
      data: sales
    });
    
  } catch (error) {
    console.error('Sotuvlarni olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
});

// @route   GET /api/sales/today
// @desc    Bugungi sotuvlarni olish
// @access  Private
router.get('/today', async (req, res) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const sales = await Sale.find({
      createdAt: {
        $gte: today,
        $lt: tomorrow
      }
    })
    .populate('items.product', 'name price')
    .populate('debtorId', 'name phone')
    .sort({ createdAt: -1 });
    
    // Bugungi statistikalar
    const totalSales = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0);
    const totalItems = sales.reduce((sum, sale) => sum + sale.items.length, 0);
    
    const paymentStats = {
      cash: sales.filter(s => s.paymentMethod === 'cash').reduce((sum, s) => sum + s.totalAmount, 0),
      credit: sales.filter(s => s.paymentMethod === 'credit').reduce((sum, s) => sum + s.totalAmount, 0),
      card: sales.filter(s => s.paymentMethod === 'card').reduce((sum, s) => sum + s.totalAmount, 0)
    };
    
    res.status(200).json({
      success: true,
      count: sales.length,
      totalSales,
      totalItems,
      paymentStats,
      data: sales
    });
    
  } catch (error) {
    console.error('Bugungi sotuvlarni olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});

// @route   POST /api/sales
// @desc    Yangi sotuv yaratish
// @access  Private
router.post('/', async (req, res) => {
  try {
    const { items, totalAmount, paymentMethod, debtorId, notes } = req.body;
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Sotuvda kamida 1 ta mahsulot bo\'lishi kerak'
      });
    }
    
    // Sotuv raqamini generatsiya qilish
    const saleNumber = 'SALE-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
    
    // Mahsulotlarni yangilash
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (product) {
        if (product.quantity < item.quantity) {
          return res.status(400).json({
            success: false,
            message: `${product.name} mahsulotidan yetarli miqdor yo'q (omborda: ${product.quantity}, talab: ${item.quantity})`
          });
        }
        
        // Ombordagi miqdorni kamaytirish
        product.quantity -= item.quantity;
        await product.save();
      }
    }
    
    // Yangi sotuv yaratish
    const sale = new Sale({
      saleNumber,
      items: items.map(item => ({
        product: item.product,
        productName: item.productName,
        barcode: item.barcode,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      })),
      totalAmount: totalAmount || items.reduce((sum, item) => sum + (item.price * item.quantity), 0),
      paymentMethod: paymentMethod || 'cash',
      debtorId: paymentMethod === 'credit' ? debtorId : null,
      debtor: paymentMethod === 'credit' ? debtorId : null, // Eski model uchun
      notes: notes || '',
      status: 'completed'
    });
    
    await sale.save();
    
    // Agar nasiya bo'lsa, qarzdor qarzini yangilash
    if (paymentMethod === 'credit' && debtorId) {
      try {
        const debtor = await Debtor.findById(debtorId);
        if (debtor) {
          const newDebtAmount = (debtor.debtAmount || 0) + sale.totalAmount;
          
          await Debtor.findByIdAndUpdate(debtorId, {
            $set: {
              debtAmount: newDebtAmount,
              status: newDebtAmount > 0 ? 'active' : 'paid',
              lastTransactionDate: new Date()
            },
            $push: {
              transactions: {
                amount: sale.totalAmount,
                type: 'sale',
                notes: `Sotish №${saleNumber}`,
                date: new Date(),
                saleId: sale._id
              }
            }
          });
          
          console.log(`✅ Qarzdor yangilandi: ${debtor.name}, Yangi qarz: ${newDebtAmount}`);
        }
      } catch (debtorError) {
        console.error('❌ Qarzdor yangilashda xatolik:', debtorError);
      }
    }
    
    res.status(201).json({
      success: true,
      message: 'Sotuv muvaffaqiyatli amalga oshirildi',
      data: sale
    });
    
  } catch (error) {
    console.error('Sotuv yaratishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
});

// @route   GET /api/sales/stats
// @desc    Sotuvlar statistikasi
// @access  Private
router.get('/stats', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    const matchStage = {};
    
    // Sana oralig'i
    if (startDate || endDate) {
      matchStage.createdAt = {};
      if (startDate) matchStage.createdAt.$gte = new Date(startDate);
      if (endDate) matchStage.createdAt.$lte = new Date(endDate);
    }
    
    const stats = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          totalSales: { $sum: '$totalAmount' },
          count: { $sum: 1 },
          avgSale: { $avg: '$totalAmount' },
          cashSales: {
            $sum: {
              $cond: [{ $eq: ['$paymentMethod', 'cash'] }, '$totalAmount', 0]
            }
          },
          cardSales: {
            $sum: {
              $cond: [{ $eq: ['$paymentMethod', 'card'] }, '$totalAmount', 0]
            }
          },
          creditSales: {
            $sum: {
              $cond: [{ $eq: ['$paymentMethod', 'credit'] }, '$totalAmount', 0]
            }
          }
        }
      }
    ]);
    
    // Kunlik statistika (oxirgi 7 kun)
    const lastWeek = new Date();
    lastWeek.setDate(lastWeek.getDate() - 7);
    
    const dailyStats = await Sale.aggregate([
      {
        $match: {
          createdAt: { $gte: lastWeek }
        }
      },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
          totalSales: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // Qarzdorlar bo'yicha statistika
    const debtorStats = await Sale.aggregate([
      {
        $match: {
          paymentMethod: 'credit',
          debtorId: { $ne: null }
        }
      },
      {
        $group: {
          _id: '$debtorId',
          totalCredit: { $sum: '$totalAmount' },
          saleCount: { $sum: 1 }
        }
      },
      { $sort: { totalCredit: -1 } },
      { $limit: 10 }
    ]);
    
    // Debtor ma'lumotlarini olish
    const debtorIds = debtorStats.map(stat => stat._id);
    const debtors = await Debtor.find({ _id: { $in: debtorIds } }, 'name phone');
    
    // Debtor ma'lumotlarini birlashtirish
    const enhancedDebtorStats = debtorStats.map(stat => {
      const debtor = debtors.find(d => d._id.toString() === stat._id.toString());
      return {
        ...stat,
        debtorName: debtor ? debtor.name : 'Noma\'lum',
        debtorPhone: debtor ? debtor.phone : ''
      };
    });
    
    res.status(200).json({
      success: true,
      data: {
        overview: stats[0] || {
          totalSales: 0,
          count: 0,
          avgSale: 0,
          cashSales: 0,
          cardSales: 0,
          creditSales: 0
        },
        dailyStats,
        debtorStats: enhancedDebtorStats
      }
    });
    
  } catch (error) {
    console.error('Statistikani olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});

// @route   GET /api/sales/:id
// @desc    Sotuvni ID bo'yicha olish
// @access  Private
router.get('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id)
      .populate('items.product', 'name price barcode category')
      .populate('debtorId', 'name phone debtAmount transactions')
      .populate('debtor', 'name phone');
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sotuv topilmadi'
      });
    }
    
    res.status(200).json({
      success: true,
      data: sale
    });
    
  } catch (error) {
    console.error('Sotuvni olishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});

// @route   DELETE /api/sales/:id
// @desc    Sotuvni o'chirish
// @access  Private
router.delete('/:id', async (req, res) => {
  try {
    const sale = await Sale.findById(req.params.id);
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: 'Sotuv topilmadi'
      });
    }
    
    // Mahsulotlarni qaytarish
    for (const item of sale.items) {
      const product = await Product.findById(item.product);
      if (product) {
        product.quantity += item.quantity;
        await product.save();
      }
    }
    
    // Agar nasiya sotish bo'lsa, qarzdor qarzini kamaytirish
    if (sale.paymentMethod === 'credit' && sale.debtorId) {
      try {
        await Debtor.findByIdAndUpdate(sale.debtorId, {
          $inc: { debtAmount: -sale.totalAmount },
          $push: {
            transactions: {
              amount: -sale.totalAmount,
              type: 'refund',
              notes: `Sotish bekor qilindi: ${sale.saleNumber}`,
              date: new Date()
            }
          }
        });
        console.log(`✅ Qarzdor qarzi qaytarildi: ${sale.debtorId}`);
      } catch (debtorError) {
        console.error('❌ Qarzdor qarzini qaytarishda xatolik:', debtorError);
      }
    }
    
    await sale.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Sotuv o\'chirildi va mahsulotlar omborga qaytarildi'
    });
    
  } catch (error) {
    console.error('Sotuvni o\'chirishda xatolik:', error);
    res.status(500).json({
      success: false,
      message: 'Server xatosi'
    });
  }
});

module.exports = router;