import React, { useEffect, useState } from 'react';
import TopNavbar from '../Components/TopNavbar';
import axiosInstance from '../lib/axios';
import { useDispatch, useSelector } from 'react-redux';
import { fetchAllStores } from '../features/storeSlice';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AiOutlineDownload, AiOutlineReload } from 'react-icons/ai';
import toast from 'react-hot-toast';

function Reportpage() {
  const dispatch = useDispatch();
  const { Authuser } = useSelector((state) => state.auth);
  const { stores } = useSelector((state) => state.store);
  const isStaff = Authuser?.role === 'staff';
  const isAdminOrManager = Authuser?.role === 'admin' || Authuser?.role === 'manager';

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [groupBy, setGroupBy] = useState('daily');
  const [filterStoreId, setFilterStoreId] = useState('all');
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAdminOrManager) dispatch(fetchAllStores());
  }, [dispatch]);

  const fetchReport = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }
    setLoading(true);
    try {
      const params = { startDate, endDate, groupBy };
      // Staff are auto-scoped on the backend — no storeId needed
      if (isAdminOrManager && filterStoreId !== 'all') {
        params.storeId = filterStoreId;
      }

      const response = await axiosInstance.get(`/reports/sales`, {
        params,
        withCredentials: true
      });
      setReportData(response.data);
      toast.success("Report generated successfully");
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!reportData || !reportData.data.length) return;

    const headers = ["Date", "Transactions", "Revenue (NRs)"];
    const rows = reportData.data.map(item => [
      item.date,
      item.transactions,
      item.revenue
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `sales_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("CSV exported successfully");
  };

  const selectedStoreName = stores?.find(s => s._id === filterStoreId)?.name;

  return (
    <div className="bg-base-100 min-h-screen">
      <TopNavbar />
      <div className="p-8">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Sales Performance Report</h1>
          {isStaff && Authuser?.storeId && (
            <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-4 py-2 rounded-full border border-blue-200">
              📍 Report for: {Authuser.storeId?.name || 'Your Store'}
            </span>
          )}
          {isAdminOrManager && selectedStoreName && (
            <span className="text-sm font-semibold text-purple-700 bg-purple-50 px-4 py-2 rounded-full border border-purple-200">
              🏪 Filtered by: {selectedStoreName}
            </span>
          )}
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-8 flex flex-wrap items-end gap-6">
          {/* Store filter — admin/manager only */}
          {isAdminOrManager && (
            <div className="flex flex-col space-y-1">
              <label className="text-sm font-semibold text-gray-600">Store</label>
              <select
                value={filterStoreId}
                onChange={(e) => setFilterStoreId(e.target.value)}
                className="h-10 px-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="all">All Stores</option>
                {stores?.map(s => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
          )}
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-semibold text-gray-600">Start Date</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="h-10 px-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-semibold text-gray-600">End Date</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="h-10 px-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" 
            />
          </div>
          <div className="flex flex-col space-y-1">
            <label className="text-sm font-semibold text-gray-600">Group By</label>
            <select 
              value={groupBy} 
              onChange={(e) => setGroupBy(e.target.value)}
              className="h-10 px-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="daily">Daily</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
          <button 
            onClick={fetchReport}
            disabled={loading}
            className="bg-blue-600 text-white px-6 h-10 rounded-lg font-bold hover:bg-blue-700 transition flex items-center disabled:bg-gray-400"
          >
            {loading ? <AiOutlineReload className="animate-spin mr-2" /> : "Generate Report"}
          </button>
          
          {reportData && (
            <button 
              onClick={handleExportCSV}
              className="bg-green-600 text-white px-6 h-10 rounded-lg font-bold hover:bg-green-700 transition flex items-center"
            >
              <AiOutlineDownload className="mr-2 text-xl" /> Export to CSV
            </button>
          )}
        </div>

        {reportData ? (
          <div className="space-y-8">
            {/* Metrics Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
                <p className="text-blue-600 font-bold text-sm uppercase tracking-wider">Total Revenue</p>
                <p className="text-3xl font-black text-blue-900 mt-1">NRs {reportData.totalRevenue.toLocaleString()}</p>
              </div>
              <div className="bg-orange-50 p-6 rounded-xl border border-orange-100">
                <p className="text-orange-600 font-bold text-sm uppercase tracking-wider">Total Transactions</p>
                <p className="text-3xl font-black text-orange-900 mt-1">{reportData.totalTransactions}</p>
              </div>
            </div>

            {/* Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
              <h3 className="font-bold text-gray-700 mb-6">Revenue Trend</h3>
              <div className="h-96 w-full">
                <ResponsiveContainer width="100%" height="100%" minHeight={400} minWidth={400}>
                  <BarChart data={reportData.data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip 
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                      cursor={{ fill: '#f3f4f6' }}
                    />
                    <Legend />
                    <Bar dataKey="revenue" name="Revenue (NRs)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
              <table className="min-w-full whitespace-nowrap text-left">
                <thead className="bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Period</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Transactions</th>
                    <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Revenue (NRs)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {reportData.data.map((item, idx) => (
                    <tr key={idx} className="hover:bg-gray-50/50 transition-colors duration-150">
                      <td className="px-3 py-2.5 text-xs font-bold text-gray-800">{item.date}</td>
                      <td className="px-3 py-2.5 text-center text-xs font-medium text-gray-600">{item.transactions}</td>
                      <td className="px-3 py-2.5 text-right text-xs font-bold text-blue-600">Rs. {item.revenue.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        ) : (
          <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl p-20 text-center">
            <p className="text-gray-400 font-medium italic">Select a date range to generate your first report.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Reportpage;
