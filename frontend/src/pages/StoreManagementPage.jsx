import React, { useEffect, useState } from "react";
import TopNavbar from "../Components/TopNavbar";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAllStores,
  createStore,
  updateStore,
  deleteStore,
  assignStaffToStore,
  unassignStaff,
  fetchStoreStaff,
  fetchUnassignedStaff,
  fetchStoreReportSummary,
} from "../features/storeSlice";
import toast from "react-hot-toast";
import {
  FiPlus, FiTrash2, FiEdit2, FiUsers, FiMapPin,
  FiBarChart2, FiX, FiUserMinus, FiUserPlus, FiPhone
} from "react-icons/fi";
import { MdStorefront } from "react-icons/md";

function StoreManagementPage() {
  const dispatch = useDispatch();
  const { stores, storeStaff, unassignedStaff, storeReportSummary, isLoading } = useSelector((s) => s.store);
  const { Authuser } = useSelector((s) => s.auth);
  const isAdmin = Authuser?.role === "admin";

  const [activeTab, setActiveTab] = useState("stores");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingStore, setEditingStore] = useState(null);
  const [selectedStore, setSelectedStore] = useState(null); // store object for staff panel
  const [formData, setFormData] = useState({ name: "", address: "", contactNumber: "" });
  const [assignUserId, setAssignUserId] = useState("");

  useEffect(() => {
    dispatch(fetchAllStores());
    dispatch(fetchStoreReportSummary());
    dispatch(fetchUnassignedStaff());
  }, [dispatch]);

  const openStaffPanel = (store) => {
    setSelectedStore(store);
    dispatch(fetchStoreStaff(store._id));
    dispatch(fetchUnassignedStaff());
    setAssignUserId("");
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(createStore(formData)).unwrap();
      toast.success("Store created!");
      setShowCreateForm(false);
      setFormData({ name: "", address: "", contactNumber: "" });
      dispatch(fetchAllStores());
    } catch (err) {
      toast.error(err || "Failed to create store");
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await dispatch(updateStore({ storeId: editingStore._id, data: formData })).unwrap();
      toast.success("Store updated!");
      setEditingStore(null);
      setFormData({ name: "", address: "", contactNumber: "" });
      dispatch(fetchAllStores());
    } catch (err) {
      toast.error(err || "Failed to update store");
    }
  };

  const handleDelete = async (storeId, storeName) => {
    if (!window.confirm(`Delete "${storeName}"? All assigned staff will be unassigned.`)) return;
    try {
      await dispatch(deleteStore(storeId)).unwrap();
      toast.success("Store deleted");
      if (selectedStore?._id === storeId) setSelectedStore(null);
      dispatch(fetchAllStores());
    } catch (err) {
      toast.error(err || "Failed to delete store");
    }
  };

  const handleEditClick = (store) => {
    setEditingStore(store);
    setShowCreateForm(false);
    setFormData({ name: store.name, address: store.address, contactNumber: store.contactNumber || "" });
  };

  const handleAssign = async (e) => {
    e.preventDefault();
    if (!assignUserId) { toast.error("Please select a staff member"); return; }
    try {
      const result = await dispatch(assignStaffToStore({ userId: assignUserId, storeId: selectedStore._id })).unwrap();
      toast.success(result.message);
      setAssignUserId("");
      dispatch(fetchStoreStaff(selectedStore._id));
      dispatch(fetchUnassignedStaff());
      dispatch(fetchAllStores());
    } catch (err) {
      toast.error(err || "Failed to assign staff");
    }
  };

  const handleUnassign = async (userId, userName) => {
    if (!window.confirm(`Remove ${userName} from this store?`)) return;
    try {
      const result = await dispatch(unassignStaff(userId)).unwrap();
      toast.success(result.message);
      dispatch(fetchStoreStaff(selectedStore._id));
      dispatch(fetchUnassignedStaff());
      dispatch(fetchAllStores());
    } catch (err) {
      toast.error(err || "Failed to unassign staff");
    }
  };

  const StoreFormFields = (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div>
        <label className="text-sm font-semibold text-gray-600 block mb-1">Store Name *</label>
        <input
          type="text"
          value={formData.name}
          required
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="w-full h-10 px-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="e.g. Downtown Branch"
        />
      </div>
      <div>
        <label className="text-sm font-semibold text-gray-600 block mb-1">Contact Number</label>
        <input
          type="text"
          value={formData.contactNumber}
          onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
          className="w-full h-10 px-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="e.g. 9800000000"
        />
      </div>
      <div className="md:col-span-2">
        <label className="text-sm font-semibold text-gray-600 block mb-1">Address *</label>
        <input
          type="text"
          value={formData.address}
          required
          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          className="w-full h-10 px-3 border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
          placeholder="e.g. New Road, Kathmandu"
        />
      </div>
    </div>
  );

  return (
    <div className="bg-gray-50 min-h-screen">
      <TopNavbar />
      <div className="p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 flex items-center">
              <MdStorefront className="mr-3 text-blue-600 text-4xl" /> Store Management
            </h1>
            <p className="text-gray-500 mt-1 text-sm">Manage store locations and assign staff to each branch</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setActiveTab("stores")}
              className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${activeTab === "stores" ? "bg-blue-600 text-white shadow" : "bg-white text-gray-700 border hover:bg-gray-50"}`}
            >
              <FiMapPin className="inline mr-1" /> Stores
            </button>
            <button
              onClick={() => { setActiveTab("report"); dispatch(fetchStoreReportSummary()); }}
              className={`px-4 py-2 rounded-lg font-semibold transition text-sm ${activeTab === "report" ? "bg-blue-600 text-white shadow" : "bg-white text-gray-700 border hover:bg-gray-50"}`}
            >
              <FiBarChart2 className="inline mr-1" /> Reports
            </button>
          </div>
        </div>

        {/* ── STORES TAB ── */}
        {activeTab === "stores" && (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Left: Store List */}
            <div className="xl:col-span-2 space-y-6">
              {/* Create Form */}
              {showCreateForm && !editingStore && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">➕ Create New Store</h2>
                  <form onSubmit={handleCreateSubmit} className="space-y-4">
                    {StoreFormFields}
                    <div className="flex space-x-3">
                      <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                        Create Store
                      </button>
                      <button
                        type="button"
                        onClick={() => { setShowCreateForm(false); setFormData({ name: "", address: "", contactNumber: "" }); }}
                        className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-200 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Edit Form */}
              {editingStore && (
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                  <h2 className="text-lg font-bold text-gray-800 mb-4">✏️ Edit Store</h2>
                  <form onSubmit={handleEditSubmit} className="space-y-4">
                    {StoreFormFields}
                    <div className="flex space-x-3">
                      <button type="submit" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
                        Save Changes
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingStore(null); setFormData({ name: "", address: "", contactNumber: "" }); }}
                        className="bg-gray-100 text-gray-700 px-6 py-2 rounded-lg font-semibold hover:bg-gray-200 transition"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Add Store button — admin only */}
              {isAdmin && !showCreateForm && !editingStore && (
                <button
                  onClick={() => { setShowCreateForm(true); setEditingStore(null); }}
                  className="bg-blue-600 text-white px-5 py-2 rounded-lg font-semibold hover:bg-blue-700 transition flex items-center text-sm"
                >
                  <FiPlus className="mr-2" /> Add New Store
                </button>
              )}

              {/* Store Cards */}
              {isLoading ? (
                <div className="text-center py-16 text-gray-400 italic">Loading stores...</div>
              ) : stores.length === 0 ? (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-20 text-center">
                  <MdStorefront className="text-6xl text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 italic">No stores yet. {isAdmin ? 'Click "Add New Store" to create one.' : ''}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {stores.map((store) => (
                    <div
                      key={store._id}
                      onClick={() => openStaffPanel(store)}
                      className={`bg-white rounded-2xl shadow-sm border-2 cursor-pointer p-5 hover:shadow-md transition group ${selectedStore?._id === store._id ? "border-blue-500 bg-blue-50" : "border-gray-100 hover:border-blue-200"}`}
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex-1">
                          <h3 className="text-base font-bold text-gray-800 group-hover:text-blue-700 transition">
                            {store.name}
                          </h3>
                          <p className="text-xs text-gray-500 flex items-center mt-1">
                            <FiMapPin className="mr-1 text-blue-400 flex-shrink-0" /> {store.address}
                          </p>
                          {store.contactNumber && (
                            <p className="text-xs text-gray-500 flex items-center mt-1">
                              <FiPhone className="mr-1 text-green-400 flex-shrink-0" /> {store.contactNumber}
                            </p>
                          )}
                        </div>
                        <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-1 rounded-full ml-2 flex-shrink-0">
                          <FiUsers className="inline mr-1" />{store.staffCount || 0} staff
                        </span>
                      </div>
                      {isAdmin && (
                        <div className="flex space-x-2 mt-3 pt-3 border-t border-gray-100" onClick={(e) => e.stopPropagation()}>
                          <button
                            onClick={() => handleEditClick(store)}
                            className="flex-1 bg-blue-50 text-blue-700 py-1.5 rounded-lg text-xs font-semibold hover:bg-blue-100 transition flex items-center justify-center"
                          >
                            <FiEdit2 className="mr-1" /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(store._id, store.name)}
                            className="flex-1 bg-red-50 text-red-600 py-1.5 rounded-lg text-xs font-semibold hover:bg-red-100 transition flex items-center justify-center"
                          >
                            <FiTrash2 className="mr-1" /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Staff Panel */}
            <div className="xl:col-span-1">
              {selectedStore ? (
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 sticky top-8">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-bold text-gray-800 flex items-center">
                      <FiUsers className="mr-2 text-purple-600" />
                      {selectedStore.name}
                    </h2>
                    <button onClick={() => setSelectedStore(null)} className="text-gray-400 hover:text-gray-600">
                      <FiX />
                    </button>
                  </div>

                  {/* Assign Staff Form */}
                  <form onSubmit={handleAssign} className="mb-5 pb-5 border-b border-gray-100">
                    <label className="text-xs font-bold text-gray-500 uppercase mb-2 block">Assign Staff</label>
                    <div className="flex space-x-2">
                      <select
                        value={assignUserId}
                        onChange={(e) => setAssignUserId(e.target.value)}
                        className="flex-1 h-9 px-2 border rounded-lg text-sm focus:ring-2 focus:ring-purple-400 outline-none"
                      >
                        <option value="">-- Select staff --</option>
                        {/* Show all staff — both unassigned and already assigned (manager can reassign) */}
                        {Array.isArray(unassignedStaff) && unassignedStaff.map((u) => (
                          <option key={u._id} value={u._id}>
                            {u.name} ({u.email}) — unassigned
                          </option>
                        ))}
                      </select>
                      <button type="submit" className="bg-purple-600 text-white px-3 rounded-lg text-sm font-semibold hover:bg-purple-700 transition flex items-center">
                        <FiUserPlus />
                      </button>
                    </div>
                    {unassignedStaff.length === 0 && (
                      <p className="text-xs text-gray-400 italic mt-1">All staff are currently assigned.</p>
                    )}
                  </form>

                  {/* Staff List */}
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {storeStaff.length > 0 ? (
                      storeStaff.map((u) => (
                        <div key={u._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 group">
                          <div>
                            <p className="text-sm font-semibold text-gray-800">{u.name}</p>
                            <p className="text-xs text-gray-500">{u.email}</p>
                          </div>
                          <button
                            onClick={() => handleUnassign(u._id, u.name)}
                            className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition p-1 rounded"
                            title="Remove from store"
                          >
                            <FiUserMinus />
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8 text-gray-400 italic text-sm">
                        No staff assigned yet.<br />Use the dropdown above to assign staff.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-10 text-center sticky top-8">
                  <FiUsers className="text-5xl text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm italic">Click on a store to manage its staff</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── REPORT TAB ── */}
        {activeTab === "report" && (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {storeReportSummary.map((s, idx) => (
                <div key={idx} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h3 className="text-base font-bold text-gray-800 mb-1">{s.storeName}</h3>
                  {s.storeAddress && (
                    <p className="text-xs text-gray-400 mb-4 flex items-center">
                      <FiMapPin className="mr-1" />{s.storeAddress}
                    </p>
                  )}
                  <div className="flex justify-between mt-3">
                    <div>
                      <p className="text-xs text-gray-400 uppercase font-bold">Revenue</p>
                      <p className="text-2xl font-black text-blue-600">Rs. {s.totalRevenue?.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 uppercase font-bold">Sales</p>
                      <p className="text-2xl font-black text-gray-800">{s.totalTransactions}</p>
                    </div>
                  </div>
                </div>
              ))}
              {storeReportSummary.length === 0 && (
                <div className="col-span-3 text-center py-20 text-gray-400 italic">
                  No sales data across stores yet.
                </div>
              )}
            </div>

            {/* Summary Table */}
            {storeReportSummary.length > 0 && (
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-x-auto">
                <table className="min-w-full whitespace-nowrap text-left">
                  <thead className="bg-gray-50/80 border-b border-gray-100">
                    <tr>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Store</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Address</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-center">Transactions</th>
                      <th className="px-3 py-2.5 text-[11px] font-bold text-gray-500 uppercase tracking-wider text-right">Revenue (Rs.)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {storeReportSummary.map((s, idx) => (
                      <tr key={idx} className="hover:bg-gray-50/50 transition-colors duration-150">
                        <td className="px-3 py-2.5 text-xs font-bold text-gray-800">{s.storeName}</td>
                        <td className="px-3 py-2.5 text-[11px] text-gray-500">{s.storeAddress || "—"}</td>
                        <td className="px-3 py-2.5 text-center text-xs font-medium text-gray-600">{s.totalTransactions}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-bold text-blue-600">Rs. {s.totalRevenue?.toLocaleString()}</td>
                      </tr>
                    ))}
                    <tr className="bg-blue-50/50 border-t border-blue-100">
                      <td className="px-3 py-2.5 text-xs font-black text-gray-800" colSpan={2}>🏢 Company Total</td>
                      <td className="px-3 py-2.5 text-center text-xs font-black text-gray-800">
                        {storeReportSummary.reduce((a, b) => a + b.totalTransactions, 0)}
                      </td>
                      <td className="px-3 py-2.5 text-right text-sm font-black text-blue-700">
                        Rs. {storeReportSummary.reduce((a, b) => a + b.totalRevenue, 0)?.toLocaleString()}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default StoreManagementPage;
