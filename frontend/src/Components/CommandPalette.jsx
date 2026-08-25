import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSearch, FiCommand } from 'react-icons/fi';
import { useSelector } from 'react-redux';

const CommandPalette = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { Authuser } = useSelector((state) => state.auth);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
        setQuery('');
        setActiveIndex(0);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const getDashboardPrefix = (role) => {
    if (role === 'admin') return '/AdminDashboard';
    if (role === 'manager') return '/ManagerDashboard';
    if (role === 'staff') return '/StaffDashboard';
    return '';
  };

  const routes = [
    { name: 'Dashboard', path: '', roles: ['admin', 'manager', 'staff'] },
    { name: 'Products', path: '/product', roles: ['admin', 'manager', 'staff'] },
    { name: 'Sales', path: '/sales', roles: ['admin', 'manager', 'staff'] },
    { name: 'Categories', path: '/category', roles: ['admin', 'manager'] },
    { name: 'Suppliers', path: '/supplier', roles: ['admin', 'manager'] },
    { name: 'Staff Schedules', path: '/schedules', roles: ['admin', 'manager', 'staff'] },
    { name: 'Reports', path: '/reports', roles: ['admin', 'manager'] },
    { name: 'Manage Staff', path: '/users', roles: ['admin', 'manager'] },
    { name: 'Stores Warehouse', path: '/stores', roles: ['admin'] },
  ];

  const filteredRoutes = routes.filter(route => 
    route.roles.includes(Authuser?.role || '') && 
    route.name.toLowerCase().includes(query.toLowerCase())
  );

  const handleSelect = (route) => {
    const prefix = getDashboardPrefix(Authuser?.role);
    let finalPath = `${prefix}${route.path}`;
    
    // Handle admin specific route inconsistencies in App.jsx
    if (route.name === 'Manage Staff' && Authuser?.role === 'admin') {
      finalPath = `${prefix}/Userstatus`;
    }
    
    navigate(finalPath);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev + 1) % filteredRoutes.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev - 1 + filteredRoutes.length) % filteredRoutes.length);
    } else if (e.key === 'Enter' && filteredRoutes.length > 0) {
      e.preventDefault();
      handleSelect(filteredRoutes[activeIndex]);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-24">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setIsOpen(false)}
      />
      
      <div className="relative w-full max-w-xl bg-white rounded-xl shadow-2xl overflow-hidden animate-[modalIn_0.15s_ease-out]">
        <div className="flex items-center px-4 border-b border-gray-100">
          <FiSearch className="text-gray-400 text-xl" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKeyDown}
            className="w-full h-14 pl-3 pr-4 bg-transparent outline-none text-gray-800 text-lg placeholder-gray-400"
            placeholder="Search pages and quick actions..."
          />
          <div className="flex items-center space-x-1 text-xs text-gray-400 font-bold bg-gray-100 px-2 py-1 rounded">
            <span>ESC</span>
          </div>
        </div>

        <div className="max-h-80 overflow-y-auto py-2">
          {filteredRoutes.length > 0 ? (
            filteredRoutes.map((route, index) => (
              <div
                key={route.path}
                onClick={() => handleSelect(route)}
                onMouseEnter={() => setActiveIndex(index)}
                className={`flex items-center justify-between px-4 py-3 cursor-pointer transition-colors ${
                  index === activeIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-700 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center font-semibold">
                  <FiCommand className={`mr-3 ${index === activeIndex ? 'text-blue-500' : 'text-gray-400'}`} />
                  {route.name}
                </div>
                {index === activeIndex && (
                  <span className="text-xs font-bold text-blue-500 uppercase tracking-wider">Jump To</span>
                )}
              </div>
            ))
          ) : (
            <div className="px-6 py-12 text-center">
              <p className="text-gray-500 font-medium">No results found for "{query}"</p>
            </div>
          )}
        </div>
      </div>
      <style>{`
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.95) translateY(-10px); }
          to { opacity: 1; transform: scale(1) translateY(0); }
        }
      `}</style>
    </div>
  );
};

export default CommandPalette;
