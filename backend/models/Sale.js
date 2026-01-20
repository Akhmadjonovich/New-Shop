const mongoose = require('mongoose');

const saleItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  productName: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true
  },
  total: {
    type: Number,
    required: true
  }
});

const saleSchema = new mongoose.Schema({
  saleNumber: {
    type: String,
    unique: true
  },
  items: [saleItemSchema],
  totalAmount: {
    type: Number,
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'credit', 'card', 'transfer'],
    required: true
  },
  // ✅ IKKALA MAYDON HAM BO'LISHI KERAK (eskisi va yangisi)
  debtorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Debtor',
    default: null
  },
  debtor: { // Eski versiya uchun
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Debtor',
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'cancelled'],
    default: 'completed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Sale = mongoose.model('Sale', saleSchema);
module.exports = Sale;