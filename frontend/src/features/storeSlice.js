import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";

const initialState = {
  stores: [],
  storeStaff: [],
  unassignedStaff: [],
  unassignedStores: [],
  storeReportSummary: [],
  isLoading: false,
  error: null,
};

export const fetchAllStores = createAsyncThunk("store/fetchAll", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get("store/all", { withCredentials: true });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch stores");
  }
});

export const createStore = createAsyncThunk("store/create", async (storeData, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post("store/create", storeData, { withCredentials: true });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to create store");
  }
});

export const updateStore = createAsyncThunk("store/update", async ({ storeId, data }, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.put(`store/update/${storeId}`, data, { withCredentials: true });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to update store");
  }
});

export const deleteStore = createAsyncThunk("store/delete", async (storeId, { rejectWithValue }) => {
  try {
    await axiosInstance.delete(`store/delete/${storeId}`, { withCredentials: true });
    return storeId;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to delete store");
  }
});

export const assignStaffToStore = createAsyncThunk("store/assignStaff", async (data, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.post("store/assign-staff", data, { withCredentials: true });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to assign staff");
  }
});

export const unassignStaff = createAsyncThunk("store/unassignStaff", async (userId, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.delete(`store/unassign-staff/${userId}`, { withCredentials: true });
    return { userId, message: response.data.message };
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to unassign staff");
  }
});

export const fetchStoreStaff = createAsyncThunk("store/fetchStaff", async (storeId, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get(`store/${storeId}/staff`, { withCredentials: true });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch store staff");
  }
});

export const fetchUnassignedStaff = createAsyncThunk("store/fetchUnassigned", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get("store/unassigned-staff", { withCredentials: true });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch unassigned staff");
  }
});

export const fetchUnassignedStores = createAsyncThunk('store/fetchUnassignedStores', async (excludeUserId, { rejectWithValue }) => {
  try {
    const params = excludeUserId ? { excludeUserId } : {};
    const res = await axiosInstance.get('store/unassigned-stores', { params, withCredentials: true });
    return res.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch unassigned stores");
  }
});

export const fetchStoreReportSummary = createAsyncThunk("store/reportSummary", async (_, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get("store/report-summary", { withCredentials: true });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Failed to fetch store report");
  }
});

const storeSlice = createSlice({
  name: "store",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllStores.pending, (state) => { state.isLoading = true; })
      .addCase(fetchAllStores.fulfilled, (state, action) => {
        state.isLoading = false;
        state.stores = action.payload;
      })
      .addCase(fetchAllStores.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload;
      })
      .addCase(createStore.fulfilled, (state, action) => {
        state.stores.unshift(action.payload.store);
      })
      .addCase(updateStore.fulfilled, (state, action) => {
        const idx = state.stores.findIndex(s => s._id === action.payload.store._id);
        if (idx !== -1) state.stores[idx] = action.payload.store;
      })
      .addCase(deleteStore.fulfilled, (state, action) => {
        state.stores = state.stores.filter(s => s._id !== action.payload);
      })
      .addCase(fetchStoreStaff.fulfilled, (state, action) => {
        state.storeStaff = action.payload;
      })
      .addCase(unassignStaff.fulfilled, (state, action) => {
        state.storeStaff = state.storeStaff.filter(u => u._id !== action.payload.userId);
        // Also remove from unassigned since it'll be re-fetched
      })
      .addCase(fetchUnassignedStaff.fulfilled, (state, action) => {
        state.unassignedStaff = action.payload;
      })
      .addCase(fetchUnassignedStores.fulfilled, (state, action) => {
        state.unassignedStores = action.payload;
      })
      .addCase(fetchStoreReportSummary.fulfilled, (state, action) => {
        state.storeReportSummary = action.payload;
      });
  },
});

export default storeSlice.reducer;
