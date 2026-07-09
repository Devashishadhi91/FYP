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
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  type: {
    type: String,
    enum: ['low_stock', 'order', 'alert', 'info', 'expiry_warning', 'aging_stock', 'staff_activity', 'attendance'],
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
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