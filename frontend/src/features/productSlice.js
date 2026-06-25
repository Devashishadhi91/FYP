import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";
import toast from 'react-hot-toast';

const initialState = {
  getallproduct: [],
  isallproductget: false,
  isproductadd: false,
  isproductremove: false,
  searchdata: null,
  issearchdata: false,
  editedProduct: null,
  iseditedProduct: false,
  gettopproduct: [],
  dashboardStats: null,
  isStatsLoading: false
}

export const Addproduct = createAsyncThunk('product/addproduct', async (product, { dispatch, rejectWithValue }) => {
  try {
    const response = await axiosInstance.post("product/addproduct", product, { withCredentials: true, })
    dispatch(gettingallproducts());
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Product adding failed");
  }
})

export const Removeproduct = createAsyncThunk('product/removeproduct', async (productId, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.delete(`product/removeproduct/${productId}`, { withCredentials: true, })
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Product remove failed");
  }
})

export const EditProduct = createAsyncThunk(
  'product/editproduct',
  async ({ id, updatedData }, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.put(
        `product/update/${id}`,
        updatedData,
        { withCredentials: true }
      );
      return response.data;
    } catch (error) {
      const errorMessage = error.response?.data?.message || "Failed to update product. Please try again.";
      toast.error(errorMessage); 
      return rejectWithValue(errorMessage);
    }
  }
);

export const gettingallproducts = createAsyncThunk('product/getproduct', async (_, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get("product/getproduct", { withCredentials: true, })
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Product getting failed");
  }
})

export const Searchproduct = createAsyncThunk('product/searchproduct', async (query, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get(`product/searchproduct?query=${query}`, { withCredentials: true, })
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Product search failed");
  }
})

export const getTopProductsByQuantity = createAsyncThunk('product/getTopProductsByQuantity', async (_, { rejectWithValue }) => {
  try {
    const response = await axiosInstance.get(`product/getTopProductsByQuantity`, { withCredentials: true, })
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Product getting failed");
  }
})

export const getDashboardStats = createAsyncThunk('product/getDashboardStats', async (storeId, { rejectWithValue }) => {
  try {
    const params = {};
    if (storeId && storeId !== 'all') params.storeId = storeId;
    const response = await axiosInstance.get("product/stats", { params, withCredentials: true });
    return response.data;
  } catch (error) {
    return rejectWithValue(error.response?.data?.message || "Stats fetching failed");
  }
});

const productSlice = createSlice({
  name: "product",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(gettingallproducts.pending, (state) => {
        state.isallproductget = true;
      })
      .addCase(gettingallproducts.fulfilled, (state, action) => {
        state.isallproductget = false;
        state.getallproduct = action.payload.Products || [];
        state.totalProduct = action.payload.totalProduct || 0;
      })
      .addCase(gettingallproducts.rejected, (state) => {
        state.isallproductget = false;
      })
      .addCase(getDashboardStats.pending, (state) => {
        state.isStatsLoading = true;
      })
      .addCase(getDashboardStats.fulfilled, (state, action) => {
        state.isStatsLoading = false;
        state.dashboardStats = action.payload;
      })
      .addCase(getDashboardStats.rejected, (state) => {
        state.isStatsLoading = false;
      })
      .addCase(Removeproduct.fulfilled, (state, action) => {
        state.getallproduct = state.getallproduct.filter(product => product._id !== action.meta.arg);
      })
      .addCase(Addproduct.fulfilled, (state, action) => {
        // Data is refreshed via dispatch(gettingallproducts()) in the thunk
      })
      .addCase(Searchproduct.fulfilled, (state, action) => {
        state.searchdata = action.payload;
      })
      .addCase(EditProduct.fulfilled, (state, action) => {
        state.editedProduct = action.payload;
      })
      .addCase(getTopProductsByQuantity.fulfilled, (state, action) => {
        state.gettopproduct = action.payload.topProducts || [];
      });
  },
});

export default productSlice.reducer;