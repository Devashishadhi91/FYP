import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axiosInstance from '../lib/axios';
import toast from 'react-hot-toast';

export const createSchedule = createAsyncThunk('schedule/create', async (data, { rejectWithValue }) => {
  try {
    const res = await axiosInstance.post('/schedule/create', data);
    toast.success('Schedule created successfully');
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.message || 'Failed to create schedule';
    toast.error(msg);
    return rejectWithValue(msg);
  }
});

export const fetchMySchedule = createAsyncThunk('schedule/mySchedule', async (date, { rejectWithValue }) => {
  try {
    const url = date ? `/schedule/my-schedule?date=${date}` : '/schedule/my-schedule';
    const res = await axiosInstance.get(url);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch schedule');
  }
});

export const fetchManagerSchedules = createAsyncThunk('schedule/managerSchedules', async ({ startDate, endDate } = {}, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString();
    const url = query ? `/schedule/manager-schedules?${query}` : '/schedule/manager-schedules';
    const res = await axiosInstance.get(url);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch schedules');
  }
});

export const fetchAllSchedules = createAsyncThunk('schedule/all', async ({ startDate, endDate } = {}, { rejectWithValue }) => {
  try {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const query = params.toString();
    const url = query ? `/schedule/all?${query}` : '/schedule/all';
    const res = await axiosInstance.get(url);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch all schedules');
  }
});

export const checkRoundingAttendance = createAsyncThunk('schedule/roundingCheckin', async ({ lat, lng }, { rejectWithValue }) => {
  try {
    const res = await axiosInstance.post('/schedule/rounding-checkin', { lat, lng });
    return res.data;
  } catch (err) {
    const msg = err.response?.data?.message || 'Check-in failed';
    toast.error(msg);
    return rejectWithValue(msg);
  }
});

export const fetchStaffSchedules = createAsyncThunk('schedule/staffSchedules', async ({ staffId, date }, { rejectWithValue }) => {
  try {
    const url = `/schedule/staff/${staffId}${date ? `?date=${date}` : ''}`;
    const res = await axiosInstance.get(url);
    return res.data;
  } catch (err) {
    return rejectWithValue(err.response?.data?.message || 'Failed to fetch staff schedules');
  }
});

const scheduleSlice = createSlice({
  name: 'schedule',
  initialState: {
    mySchedule: null,
    managerSchedules: [],
    allSchedules: [],
    staffSchedules: [],
    roundingCheckInResult: null,
    loading: false,
    error: null
  },
  reducers: {
    clearRoundingResult: (state) => { state.roundingCheckInResult = null; }
  },
  extraReducers: (builder) => {
    builder
      .addCase(createSchedule.pending, (state) => { state.loading = true; })
      .addCase(createSchedule.fulfilled, (state) => { state.loading = false; })
      .addCase(createSchedule.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(fetchMySchedule.pending, (state) => { state.loading = true; })
      .addCase(fetchMySchedule.fulfilled, (state, action) => { state.loading = false; state.mySchedule = action.payload?.schedule || action.payload; })
      .addCase(fetchMySchedule.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(fetchManagerSchedules.pending, (state) => { state.loading = true; })
      .addCase(fetchManagerSchedules.fulfilled, (state, action) => { state.loading = false; state.managerSchedules = action.payload; })
      .addCase(fetchManagerSchedules.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(fetchAllSchedules.pending, (state) => { state.loading = true; })
      .addCase(fetchAllSchedules.fulfilled, (state, action) => { state.loading = false; state.allSchedules = action.payload; })
      .addCase(fetchAllSchedules.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(checkRoundingAttendance.pending, (state) => { state.loading = true; })
      .addCase(checkRoundingAttendance.fulfilled, (state, action) => { state.loading = false; state.roundingCheckInResult = action.payload; })
      .addCase(checkRoundingAttendance.rejected, (state, action) => { state.loading = false; state.error = action.payload; })

      .addCase(fetchStaffSchedules.pending, (state) => { state.loading = true; })
      .addCase(fetchStaffSchedules.fulfilled, (state, action) => { state.loading = false; state.staffSchedules = action.payload; })
      .addCase(fetchStaffSchedules.rejected, (state, action) => { state.loading = false; state.error = action.payload; });
  }
});

export const { clearRoundingResult } = scheduleSlice.actions;
export default scheduleSlice.reducer;
