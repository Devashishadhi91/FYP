import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TopNavbar from '../Components/TopNavbar';
import {
  createSchedule,
  fetchManagerSchedules,
  fetchAllSchedules,
  updateSchedule,
  deleteSchedule
} from '../features/scheduleSlice';
import axiosInstance from '../lib/axios';
import toast from 'react-hot-toast';

const emptySlot = () => ({
  partnerStoreName: '',
  partnerStoreLat: '',
  partnerStoreLng: '',
  startTime: '',
  endTime: ''
});

const PAGE_SIZE = 5;

function ScheduleManagementPage() {
  const dispatch = useDispatch();
  const { Authuser } = useSelector((state) => state.auth);
  const { managerSchedules, allSchedules, loading } = useSelector((state) => state.schedule);

  const [roundingStaff, setRoundingStaff] = useState([]);

  // --- Create form ---
  const [form, setForm] = useState({
    staffId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    slots: [emptySlot()]
  });
  const [isFormOpen, setIsFormOpen] = useState(false);

  // --- Edit modal ---
  const [editingSchedule, setEditingSchedule] = useState(null);
  const [editSlots, setEditSlots] = useState([]);
  const [editDate, setEditDate] = useState('');

  // --- Delete confirm ---
  const [deletingId, setDeletingId] = useState(null);

  // --- Filters ---
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterStaffId, setFilterStaffId] = useState('');

  // --- Pagination ---
  const [currentPage, setCurrentPage] = useState(1);

  const isAdmin = Authuser?.role === 'admin';

  const refetchSchedules = useCallback(() => {
    const params = { startDate: filterStartDate, endDate: filterEndDate, staffId: filterStaffId };
    if (isAdmin) {
      dispatch(fetchAllSchedules(params));
    } else {
      dispatch(fetchManagerSchedules(params));
    }
  }, [dispatch, filterStartDate, filterEndDate, filterStaffId, isAdmin]);

  useEffect(() => {
    refetchSchedules();
    axiosInstance.get('/auth/rounding-staff').then(res => setRoundingStaff(res.data)).catch(() => {});
  }, [refetchSchedules]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [filterStartDate, filterEndDate, filterStaffId]);

  // --- Create form handlers ---
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
      setForm({
        staffId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0],
        slots: [emptySlot()]
      });
      refetchSchedules();
    });
  };

  // --- Edit handlers ---
  const openEdit = (sched) => {
    setEditingSchedule(sched);
    setEditDate(sched.date);
    setEditSlots(sched.slots.map(s => ({
      partnerStoreName: s.partnerStoreName,
      partnerStoreLat: String(s.partnerStoreLat),
      partnerStoreLng: String(s.partnerStoreLng),
      startTime: s.startTime,
      endTime: s.endTime,
      attendanceStatus: s.attendanceStatus,
      _id: s._id
    })));
  };

  const handleEditSlotChange = (idx, field, value) => {
    setEditSlots(prev => {
      const slots = [...prev];
      slots[idx] = { ...slots[idx], [field]: value };
      return slots;
    });
  };

  const addEditSlot = () => setEditSlots(prev => [...prev, { ...emptySlot(), attendanceStatus: 'pending' }]);
  const removeEditSlot = (idx) => setEditSlots(prev => prev.filter((_, i) => i !== idx));

  const handleEditSubmit = (e) => {
    e.preventDefault();
    for (const slot of editSlots) {
      if (!slot.partnerStoreName || !slot.partnerStoreLat || !slot.partnerStoreLng || !slot.startTime || !slot.endTime) {
        toast.error('All slot fields are required.');
        return;
      }
      if (slot.startTime >= slot.endTime) {
        toast.error('End time must be after start time for each slot.');
        return;
      }
    }
    const slots = editSlots.map(s => ({
      ...s,
      partnerStoreLat: parseFloat(s.partnerStoreLat),
      partnerStoreLng: parseFloat(s.partnerStoreLng)
    }));
    dispatch(updateSchedule({ id: editingSchedule._id, data: { slots, date: editDate } })).then(() => {
      setEditingSchedule(null);
    });
  };

  // --- Delete handler ---
  const handleDelete = () => {
    if (!deletingId) return;
    dispatch(deleteSchedule(deletingId)).then(() => {
      setDeletingId(null);
    });
  };

  const schedules = isAdmin ? allSchedules : managerSchedules;

  // --- Pagination ---
  const totalPages = Math.max(1, Math.ceil(schedules.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedSchedules = schedules.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  // Status badge helper
  const slotStatusBadge = (status) => {
    if (status === 'present') return 'bg-green-100 text-green-700 border border-green-200';
    if (status === 'absent') return 'bg-red-100 text-red-700 border border-red-200';
    return 'bg-red-50 text-red-500 border border-red-100'; // pending → red
  };

  const slotStatusLabel = (status) => {
    if (status === 'present') return 'Visited';
    if (status === 'absent') return 'Absent';
    return 'Pending';
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopNavbar />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-5xl mx-auto">

          {/* Header */}
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
              + Create Schedule
            </button>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex flex-wrap items-end gap-3">
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1">From</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
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
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <div className="flex flex-col">
              <label className="text-xs font-semibold text-gray-500 uppercase mb-1">Staff</label>
              <select
                value={filterStaffId}
                onChange={(e) => setFilterStaffId(e.target.value)}
                className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300 min-w-[160px]"
              >
                <option value="">All Staff</option>
                {roundingStaff.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
            {(filterStartDate || filterEndDate || filterStaffId) && (
              <button
                onClick={() => { setFilterStartDate(''); setFilterEndDate(''); setFilterStaffId(''); }}
                className="text-sm text-gray-400 hover:text-gray-600 self-end pb-2"
              >
                Clear Filters
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
                              <input placeholder="Latitude" type="number" step="any" value={slot.partnerStoreLat} onChange={(e) => handleSlotChange(idx, 'partnerStoreLat', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                              <input placeholder="Longitude" type="number" step="any" value={slot.partnerStoreLng} onChange={(e) => handleSlotChange(idx, 'partnerStoreLng', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300" />
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

          {/* Edit Schedule Modal */}
          {editingSchedule && (
            <div className="fixed inset-0 bg-black/30 z-50 flex items-start justify-center pt-10 px-4" onClick={() => setEditingSchedule(null)}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl p-6 max-h-[85vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-lg font-semibold text-gray-800 mb-1">Edit Schedule</h2>
                <p className="text-xs text-gray-400 mb-4">Staff: <span className="font-medium text-gray-600">{editingSchedule.staffId?.name}</span></p>
                <form onSubmit={handleEditSubmit} className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-medium text-gray-600">Stops / Time Slots</label>
                      <button type="button" onClick={addEditSlot} className="text-xs text-blue-600 hover:text-blue-700 font-medium">+ Add Stop</button>
                    </div>
                    <div className="space-y-3">
                      {editSlots.map((slot, idx) => (
                        <div key={idx} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-medium text-gray-500">Stop {idx + 1}</span>
                            {editSlots.length > 1 && (
                              <button type="button" onClick={() => removeEditSlot(idx)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                            )}
                          </div>
                          <div className="grid grid-cols-1 gap-2">
                            <input
                              placeholder="Partner store name"
                              value={slot.partnerStoreName}
                              onChange={(e) => handleEditSlotChange(idx, 'partnerStoreName', e.target.value)}
                              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <input placeholder="Latitude" type="number" step="any" value={slot.partnerStoreLat} onChange={(e) => handleEditSlotChange(idx, 'partnerStoreLat', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                              <input placeholder="Longitude" type="number" step="any" value={slot.partnerStoreLng} onChange={(e) => handleEditSlotChange(idx, 'partnerStoreLng', e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-xs text-gray-400 mb-1 block">Start Time</label>
                                <input type="time" value={slot.startTime} onChange={(e) => handleEditSlotChange(idx, 'startTime', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                              </div>
                              <div>
                                <label className="text-xs text-gray-400 mb-1 block">End Time</label>
                                <input type="time" value={slot.endTime} onChange={(e) => handleEditSlotChange(idx, 'endTime', e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 pt-2">
                    <button type="button" onClick={() => setEditingSchedule(null)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
                    <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-5 py-2 rounded-lg transition">
                      {loading ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Delete Confirm Modal */}
          {deletingId && (
            <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center px-4" onClick={() => setDeletingId(null)}>
              <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6" onClick={(e) => e.stopPropagation()}>
                <h2 className="text-base font-semibold text-gray-800 mb-2">Delete Schedule?</h2>
                <p className="text-sm text-gray-500 mb-5">This action cannot be undone. The schedule and all its slots will be permanently removed.</p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setDeletingId(null)} className="text-sm text-gray-500 hover:text-gray-700 px-4 py-2">Cancel</button>
                  <button
                    onClick={handleDelete}
                    disabled={loading}
                    className="bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-medium px-5 py-2 rounded-lg transition"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Schedules list */}
          {schedules.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
              No schedules found{filterStartDate || filterEndDate || filterStaffId ? ' for the selected filters' : ''}.
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedSchedules.map((sched) => (
                  <div key={sched._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-start justify-between flex-wrap gap-2 mb-4">
                      <div>
                        <p className="text-base font-semibold text-gray-800">{sched.staffId?.name || 'Unknown Staff'}</p>
                        <p className="text-xs text-gray-400">{sched.staffId?.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-500 font-medium">{sched.date}</span>
                        <button
                          onClick={() => openEdit(sched)}
                          id={`btn-edit-${sched._id}`}
                          title="Edit Schedule"
                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 hover:text-blue-700 transition"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => setDeletingId(sched._id)}
                          id={`btn-delete-${sched._id}`}
                          title="Delete Schedule"
                          className="p-1.5 rounded-lg hover:bg-red-50 text-red-400 hover:text-red-600 transition"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      {sched.slots.map((slot, i) => (
                        <div key={slot._id || i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 text-sm">
                          <div>
                            <span className="font-medium text-gray-700">{slot.partnerStoreName}</span>
                            <span className="text-gray-400 ml-2">{slot.startTime} – {slot.endTime}</span>
                          </div>
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${slotStatusBadge(slot.attendanceStatus)}`}>
                            {slotStatusLabel(slot.attendanceStatus)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 flex-wrap gap-2">
                  <p className="text-xs text-gray-500">
                    Showing {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, schedules.length)} of {schedules.length} schedules
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={safePage === 1}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      ← Prev
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1.5 text-sm rounded-lg border transition ${
                          page === safePage
                            ? 'bg-blue-600 text-white border-blue-600 font-semibold'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                      disabled={safePage === totalPages}
                      className="px-3 py-1.5 text-sm rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed transition"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              )}
            </>
          )}

        </div>
      </div>
    </div>
  );
}

export default ScheduleManagementPage;
