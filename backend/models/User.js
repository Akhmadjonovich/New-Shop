const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'Ismni kiriting'],
    trim: true
  },
  lastName: {
    type: String,
    required: [true, 'Familiyani kiriting'],
    trim: true
  },
  email: {
    type: String,
    required: false, // Hozircha kerak emas
    unique: false,
    trim: true,
    lowercase: true
  },
  phone: {
    type: String,
    required: false, // Hozircha kerak emas
    unique: false
  },
  password: {
    type: String,
    required: false, // Hozircha kerak emas
    minlength: 6,
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'seller', 'manager'],
    default: 'seller'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Password hash qilish (hozircha kerak emas)
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  
  if (this.password) {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  }
  next();
});

// Password solishtirish (hozircha kerak emas)
userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);