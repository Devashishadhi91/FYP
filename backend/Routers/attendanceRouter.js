const express = require('express');
const router = express.Router();
const {
  checkInGeofence,
  getMyAttendance,
  getAttendanceForStore,
  getAttendanceReport
} = require('../controller/attendanceController');
const { authmiddleware, adminOrManagerMiddleware } = require('../middleware/Authmiddleware');

router.post('/checkin', authmiddleware, checkInGeofence);
router.get('/my-attendance', authmiddleware, getMyAttendance);
router.get('/report', authmiddleware, adminOrManagerMiddleware, getAttendanceReport);
router.get('/store/:storeId', authmiddleware, adminOrManagerMiddleware, getAttendanceForStore);

module.exports = router;
