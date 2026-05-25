import React, { useState, useEffect, useRef } from 'react';
import { FaRegCircleUser } from "react-icons/fa6";
import { HiDotsVertical } from "react-icons/hi";
import { LuBell, LuBellRing } from "react-icons/lu";
import { MdWarning, MdInfo } from "react-icons/md";
import { useDispatch, useSelector } from "react-redux";
import image from "../images/user.png";
import ThemeToggle from "../lib/ThemeToggle";
import { Link } from 'react-router-dom';
import { subscribeToLowStockAlerts } from '../lib/socket';
import toast from 'react-hot-toast';
import { getAllNotifications, markAllAsRead, addNotification } from '../features/notificationSlice';
import FormattedTime from '../lib/FormattedTime ';

function TopNavbar() {
  const dispatch = useDispatch();
  const { Authuser } = useSelector((state) => state.auth);
  const { notifications } = useSelector((state) => state.notification);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  const unreadNotifications = notifications.filter(n => !n.isRead);
  const unreadCount = unreadNotifications.length;

  useEffect(() => {
    dispatch(getAllNotifications());
  }, [dispatch]);

  useEffect(() => {
    const unsubscribe = subscribeToLowStockAlerts((data) => {
      // 1. Show Toast
      toast.error(
        `⚠️ Low Stock: ${data.productName} is down to ${data.quantity} units!`,
        { 
          duration: 6000, 
          position: 'top-right',
          style: { background: '#ff4b2b', color: '#fff', fontWeight: 'bold' }
        }
      );
      // 2. Refresh notifications list to show new alert in bell
      dispatch(getAllNotifications());
    });
    return () => unsubscribe();
  }, [dispatch]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAllRead = () => {
    dispatch(markAllAsRead());
  };

  return (
    <div className='bg-base-100 z-40 relative'>
      <nav className='bg-gray-100 shadow-sm w-full h-16 flex items-center justify-between px-6'>
        <h1 className='text-xl font-semibold text-gray-800'>Welcome, {Authuser?.name || "Guest"}</h1>

        <div className='flex items-center space-x-6'>
          {/* Notification Bell */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() => setShowDropdown(!showDropdown)}
              className="p-2 rounded-full hover:bg-gray-200 transition relative"
            >
              {unreadCount > 0 ? (
                <LuBellRing className="text-2xl text-blue-600 animate-pulse" />
              ) : (
                <LuBell className="text-2xl text-gray-600" />
              )}
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showDropdown && (
              <div className="absolute right-0 mt-3 w-80 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                  <h3 className="font-bold text-gray-700">Notifications</h3>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleMarkAllRead}
                      className="text-xs text-blue-600 hover:underline font-semibold"
                    >
                      Mark all as read
                    </button>
                  )}
                </div>

                <div className="max-h-96 overflow-y-auto">
                  {notifications.length > 0 ? (
                    notifications.slice(0, 5).map((n) => (
                      <div 
                        key={n._id} 
                        className={`p-4 border-b last:border-0 hover:bg-gray-50 transition flex items-start space-x-3 ${!n.isRead ? 'bg-blue-50/30' : ''}`}
                      >
                        <div className={`p-2 rounded-full mt-1 ${n.type === 'low_stock' ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                          {n.type === 'low_stock' ? <MdWarning className="text-lg" /> : <MdInfo className="text-lg" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-semibold truncate ${n.type === 'low_stock' ? 'text-red-700' : 'text-gray-800'}`}>
                            {n.title}
                          </p>
                          <p className="text-xs text-gray-600 line-clamp-2 mt-1">{n.message}</p>
                          <p className="text-[10px] text-gray-400 mt-2 font-medium">
                            <FormattedTime timestamp={n.createdAt} />
                          </p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-8 text-center text-gray-400 italic text-sm">
                      No notifications yet
                    </div>
                  )}
                </div>

                <Link 
                  to="/AdminDashboard/notifications" 
                  onClick={() => setShowDropdown(false)}
                  className="block w-full text-center p-3 text-sm text-blue-600 font-bold bg-gray-50 hover:bg-gray-100 border-t"
                >
                  View All Notifications
                </Link>
              </div>
            )}
          </div>

          <div className='flex items-center space-x-3 border-l pl-6'>
            <Link to={`${Authuser?.role === 'admin' ? '/AdminDashboard' : Authuser?.role === 'manager' ? '/ManagerDashboard' : '/StaffDashboard'}/profile`}>  
              <img
                className="border-2 border-blue-500 h-10 w-10 rounded-full object-cover shadow-sm hover:scale-105 transition"
                src={Authuser?.ProfilePic || image}
                alt="Profile"
              />
            </Link> 
            <div className='text-left hidden md:block'>
              <h1 className='text-gray-800 font-bold text-sm leading-tight'>{Authuser?.name || "Guest"}</h1>
              <p className='text-gray-500 text-[11px] uppercase tracking-wider font-semibold'>{Authuser?.role || "Visitor"}</p>
            </div>
          </div>
          
          <ThemeToggle className='text-gray-600 text-xl cursor-pointer hover:text-blue-600 transition' />
        </div>
      </nav>
      <hr className='border-gray-100' />
    </div>
  );
}

export default TopNavbar;