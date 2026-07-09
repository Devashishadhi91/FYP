import React from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../Components/Sidebar';
import ChatBotBubble from '../Components/ChatBotBubble';

function DistributorDashboard() {
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
      <ChatBotBubble />
    </div>
  );
}

export default DistributorDashboard;
