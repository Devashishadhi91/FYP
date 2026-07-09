import React, { useEffect, useState } from "react";
import TopNavbar from "../Components/TopNavbar";
import { useDispatch, useSelector } from "react-redux";
import { TiDelete, TiEdit } from "react-icons/ti";
import image from "../images/user.png";
import {
  staffUser,
  managerUser,
  adminUser,
  removeusers,
  adminCreateUser,
  editUserThunk
} from "../features/authSlice";
import { fetchAllStores, fetchUnassignedStores } from "../features/storeSlice";
import toast from "react-hot-toast";
import UserRoleChart from '../lib/Usersgraph'
import axiosInstance from "../lib/axios";

function Userstatus() {
  const { staffuser, manageruser, adminuser } = useSelector((state) => state.auth);
  const { stores } = useSelector((state) => state.store);
  const dispatch = useDispatch();
  const { Authuser } = useSelector((state) => state.auth);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('staff');
  const [storeId, setStoreId] = useState('');
  const [distributorId, setDistributorId] = useState('');
  const [isRounding, setIsRounding] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTargetId, setEditTargetId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState('staff');
  const [editStoreId, setEditStoreId] = useState('');
  const [editDistributorId, setEditDistributorId] = useState('');
  const [editIsRounding, setEditIsRounding] = useState(false);
  const [unassignedStores, setUnassignedStores] = useState([]);
  const [distributors, setDistributors] = useState([]);
  const [isEditLoading, setIsEditLoading] = useState(false);

  useEffect(() => {
    dispatch(staffUser());
    dispatch(managerUser());
    dispatch(adminUser());
    dispatch(fetchAllStores());
    axiosInstance.get('/auth/distributors').then(res => setDistributors(res.data)).catch(() => {});
  }, [dispatch]);

  useEffect(() => {
    if (role === 'staff' || role === 'manager') {
      dispatch(fetchUnassignedStores());
    }
  }, [role, dispatch]);

  const handleremove = async (UserId) => {
    dispatch(removeusers(UserId))
      .then(() => {
        toast.success("User removed successfully");
      })
      .catch((err) => {
        toast.error("Error in removing user");
      });
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!name || !email || !password || !role) {
      toast.error("Please fill all required fields");
      return;
    }
    if (role === 'staff' && !isRounding && !storeId) {
      toast.error("Staff must be assigned to a store or marked as Rounding");
      return;
    }
    if (role === 'manager' && !storeId) {
      toast.error("Please assign a store for the manager");
      return;
    }

    setIsLoading(true);
    try {
      await dispatch(adminCreateUser({ name, email, password, role, storeId: isRounding ? '' : storeId, isRounding, distributorId })).unwrap();
      toast.success("User created successfully!");
      
      // Refresh user lists
      dispatch(staffUser());
      dispatch(managerUser());
      dispatch(adminUser());
      axiosInstance.get('/auth/distributors').then(res => setDistributors(res.data)).catch(() => {});
      
      // Reset form
      setName('');
      setEmail('');
      setPassword('');
      setRole('staff');
      setStoreId('');
      setDistributorId('');
      setIsRounding(false);
    } catch (error) {
      toast.error(error || "Failed to create user");
    } finally {
      setIsLoading(false);
    }
  };

  const openEditModal = async (user) => {
    setEditTargetId(user._id);
    setEditName(user.name);
    setEditEmail(user.email);
    setEditPassword('');
    setEditRole(user.role);
    setEditStoreId(user.storeId?._id || user.storeId || '');
    setEditDistributorId(user.distributorId?._id || user.distributorId || '');
    setEditIsRounding(user.isRounding || false);
    
    if (user.role === 'staff') {
      try {
        const res = await axiosInstance.get(`store/unassigned-stores?excludeUserId=${user._id}`, { withCredentials: true });
        setUnassignedStores(res.data);
      } catch (err) {
        toast.error("Failed to fetch available stores");
      }
    }
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editName || !editEmail || !editRole) {
      toast.error("Please fill all required fields");
      return;
    }
    
    setIsEditLoading(true);
    const formData = {
      name: editName,
      email: editEmail,
      role: editRole,
      password: editPassword || undefined,
      isRounding: editIsRounding,
      distributorId: editDistributorId || null,
    };
    if (editRole === 'staff') {
      formData.storeId = editIsRounding ? null : (editStoreId || null);
    }

    try {
      await dispatch(editUserThunk({ userId: editTargetId, ...formData })).unwrap();
      toast.success("User updated successfully");
      setIsEditModalOpen(false);
      dispatch(staffUser());
      dispatch(managerUser());
    } catch (error) {
      toast.error(error || "Failed to update user");
    } finally {
      setIsEditLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-base-100">
      <TopNavbar />
      <div className="flex flex-col md:flex-row p-6 gap-6">
        
        {/* Left Column: User Lists */}
        <div className="bg-base-100 w-full md:w-80 overflow-auto rounded-lg">
          <div className="bg-base-100 p-4 rounded-lg shadow-md mb-4 border">
            <h2 className="text-lg font-semibold mb-2">Manager</h2>
            {manageruser?.length > 0 ? (
              manageruser.map((user, index) => (
                <div key={index} className="flex items-center space-x-4 p-2 border-b last:border-0">
                  <img src={user?.ProfilePic||image} alt="User" className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-gray-500 text-xs">{user.email}</p>
                  </div>
                  {Authuser?.role === 'admin' && (
                    <div className="flex items-center">
                      <TiEdit onClick={()=>openEditModal(user)} className="text-blue-600 text-2xl cursor-pointer mr-2" />
                      <TiDelete onClick={()=>handleremove(user._id)} className="text-red-600 text-2xl cursor-pointer" />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No managers available.</p>
            )}
          </div>

          <div className="bg-base-100 p-4 rounded-lg shadow-md mb-4 border">
            <h2 className="text-lg font-semibold mb-2">Admin User</h2>
            {adminuser?.length > 0 ? (
              adminuser.map((user, index) => (
                <div key={index} className="flex items-center space-x-4 p-2 border-b last:border-0">
                  <img src={user?.ProfilePic||image} alt="User" className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-gray-500 text-xs">{user.email}</p>
                  </div>
                  {Authuser?._id !== user._id && (
                    <div><TiDelete onClick={()=>handleremove(user._id)} className="text-red-600 text-2xl cursor-pointer" /></div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No admins available.</p>
            )}
          </div>
          <div className="bg-base-100 p-4 rounded-lg shadow-md mb-4 border">
            <h2 className="text-lg font-semibold mb-2">Distributor</h2>
            {distributors?.length > 0 ? (
              distributors.map((user, index) => (
                <div key={index} className="flex items-center space-x-4 p-2 border-b last:border-0">
                  <img src={user?.ProfilePic||image} alt="User" className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">{user.name}</p>
                    <p className="text-gray-500 text-xs">{user.email}</p>
                  </div>
                  {Authuser?.role === 'admin' && (
                    <div className="flex items-center">
                      <TiEdit onClick={()=>openEditModal(user)} className="text-blue-600 text-2xl cursor-pointer mr-2" />
                      <TiDelete onClick={()=>handleremove(user._id)} className="text-red-600 text-2xl cursor-pointer" />
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No distributors available.</p>
            )}
          </div>

          <div className="bg-base-100 p-4 rounded-lg shadow-md border">
            <h2 className="text-lg font-semibold mb-2">Staff User</h2>
            {staffuser?.length > 0 ? (
              staffuser.map((user, index) => (
                <div key={index} className="flex items-center space-x-4 p-2 border-b last:border-0">
                  <img src={user?.ProfilePic||image} alt="User" className="w-10 h-10 rounded-full" />
                  <div className="flex-1">
                    <p className="font-medium text-sm">
                      {user.name}
                      {user.isRounding && (
                        <span className="ml-2 text-[10px] font-semibold bg-purple-100 text-purple-700 border border-purple-200 rounded-full px-2 py-0.5">Rounding</span>
                      )}
                    </p>
                    <p className="text-gray-500 text-xs">{user.email}</p>
                  </div>
                  <div className="flex items-center">
                    {(Authuser?.role === 'admin' || Authuser?.role === 'manager') && (
                      <TiEdit onClick={()=>openEditModal(user)} className="text-blue-600 text-2xl cursor-pointer mr-2" />
                    )}
                    <TiDelete onClick={()=>handleremove(user._id)} className="text-red-600 text-2xl cursor-pointer" />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-sm">No staff available.</p>
            )}
          </div>
        </div>

        {/* Right Column: Chart & Form */}
        <div className="flex-1 flex flex-col gap-6">
          <div className="bg-base-100 p-4 rounded-lg shadow-md border w-full max-w-2xl">
            <UserRoleChart />
          </div>

          {Authuser?.role === 'admin' && (
            <div className="bg-base-100 p-6 rounded-lg shadow-md border w-full max-w-2xl">
              <h2 className="text-xl font-bold mb-4">Create New User</h2>
              <form onSubmit={handleCreateUser} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label"><span className="label-text">Full Name</span></label>
                    <input type="text" className="input input-bordered w-full" value={name} onChange={(e)=>setName(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label"><span className="label-text">Email</span></label>
                    <input type="email" className="input input-bordered w-full" value={email} onChange={(e)=>setEmail(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label"><span className="label-text">Password</span></label>
                    <input type="password" className="input input-bordered w-full" value={password} onChange={(e)=>setPassword(e.target.value)} required />
                  </div>
                  <div>
                    <label className="label"><span className="label-text">Role</span></label>
                    <select className="select select-bordered w-full" value={role} onChange={(e)=>setRole(e.target.value)}>
                      <option value="staff">Staff</option>
                      <option value="manager">Manager</option>
                      <option value="admin">Admin</option>
                      <option value="distributor">Distributor</option>
                    </select>
                  </div>
                  
                  {(role === 'staff' || role === 'manager') && (
                    <div className="md:col-span-2">
                      <label className="label"><span className="label-text">Assign to Store</span></label>
                      <select
                        className="select select-bordered w-full"
                        value={isRounding ? 'rounding' : storeId}
                        onChange={(e) => {
                          if (e.target.value === 'rounding') {
                            setIsRounding(true);
                            setStoreId('');
                          } else {
                            setIsRounding(false);
                            setStoreId(e.target.value);
                          }
                        }}
                        required={role !== 'staff' || !isRounding}
                      >
                        <option value="">Select a store...</option>
                        {role === 'staff' && (
                          <option value="rounding">🔄 Rounding (No Fixed Store)</option>
                        )}
                        {(role === 'staff' ? unassignedStores : stores)?.map((store) => (
                          <option key={store._id} value={store._id}>{store.name}</option>
                        ))}
                      </select>
                      {isRounding && (
                        <div className="mt-3">
                          <p className="text-xs text-purple-600 mb-2">✓ This staff member will be a rounding staff with no fixed store assignment.</p>
                          <label className="label"><span className="label-text">Assign to Distributor (Optional)</span></label>
                          <select
                            className="select select-bordered w-full"
                            value={distributorId}
                            onChange={(e) => setDistributorId(e.target.value)}
                          >
                            <option value="">No Distributor</option>
                            {distributors?.map((d) => (
                              <option key={d._id} value={d._id}>{d.name}</option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="mt-6">
                  <button type="submit" className="btn btn-primary w-full md:w-auto px-8" disabled={isLoading}>
                    {isLoading ? "Creating..." : "Create User"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
        
      </div>

      {/* Edit Modal */}
      <dialog className={`modal ${isEditModalOpen ? "modal-open" : ""}`}>
        <div className="modal-box">
          <h3 className="font-bold text-lg mb-4">Edit User</h3>
          <form onSubmit={handleEditSubmit} className="space-y-4">
            <div>
              <label className="label"><span className="label-text">Name</span></label>
              <input type="text" className="input input-bordered w-full" value={editName} onChange={(e) => setEditName(e.target.value)} required />
            </div>
            <div>
              <label className="label"><span className="label-text">Email</span></label>
              <input type="email" className="input input-bordered w-full" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} required />
            </div>
            <div>
              <label className="label"><span className="label-text">New Password (leave blank to keep current)</span></label>
              <input type="password" className="input input-bordered w-full" value={editPassword} onChange={(e) => setEditPassword(e.target.value)} />
            </div>
            
            {Authuser?.role === 'admin' && (
              <div>
                <label className="label"><span className="label-text">Role</span></label>
                <select className="select select-bordered w-full" value={editRole} onChange={(e) => setEditRole(e.target.value)}>
                  <option value="staff">Staff</option>
                  <option value="manager">Manager</option>
                  <option value="distributor">Distributor</option>
                </select>
              </div>
            )}
            
            {editRole === 'staff' && (
              <div>
                <label className="label"><span className="label-text">Assign Store</span></label>
                <select
                  className="select select-bordered w-full"
                  value={editIsRounding ? 'rounding' : editStoreId}
                  onChange={(e) => {
                    if (e.target.value === 'rounding') {
                      setEditIsRounding(true);
                      setEditStoreId('');
                    } else {
                      setEditIsRounding(false);
                      setEditStoreId(e.target.value);
                    }
                  }}
                >
                  <option value="">Unassigned</option>
                  <option value="rounding">🔄 Rounding (No Fixed Store)</option>
                  {unassignedStores.map(s => (
                    <option key={s._id} value={s._id}>{s.name}</option>
                  ))}
                </select>
                {editIsRounding && (
                  <div className="mt-3">
                    <p className="text-xs text-purple-600 mb-2">✓ Rounding staff — no fixed store.</p>
                    <label className="label"><span className="label-text">Assign to Distributor (Optional)</span></label>
                    <select
                      className="select select-bordered w-full"
                      value={editDistributorId}
                      onChange={(e) => setEditDistributorId(e.target.value)}
                    >
                      <option value="">No Distributor</option>
                      {distributors?.map((d) => (
                        <option key={d._id} value={d._id}>{d.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            <div className="modal-action">
              <button type="button" className="btn" onClick={() => setIsEditModalOpen(false)}>Cancel</button>
              <button type="submit" className="btn btn-primary" disabled={isEditLoading}>
                {isEditLoading ? "Saving..." : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
        <form method="dialog" className="modal-backdrop" onClick={() => setIsEditModalOpen(false)}>
          <button>close</button>
        </form>
      </dialog>

    </div>
  );
}

export default Userstatus;
