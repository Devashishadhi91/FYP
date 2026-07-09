const Attendance = require('../models/Attendancemodel');
const User = require('../models/Usermodel');
const Store = require('../models/Storemodel');
const Notification = require('../models/Notificationmodel');
const { sendEmailNotification } = require('../libs/emailService');

// Haversine formula — returns distance in meters between two GPS coordinates
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000; // Earth radius in metres
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

const GEOFENCE_RADIUS_METRES = 100;

// POST /api/attendance/checkin
// Staff calls this on login or manually — sends their GPS, gets marked present/absent
module.exports.checkInGeofence = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const user = req.user;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'Location coordinates are required.' });
    }

    if (user.role !== 'staff' || user.isRounding) {
      return res.status(403).json({ message: 'Geofenced check-in is only for stationary staff.' });
    }

    const storeId = user.storeId?._id || user.storeId;
    if (!storeId) {
      return res.status(400).json({ message: 'You are not assigned to a store.' });
    }

    const store = await Store.findById(storeId);
    if (!store) {
      return res.status(404).json({ message: 'Assigned store not found.' });
    }

    if (!store.location || store.location.lat === null || store.location.lng === null) {
      return res.status(400).json({
        message: 'Your store does not have a location set. Ask your admin to add store coordinates.'
      });
    }

    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const distance = haversineDistance(lat, lng, store.location.lat, store.location.lng);
    const isPresent = distance <= GEOFENCE_RADIUS_METRES;

    if (!isPresent) {
      const msg = `Attendance: ${user.name} attempted check-in from outside store premises (${Math.round(distance)}m away).`;
      const note = new Notification({
        title: 'Staff Check-in Outside Premises',
        message: msg,
        type: 'attendance',
        userId: null
      });
      await note.save();
      
      const io = req.app.get('io');
      if (io) io.emit('newNotification', note);

      return res.status(200).json({
        success: false,
        message: `You are ${Math.round(distance)} metres from the store. You must be inside the store premises to check in.`,
        distance: Math.round(distance)
      });
    }

    // Upsert — one record per user per day
    const attendance = await Attendance.findOneAndUpdate(
      { userId: user._id, date: today },
      {
        storeId,
        status: 'present',
        checkedInAt: new Date(),
        locationSnapshot: { lat, lng },
        method: 'geofence'
      },
      { upsert: true, new: true }
    );

    const io = req.app.get('io');

    return res.status(200).json({
      success: true,
      message: 'Attendance marked as present.',
      distance: Math.round(distance),
      attendance
    });

  } catch (error) {
    if (error.code === 11000) {
      return res.status(200).json({ message: 'Attendance already recorded for today.' });
    }
    console.error('Error in checkInGeofence:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// GET /api/attendance/my-attendance
module.exports.getMyAttendance = async (req, res) => {
  try {
    const records = await Attendance.find({ userId: req.user._id })
      .populate('storeId', 'name address')
      .sort({ date: -1 })
      .limit(60);
    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attendance', error: error.message });
  }
};

// GET /api/attendance/store/:storeId?date=YYYY-MM-DD — admin/manager
module.exports.getAttendanceForStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { date } = req.query;
    const filter = { storeId };
    if (date) filter.date = date;

    const records = await Attendance.find(filter)
      .populate('userId', 'name email role ProfilePic')
      .sort({ date: -1 });

    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching store attendance', error: error.message });
  }
};

// GET /api/attendance/report?storeId=&startDate=&endDate= — admin/manager
module.exports.getAttendanceReport = async (req, res) => {
  try {
    const { storeId, startDate, endDate } = req.query;
    const filter = {};
    if (storeId) filter.storeId = storeId;
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const records = await Attendance.find(filter)
      .populate('userId', 'name email')
      .populate('storeId', 'name')
      .sort({ date: -1 });

    res.status(200).json(records);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching attendance report', error: error.message });
  }
};
