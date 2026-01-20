const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getProducts = async (req, res) => {
  try {
    const { category, search, status } = req.query;
    
    let query = {};
    
    if (category && category !== 'null' && category !== 'undefined') {
      query.category = category;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { barcode: { $regex: search, $options: 'i' } }
      ];
    }
    
    if (status && status !== 'all') {
      if (status === 'low-stock') {
        query.quantity = { $lt: 10 };
      } else if (status === 'out-of-stock') {
        query.quantity = { $lte: 0 };
      } else if (status === 'active') {
        query.quantity = { $gt: 0 };
      }
    }
    
    const products = await Product.find(query)
      .populate('category', 'name color icon')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Get products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
exports.getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('category', 'name color icon');
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    res.status(200).json({
      success: true,
      data: product
    });
  } catch (error) {
    console.error('Get product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get product by barcode
// @route   GET /api/products/barcode/:barcode
// @access  Public
exports.getProductByBarcode = async (req, res) => {
  try {
    const product = await Product.findOne({ barcode: req.params.barcode })
      .populate('category', 'name color icon');
    
    if (!product) {
      return res.status(200).json({
        success: false,
        message: 'Product not found',
        exists: false
      });
    }
    
    res.status(200).json({
      success: true,
      data: product,
      exists: true
    });
  } catch (error) {
    console.error('Get product by barcode error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Public
exports.createProduct = async (req, res) => {
  try {
    const { name, barcode, category, price, cost, quantity, unit, description, minStock } = req.body;
    
    // Validate required fields
    if (!name || !category || price === undefined || cost === undefined || quantity === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }
    
    // Check if barcode already exists
    if (barcode) {
      const existingProduct = await Product.findOne({ barcode });
      if (existingProduct) {
        return res.status(400).json({
          success: false,
          message: 'Barcode already exists'
        });
      }
    }
    
    // Check if category exists
    const categoryExists = await Category.findById(category);
    if (!categoryExists) {
      return res.status(400).json({
        success: false,
        message: 'Category not found'
      });
    }
    
    const product = await Product.create({
      name,
      barcode,
      category,
      price: Number(price),
      cost: Number(cost),
      quantity: Number(quantity),
      unit: unit || 'dona',
      description,
      minStock: minStock || 10
    });
    
    // Update category product count
    await Category.findByIdAndUpdate(category, {
      $inc: { productCount: 1 }
    });
    
    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name color icon');
    
    res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: populatedProduct
    });
  } catch (error) {
    console.error('Create product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Public
exports.updateProduct = async (req, res) => {
  try {
    const { name, barcode, category, price, cost, quantity, unit, description, minStock } = req.body;
    
    // Find product
    let product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Check if new barcode conflicts with other products
    if (barcode && barcode !== product.barcode) {
      const existingProduct = await Product.findOne({ barcode });
      if (existingProduct && existingProduct._id.toString() !== req.params.id) {
        return res.status(400).json({
          success: false,
          message: 'Barcode already exists for another product'
        });
      }
    }
    
    // Update product
    product.name = name || product.name;
    product.barcode = barcode || product.barcode;
    product.category = category || product.category;
    product.price = price !== undefined ? Number(price) : product.price;
    product.cost = cost !== undefined ? Number(cost) : product.cost;
    product.quantity = quantity !== undefined ? Number(quantity) : product.quantity;
    product.unit = unit || product.unit;
    product.description = description || product.description;
    product.minStock = minStock || product.minStock;
    
    await product.save();
    
    const populatedProduct = await Product.findById(product._id)
      .populate('category', 'name color icon');
    
    res.status(200).json({
      success: true,
      message: 'Product updated successfully',
      data: populatedProduct
    });
  } catch (error) {
    console.error('Update product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Public
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found'
      });
    }
    
    // Update category product count
    await Category.findByIdAndUpdate(product.category, {
      $inc: { productCount: -1 }
    });
    
    await product.deleteOne();
    
    res.status(200).json({
      success: true,
      message: 'Product deleted successfully'
    });
  } catch (error) {
    console.error('Delete product error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get low stock products
// @route   GET /api/products/low-stock
// @access  Public
exports.getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({ quantity: { $lt: 10 } })
      .populate('category', 'name color icon')
      .sort({ quantity: 1 });
    
    res.status(200).json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    console.error('Low stock products error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get product statistics
// @route   GET /api/products/stats
// @access  Public
exports.getProductStats = async (req, res) => {
  try {
    const totalProducts = await Product.countDocuments();
    const lowStockProducts = await Product.countDocuments({ quantity: { $lt: 10 } });
    const outOfStockProducts = await Product.countDocuments({ quantity: { $lte: 0 } });
    
    const totalValueResult = await Product.aggregate([
      {
        $group: {
          _id: null,
          totalValue: { $sum: { $multiply: ['$quantity', '$price'] } }
        }
      }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        lowStockProducts,
        outOfStockProducts,
        totalValue: totalValueResult[0]?.totalValue || 0
      }
    });
  } catch (error) {
    console.error('Product stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};