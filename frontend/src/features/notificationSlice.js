import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";
import toast from "react-hot-toast";

const initialState = {
  notifications: [],
  isLoading: false,
};

export const createNotification = createAsyncThunk(
  "notification/createNotification",
  async (Notification, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post(
        "notification/createNotification",
        Notification,
        { withCredentials: true }
      );
      return response.data.notification; 
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Notification creation failed"
      );
    }
  }
);

export const getAllNotifications = createAsyncThunk(
  "notification/allNotification",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("notification/allNotification", {
        withCredentials: true,
      });
      return response.data; 
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Notification retrieval failed"
      );
    }
  }
);

export const markAsRead = createAsyncThunk(
  "notification/markAsRead",
  async (id, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(`notification/${id}/readNotification`, {}, {
        withCredentials: true,
      });
      return response.data.notification;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Mark as read failed");
    }
  }
);

export const markAllAsRead = createAsyncThunk(
  "notification/markAllAsRead",
  async (_, { rejectWithValue }) => {
    try {
      await axiosInstance.put("notification/mark-all-read", {}, {
        withCredentials: true,
      });
      return true;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Mark all as read failed");
    }
  }
);

export const deleteNotification = createAsyncThunk(
  "notification/deleteNotification",
  async (NotificationId, { rejectWithValue }) => {
    try {
      await axiosInstance.delete(
        `notification/deleteNotification/${NotificationId}`,
        { withCredentials: true }
      );
      return NotificationId; 
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || "Notification removal failed"
      );
    }
  }
);

export const deleteAllReadNotifications = createAsyncThunk(
  "notification/deleteAllRead",
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete("notification/deleteAllRead", { withCredentials: true });
      toast.success("Read notifications cleared");
      return response.data;
    } catch (error) {
      toast.error("Failed to clear notifications");
      return rejectWithValue(error.response?.data?.message);
    }
  }
);

const notificationSlice = createSlice({
  name: "notification",
  initialState,
  reducers: {
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(getAllNotifications.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(getAllNotifications.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload || [];
      })
      .addCase(getAllNotifications.rejected, (state, action) => {
        state.isLoading = false;
      })
      .addCase(markAsRead.fulfilled, (state, action) => {
        const index = state.notifications.findIndex(n => n._id === action.payload._id);
        if (index !== -1) {
          state.notifications[index] = action.payload;
        }
      })
      .addCase(markAllAsRead.fulfilled, (state) => {
        state.notifications.forEach(n => n.isRead = true);
      })
      .addCase(deleteNotification.fulfilled, (state, action) => {
        state.notifications = state.notifications.filter(
          (n) => n._id !== action.payload
        );
      })
      .addCase(deleteAllReadNotifications.fulfilled, (state, action) => {
        state.notifications = state.notifications.filter(
          (n) => n.isRead !== true
        );
      });
  },
});

export const { addNotification } = notificationSlice.actions;
export default notificationSlice.reducer;
