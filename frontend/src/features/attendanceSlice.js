import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../lib/axios';
import toast from 'react-hot-toast';

export const checkInAttendance = createAsyncThunk('attendance/checkin', async ({ lat, lng }, { rejectWithValue }) => {
  try {
    const res = await axiosInstance.post('/attendance/checkin', { lat, lng });
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Check-in failed');
  }
});

export const fetchMyAttendance = createAsyncThunk('attendance/myAttendance', async (_, { rejectWithValue }) => {
  try {
    const res = await axiosInstance.get('/attendance/my-attendance');
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch attendance');
  }
});

export const fetchAttendanceReport = createAsyncThunk('attendance/report', async (params, { rejectWithValue }) => {
  try {
    const query = new URLSearchParams(params).toString();
    const res = await axiosInstance.get(`/attendance/report?${query}`);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch report');
  }
});

export const fetchStoreAttendance = createAsyncThunk('attendance/store', async ({ storeId, date }, { rejectWithValue }) => {
  try {
    const url = `/attendance/store/${storeId}${date ? `?date=${date}` : ''}`;
    const res = await axiosInstance.get(url);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch store attendance');
  }
});

const attendanceSlice = createSlice({
  name: 'attendance',
  initialState: {
    myAttendance: [],
    storeAttendance: [],
    report: [],
    checkInResult: null,
    loading: false,
    error: null
  },
  reducers: {
    clearCheckInResult: (state) => { state.checkInResult = null; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(checkInAttendance.pending, (state) => { state.loading = true; state.error = null; })
      .addCase(checkInAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.checkInResult = action.payload;
      })
      .addCase(checkInAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        toast.error(action.payload);
      })
      .addCase(fetchMyAttendance.pending, (state) => { state.loading = true; })
      .addCase(fetchMyAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.myAttendance = action.payload;
      })
      .addCase(fetchMyAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchAttendanceReport.pending, (state) => { state.loading = true; })
      .addCase(fetchAttendanceReport.fulfilled, (state, action) => {
        state.loading = false;
        state.report = action.payload;
      })
      .addCase(fetchAttendanceReport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchStoreAttendance.pending, (state) => { state.loading = true; })
      .addCase(fetchStoreAttendance.fulfilled, (state, action) => {
        state.loading = false;
        state.storeAttendance = action.payload;
      })
      .addCase(fetchStoreAttendance.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  }
});

export const { clearCheckInResult } = attendanceSlice.actions;
export default attendanceSlice.reducer;
