const RoundingSchedule = require('../models/RoundingSchedulemodel');
const User = require('../models/Usermodel');
const Notification = require('../models/Notificationmodel');

function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371000;
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

// POST /api/schedule/create — manager creates a schedule for a rounding staff member
module.exports.createSchedule = async (req, res) => {
  try {
    const { staffId, date, slots } = req.body;

    if (!staffId || !date || !slots || !Array.isArray(slots) || slots.length === 0) {
      return res.status(400).json({ message: 'staffId, date, and at least one slot are required.' });
    }

    const staff = await User.findById(staffId);
    if (!staff) return res.status(404).json({ message: 'Staff member not found.' });
    if (!staff.isRounding) {
      return res.status(400).json({ message: 'Selected user is not a rounding staff member.' });
    }

    // Validate slot times are properly formatted
    for (const slot of slots) {
      if (!slot.partnerStoreName || !slot.partnerStoreLat || !slot.partnerStoreLng || !slot.startTime || !slot.endTime) {
        return res.status(400).json({ message: 'Each slot requires partnerStoreName, partnerStoreLat, partnerStoreLng, startTime, and endTime.' });
      }
    }

    const existing = await RoundingSchedule.findOne({ staffId, date });
    if (existing) {
      // Update existing schedule
      existing.slots = slots;
      existing.createdBy = req.user._id;
      await existing.save();
      return res.status(200).json({ message: 'Schedule updated.', schedule: existing });
    }

    const schedule = new RoundingSchedule({
      staffId,
      createdBy: req.user._id,
      date,
      slots
    });
    await schedule.save();

    // Notify the rounding staff member
    const io = req.app.get('io');
    const note = new Notification({
      title: 'Schedule Assigned',
      message: `A new schedule has been assigned to you for ${date}.`,
      type: 'info',
      userId: staffId
    });
    await note.save();
    if (io) io.emit('newNotification', note);

    res.status(201).json({ message: 'Schedule created.', schedule });
  } catch (error) {
    console.error('Error creating schedule:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// GET /api/schedule/my-schedule?date=YYYY-MM-DD — rounding staff views their schedule
module.exports.getMySchedule = async (req, res) => {
  try {
    const today = req.query.date || new Date().toISOString().split('T')[0];
    const schedule = await RoundingSchedule.findOne({ staffId: req.user._id, date: today })
      .populate('createdBy', 'name');
    if (!schedule) {
      return res.status(200).json({ message: 'No schedule for this date.', schedule: null });
    }
    res.status(200).json(schedule);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching schedule', error: error.message });
  }
};

// GET /api/schedule/manager-schedules?startDate=&endDate=&staffId= — manager views all schedules they created
module.exports.getManagerSchedules = async (req, res) => {
  try {
    const { date, startDate, endDate, staffId } = req.query;
    const filter = { createdBy: req.user._id };
    if (staffId) filter.staffId = staffId;
    if (date) {
      filter.date = date;
    } else if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const schedules = await RoundingSchedule.find(filter)
      .populate('staffId', 'name email ProfilePic')
      .sort({ date: -1 });

    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching schedules', error: error.message });
  }
};

// GET /api/schedule/staff/:staffId — manager/admin views schedules for a specific rounding staff
module.exports.getSchedulesForStaff = async (req, res) => {
  try {
    const { staffId } = req.params;
    const { date } = req.query;
    const filter = { staffId };
    if (date) filter.date = date;

    const schedules = await RoundingSchedule.find(filter)
      .populate('createdBy', 'name')
      .sort({ date: -1 });

    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching staff schedules', error: error.message });
  }
};

// POST /api/schedule/rounding-checkin — rounding staff submits GPS for current time slot
module.exports.checkRoundingAttendance = async (req, res) => {
  try {
    const { lat, lng } = req.body;
    const user = req.user;

    if (lat === undefined || lng === undefined) {
      return res.status(400).json({ message: 'Location coordinates are required.' });
    }

    if (!user.isRounding) {
      return res.status(403).json({ message: 'Only rounding staff can use this endpoint.' });
    }

    const today = new Date().toISOString().split('T')[0];
    const schedule = await RoundingSchedule.findOne({ staffId: user._id, date: today });

    if (!schedule) {
      return res.status(404).json({ message: 'No schedule found for today.' });
    }

    // Determine the current time slot
    const now = new Date();
    const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    const activeSlot = schedule.slots.find(s => s.startTime <= currentHHMM && s.endTime > currentHHMM);

    if (!activeSlot) {
      return res.status(400).json({ message: 'There is no active schedule slot at the current time.' });
    }

    if (activeSlot.attendanceStatus !== 'pending') {
      return res.status(200).json({
        message: `Attendance already recorded as "${activeSlot.attendanceStatus}" for this slot.`,
        slot: activeSlot
      });
    }

    const distance = haversineDistance(lat, lng, activeSlot.partnerStoreLat, activeSlot.partnerStoreLng);
    const isPresent = distance <= GEOFENCE_RADIUS_METRES;

    if (!isPresent) {
      const note = new Notification({
        title: 'Rounding Staff Check-in Outside Location',
        message: `${user.name} attempted check-in ${Math.round(distance)}m from "${activeSlot.partnerStoreName}" at ${currentHHMM}.`,
        type: 'attendance',
        userId: null
      });
      await note.save();
      
      const io = req.app.get('io');
      if (io) io.emit('newNotification', note);

      return res.status(200).json({
        success: false,
        message: `You are ${Math.round(distance)}m from "${activeSlot.partnerStoreName}". You must be within the store perimeter to check in.`,
        distance: Math.round(distance)
      });
    }

    activeSlot.attendanceStatus = 'present';
    activeSlot.checkedInAt = new Date();
    activeSlot.locationSnapshot = { lat, lng };

    await schedule.save();

    const io = req.app.get('io');

    return res.status(200).json({
      success: true,
      message: `Checked in at "${activeSlot.partnerStoreName}". Marked present.`,
      distance: Math.round(distance),
      slot: activeSlot
    });

  } catch (error) {
    console.error('Error in checkRoundingAttendance:', error);
    res.status(500).json({ message: 'Internal Server Error', error: error.message });
  }
};

// GET /api/schedule/all — admin sees all schedules
module.exports.getAllSchedules = async (req, res) => {
  try {
    const { date, startDate, endDate, staffId } = req.query;
    const filter = {};
    if (staffId) filter.staffId = staffId;
    if (date) {
      filter.date = date;
    } else if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = startDate;
      if (endDate) filter.date.$lte = endDate;
    }

    const schedules = await RoundingSchedule.find(filter)
      .populate('staffId', 'name email ProfilePic')
      .populate('createdBy', 'name')
      .sort({ date: -1 });

    res.status(200).json(schedules);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching all schedules', error: error.message });
  }
};

// PUT /api/schedule/:id — update a schedule's slots
module.exports.updateSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const { slots, date } = req.body;

    const schedule = await RoundingSchedule.findById(id);
    if (!schedule) return res.status(404).json({ message: 'Schedule not found.' });

    if (slots) schedule.slots = slots;
    if (date) schedule.date = date;
    await schedule.save();

    const updated = await RoundingSchedule.findById(id)
      .populate('staffId', 'name email ProfilePic')
      .populate('createdBy', 'name');

    res.status(200).json({ message: 'Schedule updated.', schedule: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating schedule', error: error.message });
  }
};

// DELETE /api/schedule/:id — delete a schedule
module.exports.deleteSchedule = async (req, res) => {
  try {
    const { id } = req.params;
    const schedule = await RoundingSchedule.findByIdAndDelete(id);
    if (!schedule) return res.status(404).json({ message: 'Schedule not found.' });
    res.status(200).json({ message: 'Schedule deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting schedule', error: error.message });
  }
};
