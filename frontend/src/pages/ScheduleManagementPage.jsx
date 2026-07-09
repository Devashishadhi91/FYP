import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TopNavbar from '../Components/TopNavbar';
import { createSchedule, fetchManagerSchedules, fetchAllSchedules } from '../features/scheduleSlice';
import axiosInstance from '../lib/axios';
import toast from 'react-hot-toast';

const emptySlot = () => ({
  partnerStoreName: '',
  partnerStoreLat: '',
  partnerStoreLng: '',
  startTime: '',
  endTime: ''
});

function ScheduleManagementPage() {
  const dispatch = useDispatch();
  const { Authuser } = useSelector((state) => state.auth);
  const { managerSchedules, allSchedules, loading } = useSelector((state) => state.schedule);

  const [roundingStaff, setRoundingStaff] = useState([]);
  const [form, setForm] = useState({ staffId: '', startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], slots: [emptySlot()] });
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const isAdmin = Authuser?.role === 'admin';

  useEffect(() => {
    const params = { startDate: filterStartDate, endDate: filterEndDate };
    if (isAdmin) {
      dispatch(fetchAllSchedules(params));
    } else {
      dispatch(fetchManagerSchedules(params));
    }
    // Fetch all rounding staff
    axiosInstance.get('/auth/rounding-staff').then(res => setRoundingStaff(res.data)).catch(() => {});
  }, [dispatch, filterStartDate, filterEndDate, isAdmin]);

  const handleSlotChange = (idx, field, value) => {
    setForm(prev => {
      const slots = [...prev.slots];
      slots[idx] = { ...slots[idx], [field]: value };
      return { ...prev, slots };
    });
  };

  const addSlot = () => setForm(prev => ({ ...prev, slots: [...prev.slots, emptySlot()] }));
  const removeSlot = (idx) => setForm(prev => ({ ...prev, slots: prev.slots.filter((_, i) => i !== idx) }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.staffId || !form.startDate || !form.endDate) {
      toast.error('Please select a staff member and a date range.');
      return;
    }
    if (form.startDate > form.endDate) {
      toast.error('Start date must be before or equal to the end date.');
      return;
    }
    for (const slot of form.slots) {
      if (!slot.partnerStoreName || !slot.partnerStoreLat || !slot.partnerStoreLng || !slot.startTime || !slot.endTime) {
        toast.error('All slot fields are required.');
        return;
      }
      if (slot.startTime >= slot.endTime) {
        toast.error('End time must be after start time for each slot.');
        return;
      }
    }

    // Build list of every day in the selected range
    const getDatesInRange = (start, end) => {
      const dates = [];
      const current = new Date(start);
      const last = new Date(end);
      while (current <= last) {
        dates.push(current.toISOString().split('T')[0]);
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };

    const dates = getDatesInRange(form.startDate, form.endDate);
    const baseSlots = form.slots.map(s => ({
      ...s,
      partnerStoreLat: parseFloat(s.partnerStoreLat),
      partnerStoreLng: parseFloat(s.partnerStoreLng)
    }));

    Promise.all(
      dates.map(date =>
        dispatch(createSchedule({ staffId: form.staffId, date, slots: baseSlots }))
      )
    ).then(() => {
      setIsFormOpen(false);
      setForm({ staffId: '', startDate: new Date().toISOString().split('T')[0], endDate: new Date().toISOString().split('T')[0], slots: [emptySlot()] });
      if (isAdmin) dispatch(fetchAllSchedules({ startDate: filterStartDate, endDate: filterEndDate }));
      else dispatch(fetchManagerSchedules({ startDate: filterStartDate, endDate: filterEndDate }));
    });
  };

  const schedules = isAdmin ? allSchedules : managerSchedules;

  const slotStatusBadge = {
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    pending: 'bg-gray-100 text-gray-500'
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopNavbar />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <h1 className="text-2xl font-semibold text-gray-800">Rounding Staff Schedules</h1>
              <p className="text-sm text-gray-500 mt-0.5">Assign daily visit schedules and track field attendance for rounding staff.</p>
            </div>
            <button
              onClick={() => setIsFormOpen(true)}
              id="btn-create-schedule"
              className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition"
            >
              Create Schedule
            </button>
          </div>

          {/* Date Range Filter */}
          <div className="flex flex-wrap items-end gap-3 mb-5">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1">From</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1">To</label>
              <input
                type="date"
                value={filterEndDate}
                min={filterStartDate || undefined}
                onChange={(e) => setFilterEndDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            {(filterStartDate || filterEndDate) && (
              <button
                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); }}
                className="text-sm text-gray-400 hover:text-gray-600 self-end pb-2"
              >
                Clear
              </button>
            )}
          </div>

          {/* Create Schedule Modal */}
          {isFormOpen && (
            <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-10 px-4" onClick={() => setIsFormOpen(false)}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-semibold text-gray-800 mb-4">Create Schedule</h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Rounding Staff Member</label>
                      <select
                        value={form.staffId}
                        onChange={(e) => setForm(prev => ({ ...prev, staffId: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      >
                        <option value="">Select staff</option>
                        {roundingStaff.map(s => (
                          <option key={s._id} value={s._id}>{s.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">From Date</label>
                      <input
                        type="date"
                        value={form.startDate}
                        onChange={(e) => setForm(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">To Date</label>
                      <input
                        type="date"
                        value={form.endDate}
                        min={form.startDate || undefined}
                        onChange={(e) => setForm(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-600">Stops / Time Slots</label>
                      <button type="button" onClick={addSlot} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Stop</button>
                    </div>
                    <div className="space-y-3">
                      {form.slots.map((slot, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-gray-500">Stop {idx + 1}</span>
                            {form.slots.length > 1 && (
                              <button type="button" onClick={() => removeSlot(idx)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            <input
                              placeholder="Partner store name"
                              value={slot.partnerStoreName}
                              onChange={(e) => handleSlotChange(idx, 'partnerStoreName', e.target.value)}
                              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input
                                placeholder="Latitude"
                                type="number"
                                step="any"
                                value={slot.partnerStoreLat}
                                onChange={(e) => handleSlotChange(idx, 'partnerStoreLat', e.target.value)}
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                              />
                              <input
                                placeholder="Longitude"
                                type="number"
                                step="any"
                                value={slot.partnerStoreLng}
                                onChange={(e) => handleSlotChange(idx, 'partnerStoreLng', e.target.value)}
                                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                              />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-gray-400 mb-1 block">Start Time</label>
                                <input type="time" value={slot.startTime} onChange={(e) => handleSlotChange(idx, 'startTime', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 mb-1 block">End Time</label>
                                <input type="time" value={slot.endTime} onChange={(e) => handleSlotChange(idx, 'endTime', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setIsFormOpen(false)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
                    <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-5 py-2 rounded-lg transition">
                      {loading ? 'Saving...' : 'Save Schedule'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Schedules list */}
          {schedules.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
              No schedules found{filterStartDate || filterEndDate ? ` between ${filterStartDate || '...'} and ${filterEndDate || '...'}` : ''}.
            </div>
          ) : (
            <div className="space-y-4">
              {schedules.map((sched) => (
                <div key={sched._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
                    <div>
                      <p className="text-base font-semibold text-gray-800">{sched.staffId?.name || 'Unknown Staff'}</p>
                      <p className="text-xs text-gray-400">{sched.staffId?.email}</p>
                    </div>
                    <span className="text-sm text-gray-500 font-medium">{sched.date}</span>
                  </div>
                  <div className="space-y-2">
                    {sched.slots.map((slot, i) => (
                      <div key={slot._id || i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 text-sm">
                        <div>
                          <span className="font-medium text-gray-700">{slot.partnerStoreName}</span>
                          <span className="text-gray-400 ml-2">{slot.startTime} - {slot.endTime}</span>
                        </div>
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${slotStatusBadge[slot.attendanceStatus]}`}>
                          {slot.attendanceStatus.charAt(0).toUpperCase() + slot.attendanceStatus.slice(1)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ScheduleManagementPage;
