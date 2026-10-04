const Product = require('../models/Product');
const Organization = require('../models/Organization');
const { sendSuccess, sendError } = require('../utils/response');

exports.createProduct = async (req, res, next) => {
  try {
    const {
      organizationId,
      name,
      description,
      price,
      category,
      images,
      variants,
      sizes,
      stock
    } = req.body;

    if (!name || price === undefined || stock === undefined) {
      return sendError(res, 'Product name, price, and stock are required.', 400, 'VALIDATION_FAILED');
    }

    const orgId = organizationId || req.user.organizationId;
    if (!orgId) {
      return sendError(res, 'Organization ID is required.', 400, 'ORG_REQUIRED');
    }

    const product = await Product.create({
      organizationId: orgId,
      name,
      description: description || '',
      price: Number(price),
      category: category || 'Apparel',
      images: images || [],
      variants: variants && variants.length ? variants : ['Standard'],
      sizes: sizes && sizes.length ? sizes : ['S', 'M', 'L', 'XL'],
      stock: parseInt(stock, 10),
      status: 'Active'
    });

    return sendSuccess(res, 'Product created successfully', { product }, 201);
  } catch (err) {
    next(err);
  }
};

exports.listProducts = async (req, res, next) => {
  try {
    const { organizationId, category, search, inStockOnly } = req.query;
    const query = { status: 'Active' };

    if (organizationId) query.organizationId = organizationId;
    if (category) query.category = category;
    if (inStockOnly === 'true') query.stock = { $gt: 0 };
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }

    const products = await Product.find(query).sort({ createdAt: -1 });

    const orgIds = [...new Set(products.map(p => p.organizationId))];
    const orgs = await Organization.find({ organizationId: { $in: orgIds } });
    const orgMap = Object.fromEntries(orgs.map(o => [o.organizationId, o]));

    const populated = products.map(p => ({
      ...p.toObject(),
      organization: orgMap[p.organizationId] || null
    }));

    return sendSuccess(res, 'Products retrieved', { products: populated, count: populated.length });
  } catch (err) {
    next(err);
  }
};

exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findOne({ productId: req.params.productId });
    if (!product) return sendError(res, 'Product not found.', 404, 'PRODUCT_NOT_FOUND');

    const org = await Organization.findOne({ organizationId: product.organizationId });

    return sendSuccess(res, 'Product details retrieved', { product, organization: org });
  } catch (err) {
    next(err);
  }
};

exports.updateProduct = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const product = await Product.findOne({ productId });
    if (!product) return sendError(res, 'Product not found.', 404, 'PRODUCT_NOT_FOUND');

    const fields = ['name', 'description', 'price', 'category', 'images', 'variants', 'sizes', 'stock', 'status'];
    fields.forEach(f => {
      if (req.body[f] !== undefined) {
        if (f === 'price') product.price = Number(req.body.price);
        else if (f === 'stock') product.stock = parseInt(req.body.stock, 10);
        else product[f] = req.body[f];
      }
    });

    await product.save();
    return sendSuccess(res, 'Product updated successfully', { product });
  } catch (err) {
    next(err);
  }
};
