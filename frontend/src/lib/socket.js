import { io } from 'socket.io-client';
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "https://advanced-inventory-management-system-v1.onrender.com";

const socket = io(BACKEND_URL, {
  withCredentials: true,
  transports: ['websocket', 'polling'],
  autoConnect: true,
});

export const subscribeToLowStockAlerts = (callback) => {
  socket.on("lowStockAlert", (data) => {
    callback(data);
  });
  
  return () => {
    socket.off("lowStockAlert");
  };
};

export default socket;
