const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');

// Avval dotenv ni sozlash
const result = dotenv.config();
if (result.error) {
  console.error('❌ .env faylini yuklashda xato:', result.error);
  process.exit(1);
}

console.log('📁 Environment loaded successfully');
console.log('📊 NODE_ENV:', process.env.NODE_ENV);

// Routes
const categoryRoutes = require('./routes/categoryRoutes');
const productRoutes = require('./routes/productRoutes');
const transactionRoutes = require('./routes/transactionRoutes');
const salesRoutes = require('./routes/salesRoutes');
const debtorRoutes = require('./routes/debtorRoutes');

const app = express();

/* ================= CORS - YANGILANDI ================= */
app.use(cors({
  origin: [
    'https://localhost:5173',
    'http://localhost:5173',
    'http://localhost:3000',
    'https://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'Origin', 'X-Requested-With'],
  exposedHeaders: ['Content-Length', 'Authorization'],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

// CORS preflight - har bir turdagi so'rov uchun
app.options('*', cors());

// Qo'shimcha headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  next();
});

/* =============== MIDDLEWARE =============== */
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(compression());

// Logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
  console.log('Origin:', req.headers.origin);
  console.log('Headers:', req.headers);
  next();
});

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

/* =============== TEST ENDPOINTS - Birinchi bo'lib ===================== */
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Store Management API Server',
    version: '1.0.0',
    time: new Date().toISOString(),
    cors: 'CORS enabled',
    origins: ['https://localhost:5173', 'http://localhost:5173', 'http://localhost:3000']
  });
});

app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working',
    timestamp: new Date().toISOString(),
    cors: 'CORS is configured',
    clientIP: req.ip,
    clientOrigin: req.headers.origin
  });
});

app.get('/api/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    database: getMongoState(mongoose.connection.readyState),
    cors: 'enabled'
  });
});

/* =============== ROUTES =================== */
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/debtors', debtorRoutes);

// Helper function for MongoDB state
function getMongoState(state) {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
    99: 'uninitialized'
  };
  return states[state] || 'unknown';
}

/* =============== 404 HANDLER ====================== */
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint topilmadi',
    path: req.originalUrl,
    availableEndpoints: [
      'GET /',
      'GET /api/test',
      'GET /api/health',
      'GET /api/categories',
      'GET /api/products',
      'GET /api/transactions',
      'GET /api/sales',
      'GET /api/debtors'
    ]
  });
});

/* ============ ERROR HANDLER =============== */
app.use((err, req, res, next) => {
  console.error('Server Error:', err.message);
  
  const statusCode = err.statusCode || 500;
  const message = err.message || 'Server xatosi';
  
  res.status(statusCode).json({
    success: false,
    message: message,
    ...(process.env.NODE_ENV === 'development' && { 
      stack: err.stack
    })
  });
});

/* ============ DATABASE CONNECTION ==================== */
/* ============ DATABASE CONNECTION ==================== */
const connectDB = async () => {
  let mongoURI; // <-- Bu qatorni funksiya ichida e'lon qiling
  
  try {
    // 1. URI ni olish
    mongoURI = process.env.MONGODB_URI; // <-- Scope ichida
    
    if (!mongoURI) {
      console.log('💡 Using default local MongoDB');
      mongoURI = 'mongodb://localhost:27017/store_management';
    }
    
    // Parolni yashirish
    const safeURI = mongoURI.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
    console.log('🔗 MongoDB URI:', safeURI);
    
    // MongoDB ga ulanish
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000, // <-- 10 soniyaga oshiring
      socketTimeoutMS: 45000,
      connectTimeoutMS: 10000 // <-- Ulanish timeout qo'shing
    };
    
    await mongoose.connect(mongoURI, options);
    
    console.log('✅ MongoDB connected');
    console.log('📊 Database:', mongoose.connection.name);
    
    // Connection events
    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB error:', err.message);
    });
    
    mongoose.connection.on('disconnected', () => {
      console.log('⚠️ MongoDB disconnected');
    });
    
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    
    // Local MongoDB ga urinib ko'rish
    if (mongoURI && !mongoURI.includes('localhost')) { // <-- mongoURI tekshirish
      console.log('🔄 Trying local MongoDB...');
      try {
        await mongoose.connect('mongodb://localhost:27017/store_management', {
          useNewUrlParser: true,
          useUnifiedTopology: true
        });
        console.log('✅ Connected to local MongoDB');
      } catch (localErr) {
        console.error('❌ Local MongoDB failed:', localErr.message);
      }
    }
  }
};

// Start server
const startServer = async () => {
  try {
    console.log('\n🚀 Starting Store Management Server');
    console.log('===============================');
    
    // MongoDB ga ulanish
    await connectDB();
    
    // Serverni ishga tushirish
    const PORT = process.env.PORT || 5000;
    const server = app.listen(PORT, () => {
      console.log('\n✅ Server is running!');
      console.log('===============================');
      console.log(`📍 Local: http://localhost:${PORT}`);
      console.log(`📍 HTTPS Local: https://localhost:${PORT} (if configured)`);
      console.log(`📊 MongoDB: ${getMongoState(mongoose.connection.readyState)}`);
      
      console.log('\n🔗 Test endpoints:');
      console.log(`   GET http://localhost:${PORT}/api/test`);
      console.log(`   GET http://localhost:${PORT}/api/health`);
      console.log(`   GET http://localhost:${PORT}/api/products`);
      console.log('\n🌐 CORS enabled for:');
      console.log('   - https://localhost:5173');
      console.log('   - http://localhost:5173');
      console.log('   - http://localhost:3000');
    });
    
    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n🔻 Shutting down...');
      server.close(() => {
        mongoose.connection.close();
        console.log('✅ Server stopped');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error('❌ Server startup failed:', error.message);
    process.exit(1);
  }
};

// Start the server
startServer();

module.exports = app;