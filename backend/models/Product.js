const { mongoose, autoId, idField, fk, money, schemaOptions } = require('./_helpers');

const variantSchema = new mongoose.Schema({
  sku: { type: String, required: true, trim: true },
  size: String,
  color: String,
  stock: { type: Number, required: true, min: 0, default: 0 }   // can never go negative
}, { _id: false });

const productSchema = new mongoose.Schema({
  productId: idField,                                // PRD0001
  name: { type: String, required: true, trim: true },
  description: String,
  category: { type: String, trim: true, index: true },
  price: money({ required: true }),                  // CURRENT catalog price only
  images: [String],
  variants: { type: [variantSchema], default: [] },
  status: { type: String, enum: ['Active', 'Inactive', 'Archived'], default: 'Active', index: true },
  createdBy: fk()
}, schemaOptions);

productSchema.virtual('totalStock').get(function () { return this.variants.reduce((s, v) => s + v.stock, 0); });

// Decrement stock atomically (use inside the order-confirmation transaction):
//   Product.updateOne({ productId, variants: { $elemMatch: { sku, stock: { $gte: qty } } } },
//                     { $inc: { 'variants.$.stock': -qty } })   // modifiedCount 0 => out of stock
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ 'variants.sku': 1 });

autoId(productSchema, 'productId', 'PRD');
module.exports = mongoose.models.Product || mongoose.model('Product', productSchema);
