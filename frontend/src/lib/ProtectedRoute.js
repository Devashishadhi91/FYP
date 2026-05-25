import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

const ProtectedRoute = ({ element, allowedRoles }) => {
  const { Authuser } = useSelector((state) => state.auth);

  // 1. If not authenticated, go to Login
  if (!Authuser) {
    return <Navigate to="/LoginPage" />;
  }

  // 2. If allowedRoles is provided, check the user's role
  if (allowedRoles && !allowedRoles.includes(Authuser.role)) {
    // Unauthorized: Redirect to their default dashboard based on their role
    const dashboard = Authuser.role === 'admin' ? '/AdminDashboard' : 
                      Authuser.role === 'manager' ? '/ManagerDashboard' : '/StaffDashboard';
    return <Navigate to={dashboard} />;
  }

  // 3. Authorized or no role restriction
  return element;
};

export default ProtectedRoute;
