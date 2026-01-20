const Debtor = require('../models/Debtor');

// Barcha qarzdorlarni olish
exports.getAllDebtors = async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    // Filtrlash
    if (status) {
      query.status = status;
    }

    // Qidirish
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } }
      ];
    }

    const debtors = await Debtor.find(query)
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: debtors.length,
      data: debtors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// Faqat faol qarzdorlarni olish
exports.getActiveDebtors = async (req, res) => {
  try {
    const debtors = await Debtor.find({ debtAmount: { $gt: 0 } })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: debtors.length,
      data: debtors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Server xatosi',
      error: error.message
    });
  }
};

// Qarzdorni ID bo'yicha olish - YANGI FUNKSIYA
exports.getDebtorById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const debtor = await Debtor.findById(id);
    
    if (!debtor) {
      return res.status(404).json({
        success: false,
        message: 'Qarzdor topilmadi'
      });
    }
    
    res.status(200).json({
      success: true,
      data: debtor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Qarzdorni olishda xatolik',
      error: error.message
    });
  }
};

// Qarzdor qidirish - YANGI FUNKSIYA
exports.searchDebtors = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Qidiruv so\'rovini kiriting'
      });
    }
    
    const searchRegex = new RegExp(query, 'i');
    
    const debtors = await Debtor.find({
      $or: [
        { name: searchRegex },
        { phone: searchRegex },
        { notes: searchRegex }
      ]
    })
    .sort({ debtAmount: -1 })
    .limit(20);
    
    res.status(200).json({
      success: true,
      count: debtors.length,
      data: debtors
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Qarzdor qidirishda xatolik',
      error: error.message
    });
  }
};

// Yangi qarzdor qo'shish
exports.createDebtor = async (req, res) => {
  try {
    const { name, phone, debtAmount, maxDebtAmount, notes } = req.body;

    // Telefon raqami tekshirish
    const existingDebtor = await Debtor.findOne({ phone });
    if (existingDebtor) {
      return res.status(400).json({
        success: false,
        message: 'Bu telefon raqam bilan qarzdor mavjud'
      });
    }

    const debtor = await Debtor.create({
      name,
      phone,
      debtAmount: debtAmount || 0,
      maxDebtAmount: maxDebtAmount || 0,
      notes: notes || '',
      status: debtAmount > 0 ? 'active' : 'paid'
    });

    res.status(201).json({
      success: true,
      message: 'Qarzdor muvaffaqiyatli qo\'shildi',
      data: debtor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Qarzdor qo\'shishda xatolik',
      error: error.message
    });
  }
};

// Qarzdorni yangilash
exports.updateDebtor = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Agar qarz miqdori yangilansa, statusni tekshirish
    if (updateData.debtAmount !== undefined) {
      updateData.status = updateData.debtAmount > 0 ? 'active' : 'paid';
    }

    const debtor = await Debtor.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!debtor) {
      return res.status(404).json({
        success: false,
        message: 'Qarzdor topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Qarzdor muvaffaqiyatli yangilandi',
      data: debtor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Qarzdor yangilashda xatolik',
      error: error.message
    });
  }
};

// Qarzdorni o'chirish
exports.deleteDebtor = async (req, res) => {
  try {
    const { id } = req.params;

    const debtor = await Debtor.findByIdAndDelete(id);

    if (!debtor) {
      return res.status(404).json({
        success: false,
        message: 'Qarzdor topilmadi'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Qarzdor muvaffaqiyatli o\'chirildi',
      data: debtor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Qarzdor o\'chirishda xatolik',
      error: error.message
    });
  }
};

// Qarz qo'shish/kamaytirish
exports.updateDebt = async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, type, notes } = req.body; // type: 'add' or 'subtract'

    const debtor = await Debtor.findById(id);
    if (!debtor) {
      return res.status(404).json({
        success: false,
        message: 'Qarzdor topilmadi'
      });
    }

    let newDebtAmount = debtor.debtAmount;
    
    if (type === 'add') {
      newDebtAmount += Math.abs(amount);
    } else if (type === 'subtract') {
      newDebtAmount -= Math.abs(amount);
      if (newDebtAmount < 0) newDebtAmount = 0;
    }

    // Statusni yangilash
    const status = newDebtAmount > 0 ? 'active' : 'paid';

    const updatedDebtor = await Debtor.findByIdAndUpdate(
      id,
      {
        debtAmount: newDebtAmount,
        status,
        lastTransactionDate: Date.now(),
        $push: {
          transactions: {
            amount: type === 'add' ? amount : -amount,
            type,
            notes,
            date: Date.now()
          }
        }
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `Qarz muvaffaqiyatli ${type === 'add' ? 'qo\'shildi' : 'kamaytirildi'}`,
      data: updatedDebtor
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Qarz yangilashda xatolik',
      error: error.message
    });
  }
};

// Qarzdor statistikasini olish
exports.getDebtStats = async (req, res) => {
  try {
    const totalDebtors = await Debtor.countDocuments();
    const activeDebtors = await Debtor.countDocuments({ debtAmount: { $gt: 0 } });
    
    const totalDebtResult = await Debtor.aggregate([
      { $group: { _id: null, total: { $sum: '$debtAmount' } } }
    ]);
    
    const totalDebt = totalDebtResult.length > 0 ? totalDebtResult[0].total : 0;

    res.status(200).json({
      success: true,
      data: {
        totalDebtors,
        activeDebtors,
        paidDebtors: totalDebtors - activeDebtors,
        totalDebt,
        averageDebt: activeDebtors > 0 ? totalDebt / activeDebtors : 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Statistika olishda xatolik',
      error: error.message
    });
  }
};