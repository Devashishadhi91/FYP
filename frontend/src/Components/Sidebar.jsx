import React from 'react';
import { AiOutlineProduct } from "react-icons/ai";
import { RiStockLine } from "react-icons/ri";
import { FiLogOut, FiShoppingCart, FiUser } from "react-icons/fi";
import { MdPointOfSale, MdOutlineCategory } from "react-icons/md";
import { TfiSupport } from "react-icons/tfi";
import { IoNotificationsOutline } from "react-icons/io5";
import { RxActivityLog, RxDashboard } from "react-icons/rx";
import { HiOutlineDocumentReport } from "react-icons/hi";
import { Link, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from "react-redux";
import { logout } from "../features/authSlice";
import toast from 'react-hot-toast';
import { LuUsers } from "react-icons/lu";
import { FiGrid } from "react-icons/fi";
import { BsCalendar3, BsGeoAlt, BsPeopleFill } from "react-icons/bs";
import logo1 from '../images/logo1.png';

const navConfig = {
  admin: [
    { label: "Dashboard", path: "/AdminDashboard", icon: <RxDashboard /> },
    { label: "Products", path: "/AdminDashboard/product", icon: <AiOutlineProduct /> },
    { label: "Orders", path: "/AdminDashboard/order", icon: <FiShoppingCart /> },
    { label: "Sales", path: "/AdminDashboard/sales", icon: <MdPointOfSale /> },
    { label: "Purchases", path: "/AdminDashboard/stock-transaction", icon: <RiStockLine /> },
    { label: "Categories", path: "/AdminDashboard/category", icon: <MdOutlineCategory /> },
    { label: "Notifications", path: "/AdminDashboard/notifications", icon: <IoNotificationsOutline /> },
    { label: "Suppliers", path: "/AdminDashboard/supplier", icon: <TfiSupport /> },
    { label: "User Status", path: "/AdminDashboard/Userstatus", icon: <LuUsers /> },
    { label: "Stores", path: "/AdminDashboard/stores", icon: <FiGrid /> },
    { label: "Schedules", path: "/AdminDashboard/schedules", icon: <BsCalendar3 /> },
    { label: "Attendance", path: "/AdminDashboard/attendance-report", icon: <BsGeoAlt /> },
    { label: "Activity Log", path: "/AdminDashboard/activity-log", icon: <RxActivityLog /> },
    { label: "Reports", path: "/AdminDashboard/reports", icon: <HiOutlineDocumentReport /> },
    { label: "Profile", path: "/AdminDashboard/profile", icon: <FiUser /> },
  ],
  manager: [
    { label: "Dashboard", path: "/ManagerDashboard", icon: <RxDashboard /> },
    { label: "Products", path: "/ManagerDashboard/product", icon: <AiOutlineProduct /> },
    { label: "Orders", path: "/ManagerDashboard/order", icon: <FiShoppingCart /> },
    { label: "Sales", path: "/ManagerDashboard/sales", icon: <MdPointOfSale /> },
    { label: "Purchases", path: "/ManagerDashboard/stock-transaction", icon: <RiStockLine /> },
    { label: "Categories", path: "/ManagerDashboard/category", icon: <MdOutlineCategory /> },
    { label: "Suppliers", path: "/ManagerDashboard/supplier", icon: <TfiSupport /> },
    { label: "Stores", path: "/ManagerDashboard/stores", icon: <FiGrid /> },
    { label: "Users", path: "/ManagerDashboard/users", icon: <LuUsers /> },
    { label: "Schedules", path: "/ManagerDashboard/schedules", icon: <BsCalendar3 /> },
    { label: "Attendance", path: "/ManagerDashboard/attendance-report", icon: <BsGeoAlt /> },
    { label: "Activity Log", path: "/ManagerDashboard/activity-log", icon: <RxActivityLog /> },
    { label: "Reports", path: "/ManagerDashboard/reports", icon: <HiOutlineDocumentReport /> },
    { label: "Profile", path: "/ManagerDashboard/profile", icon: <FiUser /> },
  ],
  staff: [
    { label: "Dashboard", path: "/StaffDashboard", icon: <RxDashboard /> },
    { label: "Products", path: "/StaffDashboard/product", icon: <AiOutlineProduct /> },
    { label: "Sales", path: "/StaffDashboard/sales", icon: <MdPointOfSale /> },
    { label: "Purchases", path: "/StaffDashboard/stock-transaction", icon: <RiStockLine /> },
    { label: "Categories", path: "/StaffDashboard/category", icon: <MdOutlineCategory /> },
    { label: "Attendance", path: "/StaffDashboard/attendance", icon: <BsGeoAlt /> },
  ],
  distributor: [
    { label: "Dashboard", path: "/DistributorDashboard", icon: <RxDashboard /> },
    { label: "My Team", path: "/DistributorDashboard/team", icon: <BsPeopleFill /> },
    { label: "Profile", path: "/DistributorDashboard/profile", icon: <FiUser /> },
  ]
};

function Sidebar() {
  const dispatch = useDispatch();
  const navigator = useNavigate();
  const location = useLocation();
  const { Authuser } = useSelector((state) => state.auth);
  const role = Authuser?.role?.toLowerCase();
  
  let links = navConfig[role] || [];
  if (role === 'staff' && Authuser?.isRounding) {
    links = links.map(link => 
      link.label === "Attendance" 
        ? { ...link, path: "/StaffDashboard/rounding-schedule" }
        : link
    );
  }

  const handleLogout = async () => {
    dispatch(logout())
      .then(() => {
        toast.success("Logout successfully");
        navigator('/');
      })
      .catch(() => {
        toast.error("Error in logout");
      });
  };

  // Closes the mobile drawer when a nav link is clicked
  const closeMobileDrawer = () => {
    const drawerToggle = document.getElementById('sidebar-drawer');
    if (drawerToggle && window.innerWidth < 1024) {
      drawerToggle.checked = false;
    }
  };

  return (
    <div className="flex flex-col w-64 bg-white text-black h-screen p-6 shadow-lg">
      <h1 className="text-2xl font-bold text-center text-gray-700 mb-6 shrink-0">
        <img src={logo1} className="w-56 bg-white" alt="logo" />
      </h1>

      <nav className="space-y-1 flex-1 overflow-y-auto overflow-x-hidden pr-2 custom-scrollbar">
        {links.map((link, index) => {
          const isActive = location.pathname === link.path;
          return (
            <Link
              key={index}
              to={link.path}
              onClick={closeMobileDrawer}
              className={`flex items-center space-x-3 cursor-pointer p-2 rounded-md transition ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-semibold'
                  : 'text-gray-700 hover:text-blue-700 hover:bg-blue-50'
              }`}
            >
              <span className="text-xl shrink-0">{link.icon}</span>
              <span className="text-md font-medium">{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="mt-4 border-t pt-4 shrink-0">
        <div
          onClick={handleLogout}
          className="flex items-center space-x-3 text-lg text-gray-700 hover:text-red-600 cursor-pointer p-2 rounded-md transition hover:bg-red-50"
        >
          <FiLogOut className="text-xl shrink-0" />
          <span>Logout</span>
        </div>
      </div>
    </div>
  );
}

export default Sidebar;
