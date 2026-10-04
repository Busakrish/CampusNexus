const mongoose = require('mongoose');
const { product: generateProductId } = require('../utils/idGenerator');

const ProductSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true,
    unique: true,
    default: generateProductId,
    index: true
  },
  organizationId: {
    type: String,
    required: true,
    index: true
  },
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    enum: ['Apparel', 'Accessories', 'Stationery', 'Memorabilia', 'Other'],
    default: 'Apparel'
  },
  images: {
    type: [String],
    default: []
  },
  variants: {
    type: [String],
    default: ['Default']
  },
  sizes: {
    type: [String],
    default: ['S', 'M', 'L', 'XL']
  },
  stock: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  status: {
    type: String,
    enum: ['Active', 'Inactive'],
    default: 'Active',
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', ProductSchema);
