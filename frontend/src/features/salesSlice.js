import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";
import toast from 'react-hot-toast';

const initialState = {
  getallsales: null,
  isgetallsales: false,
  iscreatedsales: false,
  editedsales:null,
  searchdata:null
  
};


export const CreateSales = createAsyncThunk(
    'sales/createsales',
  async (salesData, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("sales/createsales", salesData, { withCredentials: true });
      dispatch(gettingallSales());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "sales creation failed");
    }
  }
);

export const gettingallSales = createAsyncThunk(
  'sales/getallsales',
  async (filters = {}, { rejectWithValue }) => {
    try {
      const params = {};
      if (filters.storeId && filters.storeId !== 'all') params.storeId = filters.storeId;
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      const response = await axiosInstance.get("sales/getallsales", { params, withCredentials: true });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "sales retrieval failed");
    }
  }
);


 
export const EditSales = createAsyncThunk(
  "sales/updatesales",
  async ({ salesId, updatedData }, { rejectWithValue }) => {
    if (!salesId) {
      toast.error("Invalid Sale ID");
      return rejectWithValue("Invalid Sale ID");
    }

    try {
      const response = await axiosInstance.put(
        `sales/updatesales/${salesId}`,
        updatedData, 
        { withCredentials: true }
      );
      toast.success("Sale updated successfully");
      return response.data;
    } catch (error) {
      console.error("EditSales Error:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to update sale. Please try again.";
      toast.error(errorMessage);
      return rejectWithValue(errorMessage);
    }
  }
);


export const searchsalesdata=createAsyncThunk(
  'sales/searchdata',async (query, { rejectWithValue }) => {
    try {
      const response=await axiosInstance.get(`sales/searchdata?query=${query}`, { withCredentials: true,})
      return response.data;
 
     
   } catch (error) {
     return rejectWithValue(error.response?.data?.message || "sales search failed");
   }
 })

export const DeleteSale = createAsyncThunk(
  'sales/deletesale',
  async (saleId, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.delete(`sales/deletesale/${saleId}`, { withCredentials: true });
      toast.success("Sale deleted successfully");
      return saleId; // return the id so reducer can filter it out
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to delete sale");
      return rejectWithValue(error.response?.data?.message || "Delete failed");
    }
  }
);


const salesSlice = createSlice({
  name: "sales",
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
 
   
  
      .addCase(gettingallSales.pending, (state) => {
        state.isgetallsales = true;
      })
      .addCase(gettingallSales.fulfilled, (state, action) => {
        state.isgetallsales = false;
        state.getallsales = action.payload;

      })
      
      
      .addCase(gettingallSales.rejected, (state, action) => {
        state.isgetallsales = false;
        toast.error(action.payload || 'Error retrieving sales');
      })



      .addCase( CreateSales .pending, (state) => {
        state.iscreatedsales = true;
      })
      .addCase( CreateSales .fulfilled, (state, action) => {
        state.iscreatedsales = false;
        // Data is refreshed via dispatch(gettingallSales()) in the thunk
      })
      .addCase( CreateSales .rejected, (state, action) => {
        state.iscreatedsales = false;

      })


      .addCase(EditSales.fulfilled,(state,action)=>{
        state.editedsales=action.payload
       
       
       })
       
       
       .addCase(EditSales.rejected,(state,action)=>{
       

       })
       

       .addCase(searchsalesdata.fulfilled,(state,action)=>{
       
        state.searchdata=action.payload
     
     
      })
      
     
      .addCase(searchsalesdata.rejected,(state,action)=>{

      })
      
      .addCase(DeleteSale.fulfilled, (state, action) => {
        state.getallsales = state.getallsales?.filter(sale => sale._id !== action.payload);
      })
      
      .addCase(DeleteSale.rejected, (state, action) => {
        // Handle error if needed
      })
    



  },
});

export default salesSlice.reducer;
