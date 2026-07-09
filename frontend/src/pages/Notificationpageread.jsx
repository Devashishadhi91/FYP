import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { getAllNotifications, deleteAllReadNotifications } from "../features/notificationSlice"; 
import socket from "../lib/socket";
import FormattedTime from "../lib/FormattedTime ";
import image from "../images/user.png";
import TopNavbar from "../Components/TopNavbar";
function NotificationPageRead() {
  const dispatch = useDispatch();
  const { notifications } = useSelector((state) => state.notification);
  const { Authuser } = useSelector((state) => state.auth);
  const [isClearing, setIsClearing] = useState(false);
  const hasReadNotifications = notifications.some(n => n.isRead);

  const handleClearRead = () => {
    setIsClearing(true);
    dispatch(deleteAllReadNotifications())
      .then(() => {
        dispatch(getAllNotifications());
      })
      .finally(() => {
        setIsClearing(false);
      });
  };

  useEffect(() => {
    dispatch(getAllNotifications());

    const handleNewNotification = () => {
      dispatch(getAllNotifications());
    };

    socket.on("newNotification", handleNewNotification);

    return () => {
      socket.off("newNotification", handleNewNotification);
    };
  }, [dispatch]);

  return (
    <div className="bg-base-100 min-h-screen">
        <TopNavbar />
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6 mt-10">
          <h1 className="text-2xl font-bold">Notifications</h1>
          <button
            onClick={handleClearRead}
            disabled={!hasReadNotifications || isClearing}
            className={`px-4 py-2 rounded-lg flex items-center transition ${!hasReadNotifications ? 'bg-red-400 text-white opacity-50 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700'}`}
          >
            {isClearing ? 'Clearing...' : 'Clear Read'}
          </button>
        </div>
        
        <div className="space-y-4">
          {notifications.length > 0 ? (
            notifications.map((notification) => (
              <div 
                key={notification._id} 
                className="flex items-start bg-white p-4 rounded-lg shadow-sm border border-gray-100"
              >
                <img 
                  src={Authuser?.ProfilePic || image} 
                  alt="User" 
                  className="w-10 h-10 rounded-full mr-4 object-cover"
                />
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">{notification.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                  <span className="inline-block mt-2 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">
                    {notification.type.replace('_', ' ')}
                  </span>
                  <p className="text-xs text-gray-400 mt-2">
                    <FormattedTime timestamp={notification.createdAt}/>
                  </p>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              No notifications available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default NotificationPageRead;