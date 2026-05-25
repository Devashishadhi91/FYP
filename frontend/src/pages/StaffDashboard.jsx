import React, { useEffect } from 'react';
import Sidebar from '../Components/Sidebar';
import { Outlet } from 'react-router-dom';
import { useSelector } from 'react-redux';
import socket from '../lib/socket';

function StaffDashboard() {
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
    <div className="flex bg-gray-200 min-h-screen">

      <div className="fixed h-full z-50">
        <Sidebar />
      </div>

     
      <div className="flex-1 ml-64 w-[calc(100%-16rem)] overflow-x-hidden"> 
        <Outlet />
      </div>
    </div>
  );
}

export default StaffDashboard

