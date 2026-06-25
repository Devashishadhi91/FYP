import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import Gettopproduct from "../lib/Gettopproduct";
import TopNavbar from "../Components/TopNavbar";
import { LuClock, LuActivity, LuTrendingUp } from "react-icons/lu";
import { MdOutlineProductionQuantityLimits, MdMoney, MdErrorOutline } from "react-icons/md";
import { FiBox, FiX } from "react-icons/fi";
import { getrecentActivityLogs } from "../features/activitySlice";
import { getDashboardStats } from "../features/productSlice";
import { fetchAllStores } from "../features/storeSlice";
import FormattedTime from "../lib/FormattedTime ";
import socket from "../lib/socket";
import axiosInstance from "../lib/axios";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

function Dashboardpage() {
  const { recentuser } = useSelector((state) => state.activity);
  const { dashboardStats, isStatsLoading } = useSelector((state) => state.product);
  const { stores } = useSelector((state) => state.store);
  const { Authuser } = useSelector((state) => state.auth);
  const isStaff = Authuser?.role === 'staff';
  const isAdminOrManager = Authuser?.role === 'admin' || Authuser?.role === 'manager';

  const [filterStoreId, setFilterStoreId] = useState("all");
  const [revenueData, setRevenueData] = useState([]);
  const [currentMonth, setCurrentMonth] = useState({ revenue: 0, transactions: 0 });
  const [storeStats, setStoreStats] = useState(null);
  const [stockModal, setStockModal] = useState({ open: false, type: null });
  const [stockAlerts, setStockAlerts] = useState({ lowStock: [], outOfStock: [] });
  const [stockAlertsLoading, setStockAlertsLoading] = useState(false);
  const dispatch = useDispatch();

  useEffect(() => {
    if (isAdminOrManager) {
      dispatch(fetchAllStores());
    }
  }, [dispatch, isAdminOrManager]);

  useEffect(() => {
    dispatch(getrecentActivityLogs());
    dispatch(getDashboardStats(filterStoreId));

    const fetchMonthlySummary = async () => {
      try {
        const params = filterStoreId !== 'all' ? { storeId: filterStoreId } : {};
        const response = await axiosInstance.get("/sales/monthly-summary", { params, withCredentials: true });
        setRevenueData(response.data.summary);
        setCurrentMonth(response.data.currentMonth);
      } catch (error) {
        console.error("Error fetching monthly summary:", error);
      }
    };
    fetchMonthlySummary();

    // Fetch store-scoped KPI stats
    const fetchStoreStats = async () => {
      try {
        const params = filterStoreId !== 'all' ? { storeId: filterStoreId } : {};
        const response = await axiosInstance.get("/sales/store-stats", { params, withCredentials: true });
        setStoreStats(response.data);
      } catch (error) {
        console.error("Error fetching store stats:", error);
      }
    };
    fetchStoreStats();

    const handleNewLog = (newLog) => {
      console.log("New activity log:", newLog);
    };

    socket.on("newActivityLog", handleNewLog);

    return () => {
      socket.off("newActivityLog", handleNewLog);
    };
  }, [dispatch, filterStoreId]);

  const openStockModal = async (type) => {
    setStockModal({ open: true, type });
    setStockAlertsLoading(true);
    try {
      const params = filterStoreId !== 'all' ? { storeId: filterStoreId } : {};
      const response = await axiosInstance.get("/product/stock-alerts", { params, withCredentials: true });
      setStockAlerts({ lowStock: response.data.lowStock, outOfStock: response.data.outOfStock });
    } catch (error) {
      console.error("Error fetching stock alerts:", error);
    } finally {
      setStockAlertsLoading(false);
    }
  };

  const stats = [
    {
      label: "Total Products",
      value: dashboardStats?.totalProducts || 0,
      icon: <FiBox className="text-4xl text-blue-500 mb-2" />,
      color: "border-blue-500",
      clickable: false,
    },
    {
      label: "Low Stock Items",
      value: dashboardStats?.lowStockCount || 0,
      icon: <MdOutlineProductionQuantityLimits className="text-4xl text-orange-500 mb-2" />,
      color: "border-orange-500",
      clickable: true,
      modalType: "lowStock",
    },
    {
      label: "Out of Stock",
      value: dashboardStats?.outOfStockCount || 0,
      icon: <MdErrorOutline className="text-4xl text-red-500 mb-2" />,
      color: "border-red-500",
      clickable: true,
      modalType: "outOfStock",
    },
    {
      label: "Inventory Value",
      value: `Rs. ${dashboardStats?.totalInventoryValue?.toLocaleString() || 0}`,
      icon: <MdMoney className="text-4xl text-green-500 mb-2" />,
      color: "border-green-500",
      clickable: false,
    }
  ];

  const modalProducts = stockModal.type === "lowStock" ? stockAlerts.lowStock : stockAlerts.outOfStock;
  const modalTitle = stockModal.type === "lowStock" ? "Low Stock Items" : "Out of Stock Items";
  const modalAccent = stockModal.type === "lowStock"
    ? { bg: "bg-orange-50", text: "text-orange-600", border: "border-orange-200", badge: "bg-orange-100 text-orange-700", dot: "bg-orange-500" }
    : { bg: "bg-red-50", text: "text-red-600", border: "border-red-200", badge: "bg-red-100 text-red-700", dot: "bg-red-500" };

  return (
    <div className="bg-gray-50 min-h-screen">
      <TopNavbar />
      <div className="p-8">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-gray-800">Executive Overview</h1>
          {Authuser?.role === 'admin' ? (
            <div className="flex items-center space-x-3">
              <label className="text-sm font-bold text-gray-600">Store Filter:</label>
              <select
                value={filterStoreId}
                onChange={(e) => setFilterStoreId(e.target.value)}
                className="h-10 px-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white shadow-sm"
              >
                <option value="all">All Stores</option>
                {stores?.map((s) => (
                  <option key={s._id} value={s._id}>{s.name}</option>
                ))}
              </select>
            </div>
          ) : Authuser?.storeId && (
            <span className="text-sm font-semibold text-blue-700 bg-blue-50 px-4 py-2 rounded-full border border-blue-200 flex items-center">
              📍 {Authuser.storeId?.name || Authuser.storeId} — Location Dashboard
            </span>
          )}
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, idx) => (
            <div
              key={idx}
              onClick={stat.clickable ? () => openStockModal(stat.modalType) : undefined}
              className={`bg-white shadow-md rounded-2xl p-6 border-b-4 ${stat.color} flex flex-col items-center justify-center transition-transform hover:scale-105 hover:shadow-lg ${stat.clickable ? 'cursor-pointer group' : ''}`}
            >
              {stat.icon}
              <p className="text-2xl font-black text-gray-800">{isStatsLoading ? "..." : stat.value}</p>
              <p className="text-gray-500 font-bold text-sm uppercase tracking-wider">{stat.label}</p>
              {stat.clickable && (
                <p className="text-[10px] text-gray-400 mt-1 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">Click to view details</p>
              )}
            </div>
          ))}
        </div>

        {/* Store Sales KPIs — visible to all roles, scoped to their store on backend */}
        {storeStats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-white shadow-md rounded-2xl p-6 border-b-4 border-blue-500 flex flex-col items-center justify-center">
              <p className="text-2xl font-black text-gray-800">{storeStats.totalSales}</p>
              <p className="text-gray-500 font-bold text-sm uppercase tracking-wider">{isStaff ? 'My Store Sales' : 'Total Sales'}</p>
            </div>
            <div className="bg-white shadow-md rounded-2xl p-6 border-b-4 border-green-500 flex flex-col items-center justify-center">
              <p className="text-2xl font-black text-gray-800">Rs. {storeStats.totalRevenue?.toLocaleString()}</p>
              <p className="text-gray-500 font-bold text-sm uppercase tracking-wider">{isStaff ? 'My Store Revenue' : 'Total Revenue'}</p>
            </div>
            <div className="bg-white shadow-md rounded-2xl p-6 border-b-4 border-red-500 flex flex-col items-center justify-center">
              <p className="text-2xl font-black text-gray-800">Rs. {storeStats.pendingAmount?.toLocaleString()}</p>
              <p className="text-gray-500 font-bold text-sm uppercase tracking-wider">Pending Amount</p>
            </div>
          </div>
        )}

        {/* Revenue Trend Section */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
            <div>
              <h2 className="text-xl font-bold text-gray-800 flex items-center">
                <LuTrendingUp className="mr-2 text-blue-600" /> Revenue Trend (Last 12 Months)
              </h2>
              <p className="text-sm text-gray-500 font-medium">Monthly sales performance overview</p>
            </div>
            <div className="flex space-x-6">
              <div className="text-right">
                <p className="text-[10px] font-bold text-gray-400 uppercase">This Month Revenue</p>
                <p className="text-lg font-black text-blue-600">Rs. {currentMonth.revenue.toLocaleString()}</p>
              </div>
              <div className="text-right border-l pl-6">
                <p className="text-[10px] font-bold text-gray-400 uppercase">This Month Sales</p>
                <p className="text-lg font-black text-gray-800">{currentMonth.transactions}</p>
              </div>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%" minWidth={400} minHeight={300}>
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
          {/* Top Products Chart Section */}
          <div className="xl:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Stock Distribution</h2>
            <Gettopproduct storeId={filterStoreId} />
          </div>

          {/* Recent Activity Section */}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-gray-800 mb-6">Recent Activity</h2>
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
              {recentuser?.length > 0 ? (
                recentuser.map((logs) => (
                  <div
                    key={logs._id}
                    className="flex items-start space-x-4 p-4 border rounded-xl hover:bg-gray-50 transition"
                  >
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <LuActivity className="text-blue-600 text-xl" />
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-gray-800">{logs.userId.name || "System"}</h3>
                      <p className="text-xs text-gray-600">{logs.action}</p>
                      <div className="flex items-center space-x-1 mt-2 text-[10px] text-gray-400 font-bold uppercase">
                        <LuClock />
                        <FormattedTime timestamp={logs.createdAt} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-400 py-10 italic">No recent activity detected.</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Stock Alerts Modal */}
      {stockModal.open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center"
          onClick={() => setStockModal({ open: false, type: null })}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

          {/* Modal */}
          <div
            className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[80vh] flex flex-col overflow-hidden animate-[modalIn_0.25s_ease-out]"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className={`flex items-center justify-between px-6 py-4 border-b ${modalAccent.border} ${modalAccent.bg}`}>
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${modalAccent.dot} animate-pulse`} />
                <h2 className={`text-lg font-bold ${modalAccent.text}`}>{modalTitle}</h2>
                <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${modalAccent.badge}`}>
                  {stockAlertsLoading ? '...' : modalProducts.length} items
                </span>
              </div>
              <button
                onClick={() => setStockModal({ open: false, type: null })}
                className="p-1.5 rounded-lg hover:bg-white/80 transition text-gray-500 hover:text-gray-800"
              >
                <FiX className="text-xl" />
              </button>
            </div>

            {/* Table */}
            <div className="overflow-y-auto flex-1 p-4">
              {stockAlertsLoading ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-3">
                  <div className="w-8 h-8 border-[3px] border-gray-300 border-t-blue-500 rounded-full animate-spin" />
                  <p className="text-sm text-gray-400 font-semibold">Loading products...</p>
                </div>
              ) : modalProducts.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 space-y-2">
                  <p className="text-sm font-bold text-gray-600">No {stockModal.type === 'lowStock' ? 'low stock' : 'out of stock'} items!</p>
                  <p className="text-xs text-gray-400">All inventory levels look healthy.</p>
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs font-bold text-gray-400 uppercase tracking-wider border-b">
                      <th className="pb-3 pl-3">#</th>
                      <th className="pb-3">Product Name</th>
                      <th className="pb-3">Category</th>
                      <th className="pb-3 text-center">Qty</th>
                      <th className="pb-3 text-right pr-3">MRP</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modalProducts.map((product, idx) => (
                      <tr
                        key={product._id || idx}
                        className="border-b border-gray-50 hover:bg-gray-50/80 transition"
                      >
                        <td className="py-3 pl-3 text-gray-400 font-semibold">{idx + 1}</td>
                        <td className="py-3 font-semibold text-gray-800 max-w-[200px] truncate" title={product.name}>
                          {product.name}
                        </td>
                        <td className="py-3">
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-md">
                            {product.Category || '—'}
                          </span>
                        </td>
                        <td className="py-3 text-center">
                          <span className={`inline-block min-w-[36px] text-center text-xs font-bold px-2 py-1 rounded-full ${product.quantity === 0
                              ? 'bg-red-100 text-red-700'
                              : 'bg-orange-100 text-orange-700'
                            }`}>
                            {product.quantity}
                          </span>
                        </td>
                        <td className="py-3 text-right pr-3 font-semibold text-gray-700">
                          Rs. {(product.MRP || product.Price || 0).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal animation keyframes */}
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
}

export default Dashboardpage;