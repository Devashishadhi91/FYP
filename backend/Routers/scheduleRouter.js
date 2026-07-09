const express = require('express');
const router = express.Router();
const {
  createSchedule,
  getMySchedule,
  getManagerSchedules,
  getSchedulesForStaff,
  checkRoundingAttendance,
  getAllSchedules
} = require('../controller/scheduleController');
const { authmiddleware, adminOrManagerMiddleware } = require('../middleware/Authmiddleware');

router.post('/create', authmiddleware, adminOrManagerMiddleware, createSchedule);
router.get('/my-schedule', authmiddleware, getMySchedule);
router.get('/manager-schedules', authmiddleware, adminOrManagerMiddleware, getManagerSchedules);
router.get('/all', authmiddleware, adminOrManagerMiddleware, getAllSchedules);
router.get('/staff/:staffId', authmiddleware, adminOrManagerMiddleware, getSchedulesForStaff);
router.post('/rounding-checkin', authmiddleware, checkRoundingAttendance);

module.exports = router;
