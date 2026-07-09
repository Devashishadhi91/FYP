const mongoose = require('mongoose');

const StoreSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true
  },
  address: {
    type: String,
    required: true
  },
  contactNumber: {
    type: String
  },
  location: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

module.exports = mongoose.model('Store', StoreSchema);
