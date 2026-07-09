import React, { useEffect } from 'react';
import Sidebar from '../Components/Sidebar';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import socket from '../lib/socket';

function ManagerDashboard() {
  const { Authuser } = useSelector((state) => state.auth);

  useEffect(() => {
    if (Authuser) {
      socket.connect();
    }
    return () => {
      socket.disconnect();
    };
  }, [Authuser]);

  return (
    <div className="drawer lg:drawer-open h-screen bg-gray-100">
      <input id="sidebar-drawer" type="checkbox" className="drawer-toggle" />
      <div className="drawer-content flex flex-col h-screen overflow-y-auto overflow-x-hidden">
        <Outlet />
      </div>
      <div className="drawer-side z-50">
        <label htmlFor="sidebar-drawer" aria-label="close sidebar" className="drawer-overlay" />
        <Sidebar />
      </div>
    </div>
  );
}

export default ManagerDashboard;