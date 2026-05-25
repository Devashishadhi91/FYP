const mongoose = require('mongoose');

const StoreInventorySchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    default: 0,
    min: 0
  }
}, { timestamps: true });

// Compound index to ensure one record per product per store
StoreInventorySchema.index({ storeId: 1, product: 1 }, { unique: true });

module.exports = mongoose.model('StoreInventory', StoreInventorySchema);
