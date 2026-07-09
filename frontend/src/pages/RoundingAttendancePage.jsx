import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TopNavbar from '../Components/TopNavbar';
import { checkRoundingAttendance, fetchMySchedule, clearRoundingResult } from '../features/scheduleSlice';
import toast from 'react-hot-toast';

function RoundingAttendancePage() {
  const dispatch = useDispatch();
  const { mySchedule, roundingCheckInResult, loading } = useSelector((state) => state.schedule);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [locStatus, setLocStatus] = useState('idle');

  useEffect(() => {
    dispatch(fetchMySchedule(selectedDate));
    return () => dispatch(clearRoundingResult());
  }, [dispatch, selectedDate]);

  const handleCheckIn = () => {
    if (!navigator.geolocation) {
      toast.error('Your browser does not support location services.');
      return;
    }
    setLocStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocStatus('done');
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        dispatch(checkRoundingAttendance({ lat, lng })).then((res) => {
          if (res.meta.requestStatus === 'fulfilled') {
            const result = res.payload;
            if (result.success) {
              toast.success(result.message);
            } else {
              toast.error(result.message);
            }
            dispatch(fetchMySchedule(selectedDate));
          }
        });
      },
      (err) => {
        setLocStatus('error');
        toast.error(err.code === 1 ? 'Location access denied.' : 'Unable to get location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const slotStatusColor = {
    present: 'border-l-4 border-green-400 bg-green-50',
    absent: 'border-l-4 border-red-400 bg-red-50',
    pending: 'border-l-4 border-gray-200 bg-white'
  };

  const slotBadge = {
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    pending: 'bg-gray-100 text-gray-500'
  };

  const now = new Date();
  const currentHHMM = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const isToday = selectedDate === new Date().toISOString().split('T')[0];

  const activeSlot = mySchedule?.slots?.find(
    s => s.startTime <= currentHHMM && s.endTime > currentHHMM && isToday
  );

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopNavbar />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">My Schedule</h1>
          <p className="text-sm text-gray-500 mb-5">View your assigned stops for the day and submit your location to mark attendance at each stop.</p>

          <div className="flex items-center gap-3 mb-6">
            <label className="text-sm font-medium text-gray-600">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-300"
            />
          </div>

          {isToday && activeSlot && activeSlot.attendanceStatus === 'pending' && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <p className="text-sm text-blue-700 font-medium mb-1">Active Stop Right Now</p>
              <p className="text-base font-semibold text-gray-800 mb-3">{activeSlot.partnerStoreName}</p>
              <p className="text-xs text-gray-500 mb-4">{activeSlot.startTime} - {activeSlot.endTime}</p>
              <button
                onClick={handleCheckIn}
                disabled={loading || locStatus === 'requesting'}
                id="btn-rounding-checkin"
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
              >
                {locStatus === 'requesting' ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                    </svg>
                    Getting location...
                  </>
                ) : (
                  'Check In at This Stop'
                )}
              </button>
            </div>
          )}

          {!mySchedule ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
              No schedule assigned for this date.
            </div>
          ) : (
            <div className="space-y-3">
              {mySchedule.slots?.map((slot, i) => {
                const isPast = isToday && slot.endTime < currentHHMM;
                const isActive = isToday && slot.startTime <= currentHHMM && slot.endTime > currentHHMM;
                return (
                  <div
                    key={slot._id || i}
                    className={`rounded-xl shadow-sm p-4 transition ${slotStatusColor[slot.attendanceStatus]} ${isActive ? 'ring-2 ring-blue-400' : ''}`}
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div>
                        <p className="text-sm font-semibold text-gray-800">{slot.partnerStoreName}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{slot.startTime} - {slot.endTime}</p>
                        {slot.locationSnapshot?.lat && (
                          <p className="text-xs text-gray-400 mt-0.5">
                            Location: {slot.locationSnapshot.lat.toFixed(5)}, {slot.locationSnapshot.lng.toFixed(5)}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <span className={`text-xs font-medium px-2 py-1 rounded-full ${slotBadge[slot.attendanceStatus]}`}>
                          {slot.attendanceStatus.charAt(0).toUpperCase() + slot.attendanceStatus.slice(1)}
                        </span>
                        {slot.checkedInAt && (
                          <span className="text-xs text-gray-400">
                            at {new Date(slot.checkedInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {isActive && <span className="text-xs text-blue-500 font-medium">Current</span>}
                        {isPast && slot.attendanceStatus === 'pending' && (
                          <span className="text-xs text-red-400">Missed</span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default RoundingAttendancePage;
