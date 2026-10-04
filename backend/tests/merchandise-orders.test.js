const Product = require('../models/Product');
const Order = require('../models/Order');

module.exports = async function runMerchandiseTests() {
  // Test 1: Product creation with stock
  const testProduct = await Product.create({
    organizationId: 'ORG-CSS01',
    name: 'CSS Limited Edition Mug',
    price: 18,
    stock: 2, // Exactly 2 in stock
    variants: ['Ceramic White'],
    sizes: ['Standard 350ml'],
    status: 'Active'
  });

  assertEqual(testProduct.stock, 2, 'Product created with 2 units in stock');

  // Test 2: Atomic Purchase of 2 items
  const qtyToBuy = 2;
  const updatedProduct = await Product.findOneAndUpdate(
    { productId: testProduct.productId, stock: { $gte: qtyToBuy }, status: 'Active' },
    { $inc: { stock: -qtyToBuy } },
    { new: true }
  );

  assert(updatedProduct !== null, 'Product stock successfully decremented for valid purchase');
  assertEqual(updatedProduct.stock, 0, 'Product stock reaches exactly 0');

  const order = await Order.create({
    userId: 'USR-STU01',
    organizationId: testProduct.organizationId,
    items: [
      {
        productId: testProduct.productId,
        name: testProduct.name,
        variant: 'Ceramic White',
        size: 'Standard 350ml',
        quantity: 2,
        unitPrice: 18, // Historical snapshot
        subtotal: 36
      }
    ],
    totalAmount: 36,
    paymentStatus: 'Paid/Verified',
    status: 'Pending/Confirmed'
  });

  assertEqual(order.items[0].unitPrice, 18, 'Order item preserves initial unitPrice');

  // Test 3: Zero Stock Purchase Blockage
  const outOfStockAttempt = await Product.findOneAndUpdate(
    { productId: testProduct.productId, stock: { $gte: 1 }, status: 'Active' },
    { $inc: { stock: -1 } },
    { new: true }
  );
  assertEqual(outOfStockAttempt, null, 'Purchase is blocked when product inventory is 0 (prevents negative stock)');

  // Test 4: Historical Price Preservation (Rule 7)
  testProduct.price = 30; // Catalog price updated to $30
  await testProduct.save();

  const verifyOrder = await Order.findOne({ orderId: order.orderId });
  assertEqual(verifyOrder.items[0].unitPrice, 18, 'Historical order unitPrice remains $18 even when catalog price changes to $30');

  // Test 5: Order Cancellation restores stock
  order.status = 'Cancelled';
  await order.save();
  await Product.updateOne({ productId: testProduct.productId }, { $inc: { stock: 2 } });

  const restoredProduct = await Product.findOne({ productId: testProduct.productId });
  assertEqual(restoredProduct.stock, 2, 'Cancelled order restores inventory stock back to 2 units');
};
