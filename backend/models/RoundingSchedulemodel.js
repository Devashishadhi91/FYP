const mongoose = require('mongoose');

const SlotSchema = new mongoose.Schema({
  partnerStoreName: {
    type: String,
    required: true
  },
  partnerStoreLat: {
    type: Number,
    required: true
  },
  partnerStoreLng: {
    type: Number,
    required: true
  },
  startTime: {
    type: String, // HH:MM format e.g. "10:00"
    required: true
  },
  endTime: {
    type: String, // HH:MM format e.g. "11:00"
    required: true
  },
  attendanceStatus: {
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
  }
}, { _id: true });

const RoundingScheduleSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  slots: [SlotSchema]
}, { timestamps: true });

// One schedule per staff per day
RoundingScheduleSchema.index({ staffId: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('RoundingSchedule', RoundingScheduleSchema);
