const mongoose = require('mongoose');
const schema = new mongoose.Schema({
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
  product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
  storeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Store', required: true },
  warehouseQtyBefore: { type: Number, required: true },
  warehouseQtyAfter: { type: Number, required: true },
  storeQtyBefore: { type: Number, required: true },
  storeQtyAfter: { type: Number, required: true },
  quantityTransferred: { type: Number, required: true },
  transferredAt: { type: Date, default: Date.now },
  performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

module.exports = mongoose.model('InventoryMovementLog', schema);
