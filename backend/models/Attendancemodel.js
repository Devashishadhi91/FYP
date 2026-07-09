const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  storeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Store',
    required: true
  },
  date: {
    type: String, // stored as YYYY-MM-DD for easy daily querying
    required: true
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'pending'],
    default: 'pending'
  },
  checkedInAt: {
    type: Date,
    default: null
  },
  locationSnapshot: {
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  method: {
    type: String,
    enum: ['geofence', 'manual'],
    default: 'geofence'
  }
}, { timestamps: true });

// Ensure one attendance record per user per day
AttendanceSchema.index({ userId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema);
