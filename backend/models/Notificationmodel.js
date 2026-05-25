const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ["low_stock", "order", "alert", "info"],
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product"
  },
  isRead: {
    type: Boolean,
    default: false
  },
},
{ timestamps: true }
);

const Notification = mongoose.model("Notification", NotificationSchema);

module.exports = Notification;