const mongoose = require("mongoose");

const SaleSchema = new mongoose.Schema(
  {
    storeId: { type: mongoose.Schema.Types.ObjectId, ref: "Store", required: false },
    customerName: { type: String, required: true },
    products: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
        quantity: { type: Number, required: true },
        price: { type: Number, required: true },
      }
    ],
    totalAmount: { type: Number, required: true },
    paymentStatus: { type: String, enum: ["pending", "paid", "partial"], default: "pending" },
    paymentMethod: { type: String, enum: ["cash", "creditcard", "banktransfer"], required: true },
    partialAmount: { type: Number, default: 0 },
    invoiceUrl: { type: String }, 
    status: { type: String, enum: ["pending", "completed", "cancelled"], default: "pending" },
  },

{ timestamps: true }
);

const Sale = mongoose.model("Sale", SaleSchema);

module.exports = Sale;
