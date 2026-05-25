import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import TopNavbar from "../Components/TopNavbar";
import { IoCameraOutline, IoLockClosedOutline } from "react-icons/io5";
import { FiMapPin } from "react-icons/fi";
import image from "../images/user.png";
import { updateProfile } from "../features/authSlice";
import toast from "react-hot-toast";
import FormattedTime from "../lib/FormattedTime ";
import axiosInstance from "../lib/axios";

function ProfilePage() {
  const dispatch = useDispatch();
  const { Authuser } = useSelector((state) => state.auth);
  const { userdata } = useSelector((state) => state.activity);
  const [images, setImage] = useState(null);
  
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) {
      toast.error("No file selected");
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);

    reader.onload = async () => {
      const base64Image = reader.result;
      try {
        const response = await dispatch(updateProfile(base64Image)).unwrap();
        toast.success("Profile updated successfully");
        setImage(response?.updatedUser?.ProfilePic); 
      } catch (error) {
        toast.error(error || "Failed to upload image.");
      }
    };
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      await axiosInstance.put("/auth/change-password", {
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      }, { withCredentials: true });
      toast.success("Password changed successfully");
      setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to change password");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900">
      <TopNavbar />
      <div className="container mx-auto px-6 py-12">
        <h1 className="text-3xl font-black text-gray-800 mb-8">My Profile</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: User Info */}
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
              <div className="relative inline-block mb-6">
                <img
                  className="h-32 w-32 rounded-full object-cover border-4 border-blue-500 shadow-md"
                  src={Authuser?.ProfilePic || images || image}
                  alt="Profile"
                />
                <input
                  type="file"
                  id="fileInput"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageUpload}
                />
                <label
                  htmlFor="fileInput"
                  className="absolute bottom-1 right-1 bg-blue-600 p-2 rounded-full cursor-pointer hover:bg-blue-700 transition shadow-lg"
                >
                  <IoCameraOutline className="text-white text-lg" />
                </label>
              </div>

              <h2 className="text-xl font-bold text-gray-800">{Authuser?.name || "Guest"}</h2>
              <p className="text-blue-600 font-bold text-xs uppercase tracking-widest mt-1">{Authuser?.role || "Staff"}</p>
              
              <div className="mt-8 space-y-4 text-left border-t pt-6">
                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">Email Address</label>
                  <p className="text-gray-700 font-medium">{Authuser?.email || "N/A"}</p>
                </div>
                
                {Authuser?.storeId && typeof Authuser.storeId === 'object' && (
                  <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
                    <label className="text-[10px] font-black text-blue-600 uppercase mb-1 flex items-center">
                      <FiMapPin className="mr-1 text-sm" /> Assigned Store Location
                    </label>
                    <p className="text-blue-900 font-bold text-sm mt-1">{Authuser.storeId.name}</p>
                    <p className="text-blue-700 font-medium text-xs mt-0.5">{Authuser.storeId.address}</p>
                  </div>
                )}

                <div>
                  <label className="text-[10px] font-black text-gray-400 uppercase">Account Status</label>
                  <p className="flex items-center text-green-600 font-bold text-sm">
                    <span className="h-2 w-2 bg-green-600 rounded-full mr-2"></span> Active
                  </p>
                </div>
              </div>
            </div>

            {/* Change Password Form */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
              <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center">
                <IoLockClosedOutline className="mr-2 text-blue-600" /> Security Settings
              </h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Current Password</label>
                  <input 
                    type="password"
                    required
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    className="w-full h-10 px-4 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">New Password</label>
                  <input 
                    type="password"
                    required
                    value={passwordForm.newPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    className="w-full h-10 px-4 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-500 mb-1 block">Confirm New Password</label>
                  <input 
                    type="password"
                    required
                    value={passwordForm.confirmPassword}
                    onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                    className="w-full h-10 px-4 bg-gray-50 border rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition text-sm"
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full bg-blue-600 text-white font-bold h-11 rounded-xl hover:bg-blue-700 transition mt-4"
                >
                  Update Password
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Activity Logs */}
          <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col h-[750px]">
            <div className="p-8 border-b">
              <h3 className="text-lg font-bold text-gray-800">Recent Account Activity</h3>
              <p className="text-sm text-gray-500 font-medium">Log of your latest actions and security events</p>
            </div>
            <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {userdata && userdata.length > 0 && userdata[0].length > 0 ? (
                [...userdata[0]]
                  .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
                  .map((log, index) => (
                  <div key={index} className="flex items-start space-x-4 pb-6 border-b last:border-0">
                    <div className="p-3 bg-blue-50 rounded-xl">
                      <IoLockClosedOutline className="text-blue-600 text-xl" />
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between items-start">
                        <h4 className="font-bold text-gray-800">{log.action}</h4>
                        <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-1 rounded font-black uppercase">
                          IP: {log.ipAddress}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">{log.description}</p>
                      <div className="flex items-center text-[10px] text-gray-400 mt-3 font-bold uppercase tracking-wider">
                        <FormattedTime timestamp={log.createdAt} />
                        <span className="mx-2">•</span>
                        <span>Entity: {log.entity}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-gray-400 italic">
                  <p>No activity logs found for your account.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;