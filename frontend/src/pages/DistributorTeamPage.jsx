import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import TopNavbar from '../Components/TopNavbar';
import axiosInstance from '../lib/axios';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Components/Sidebar';

function DistributorTeamPage() {
  const { Authuser } = useSelector((state) => state.auth);
  const [staff, setStaff] = useState([]);
  const [schedules, setSchedules] = useState({});
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (!Authuser?._id) return;
    axiosInstance.get(`/auth/distributor/${Authuser._id}/staff`)
      .then(async (res) => {
        const members = res.data;
        setStaff(members);
        // Fetch today's schedule for each rounding staff member
        const scheduleMap = {};
        await Promise.all(
          members.map(async (m) => {
            try {
              const sres = await axiosInstance.get(`/schedule/staff/${m._id}?date=${today}`);
              scheduleMap[m._id] = sres.data?.[0] || null;
            } catch {
              scheduleMap[m._id] = null;
            }
          })
        );
        setSchedules(scheduleMap);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [Authuser, today]);

  const slotBadge = {
    present: 'bg-green-100 text-green-700',
    absent: 'bg-red-100 text-red-700',
    pending: 'bg-gray-100 text-gray-500'
  };

  const overallStatus = (sched) => {
    if (!sched || !sched.slots?.length) return { label: 'No Schedule', cls: 'bg-gray-100 text-gray-400' };
    const presentCount = sched.slots.filter(s => s.attendanceStatus === 'present').length;
    const absentCount = sched.slots.filter(s => s.attendanceStatus === 'absent').length;
    if (presentCount === sched.slots.length) return { label: 'All Stops Done', cls: 'bg-green-100 text-green-700' };
    if (absentCount > 0) return { label: `${absentCount} Stop(s) Missed`, cls: 'bg-red-100 text-red-700' };
    return { label: 'In Progress', cls: 'bg-blue-100 text-blue-700' };
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <TopNavbar />
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-semibold text-gray-800 mb-1">My Team</h1>
          <p className="text-sm text-gray-500 mb-6">
            View today's field activity and schedule status for each rounding staff member assigned to you.
          </p>

          {loading ? (
            <div className="text-center text-gray-400 text-sm py-12">Loading team data...</div>
          ) : staff.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-gray-400 text-sm">
              No rounding staff assigned to your account. Ask your admin to assign staff.
            </div>
          ) : (
            <div className="space-y-4">
              {staff.map((member) => {
                const sched = schedules[member._id];
                const status = overallStatus(sched);
                return (
                  <div key={member._id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                    <div className="flex items-start justify-between flex-wrap gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        {member.ProfilePic ? (
                          <img src={member.ProfilePic} alt={member.name} className="w-10 h-10 rounded-full object-cover" />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-500 text-base font-semibold">
                            {member.name?.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <p className="text-base font-semibold text-gray-800">{member.name}</p>
                          <p className="text-xs text-gray-400">{member.email}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-3 py-1 rounded-full ${status.cls}`}>
                        {status.label}
                      </span>
                    </div>

                    {sched?.slots?.length > 0 ? (
                      <div className="space-y-2 mt-3">
                        {sched.slots.map((slot, i) => (
                          <div key={slot._id || i} className="flex items-center justify-between bg-gray-50 rounded-lg px-4 py-2.5 text-sm">
                            <div>
                              <span className="font-medium text-gray-700">{slot.partnerStoreName}</span>
                              <span className="text-gray-400 ml-2 text-xs">{slot.startTime} - {slot.endTime}</span>
                            </div>
                            <span className={`text-xs font-medium px-2 py-1 rounded-full ${slotBadge[slot.attendanceStatus]}`}>
                              {slot.attendanceStatus.charAt(0).toUpperCase() + slot.attendanceStatus.slice(1)}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-gray-400 mt-2">No schedule set for today.</p>
                    )}
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

export default DistributorTeamPage;
