import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TopNavbar from '../Components/TopNavbar';
import { checkInAttendance, fetchMyAttendance, clearCheckInResult } from '../features/attendanceSlice';
import toast from 'react-hot-toast';

function AttendancePage() {
  const dispatch = useDispatch();
  const { myAttendance, checkInResult, loading } = useSelector((state) => state.attendance);
  const { Authuser } = useSelector((state) => state.auth);

  const [locStatus, setLocStatus] = useState('idle'); // idle | requesting | done | error
  const [todayRecord, setTodayRecord] = useState(null);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    dispatch(fetchMyAttendance());
    return () => dispatch(clearCheckInResult());
  }, [dispatch]);

  useEffect(() => {
    if (myAttendance && myAttendance.length > 0) {
      const record = myAttendance.find(r => r.date === today);
      setTodayRecord(record || null);
    }
  }, [myAttendance, today]);

  const handleCheckIn = () => {
    if (!navigator.geolocation) {
      toast.error('Your browser does not support location services.');
      return;
    }

    setLocStatus('requesting');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setLocStatus('done');
        dispatch(checkInAttendance({ lat, lng })).then((res) => {
          if (res.meta.requestStatus === 'fulfilled') {
            const result = res.payload;
            if (result.success) {
              toast.success(result.message);
            } else {
              toast.error(result.message);
            }
            dispatch(fetchMyAttendance());
          }
        });
      },
      (err) => {
        setLocStatus('error');
        if (err.code === 1) {
          toast.error('Location access denied. Please allow location access in your browser settings.');
        } else {
          toast.error('Unable to retrieve your location. Try again.');
        }
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const statusColor = {
    present: 'bg-green-100 text-green-700 border-green-200',
    absent: 'bg-red-100 text-red-700 border-red-200',
    pending: 'bg-yellow-100 text-yellow-700 border-yellow-200'
  };

  const statusLabel = {
    present: 'Present',
    absent: 'Absent — Not In Premises',
    pending: 'Pending'
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopNavbar />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">Attendance</h1>
          <p className="text-sm text-gray-500 mb-6">
            Your attendance is recorded using your device location. Make sure you are inside the store premises before checking in.
          </p>

          {/* Today's check-in card */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 mb-6">
            <div className="flex items-start justify-between flex-wrap gap-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Today</p>
                <p className="text-lg font-medium text-gray-700">
                  {new Date().toLocaleDateString('en-GB', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              </div>

              {todayRecord ? (
                <span className={`text-sm font-medium px-4 py-2 rounded-full border ${statusColor[todayRecord.status]}`}>
                  {statusLabel[todayRecord.status]}
                  {todayRecord.checkedInAt && (
                    <span className="ml-2 text-xs opacity-70">
                      at {new Date(todayRecord.checkedInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </span>
              ) : (
                <span className="text-sm text-gray-400 border border-gray-200 px-4 py-2 rounded-full">Not checked in yet</span>
              )}
            </div>

            {!todayRecord && (
              <div className="mt-5">
                <button
                  onClick={handleCheckIn}
                  disabled={loading || locStatus === 'requesting'}
                  id="btn-checkin"
                  className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white text-sm font-medium px-6 py-3 rounded-lg transition"
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
                    'Check In'
                  )}
                </button>
                <p className="text-xs text-gray-400 mt-2">
                  Your browser will ask for location permission. This is required for attendance tracking.
                </p>
              </div>
            )}

            {todayRecord && todayRecord.locationSnapshot?.lat && (
              <p className="text-xs text-gray-400 mt-3">
                Location recorded: {todayRecord.locationSnapshot.lat.toFixed(5)}, {todayRecord.locationSnapshot.lng.toFixed(5)}
              </p>
            )}
          </div>

          {/* Attendance history */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
            <div className="px-6 py-4 border-b border-gray-100">
              <h2 className="text-base font-medium text-gray-700">Attendance History</h2>
            </div>
            {myAttendance.length === 0 ? (
              <div className="px-6 py-10 text-center text-gray-400 text-sm">No attendance records found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
                    <th className="text-left px-6 py-3">Date</th>
                    <th className="text-left px-6 py-3">Status</th>
                    <th className="text-left px-6 py-3">Checked In At</th>
                    <th className="text-left px-6 py-3">Store</th>
                  </tr>
                </thead>
                <tbody>
                  {myAttendance.map((record) => (
                    <tr key={record._id} className="border-b border-gray-50 hover:bg-gray-50 transition">
                      <td className="px-6 py-3 text-gray-700 font-medium">{record.date}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${statusColor[record.status]}`}>
                          {statusLabel[record.status]}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {record.checkedInAt
                          ? new Date(record.checkedInAt).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
                          : '-'}
                      </td>
                      <td className="px-6 py-3 text-gray-500">{record.storeId?.name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default AttendancePage;
