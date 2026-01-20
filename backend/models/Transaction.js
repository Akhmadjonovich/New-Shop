// models/Transaction.js - TO'LIQ YANGILANGAN
const mongoose = require('mongoose');

const transactionItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  debtorId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Debtor',
    default: null
  }
});

const transactionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['sale', 'purchase', 'return', 'payment']
  },
  items: [transactionItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  totalCost: {
    type: Number,
    required: true,
    min: 0
  },
  profit: {
    type: Number,
    default: 0
  },
  customerName: {
    type: String,
    trim: true
  },
  customerPhone: {
    type: String,
    trim: true
  },
  debtor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Debtor',
    default: null
  },
  notes: {
    type: String,
    trim: true
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'transfer', 'debt'],
    default: 'cash'
  },
  status: {
    type: String,
    enum: ['completed', 'pending', 'cancelled'],
    default: 'completed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Middleware - yangilangan vaqtni avtomatik yangilash
transactionSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Transaction', transactionSchema);