const mongoose = require('mongoose');

const StockTranscationSchema = new mongoose.Schema({
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: false
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  type: {
    type: String,
    enum: ["Stock-in", "Stock-out", "sale", "purchase", "adjustment"],
    required: true,
  },
  quantityChanged: {
    type: Number,
    required: true
  },
  previousQuantity: {
    type: Number,
    required: true
  },
  newQuantity: {
    type: Number,
    required: true
  },
  reference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sale" // Specifically for sales as requested, but can be generic later
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  supplier: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Supplier"
  },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
  status: { type: String, enum: ['pending', 'delivered', 'cancelled'], default: 'pending' }
},
{ timestamps: true }
);

const StockTranscation = mongoose.model("StockTranscation", StockTranscationSchema);

module.exports = StockTranscation;