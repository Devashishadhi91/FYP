import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";
import toast from 'react-hot-toast';

const initialState = {
  getallStocks: [],
  isgetallStocks: false,
  iscreatedStocks: false,
  searchdata:null

};


export const createPurchases = createAsyncThunk(
  'stocktransaction/createPurchases',
  async (Stocks, { dispatch, rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("stocktransaction/createPurchases", Stocks, { withCredentials: true });
      dispatch(getAllPurchases());
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Stocks creation failed");
    }
  }
);

export const getAllPurchases = createAsyncThunk(
  'stocktransaction/getallPurchases',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get("stocktransaction/getallPurchases", { withCredentials: true });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Purchases retrieval failed");
    }
  }
);

export const searchstockdata=createAsyncThunk(
  'stocktransaction/searchstocks',async (query, { rejectWithValue }) => {
    try {
      const response=await axiosInstance.get(`stocktransaction/searchstocks?query=${query}`,query,{ withCredentials: true,})
      return response.data;
 
     
   } catch (error) {
     return rejectWithValue(error.response?.data?.message || "Stock adding failed");
   }
 })








const purchasesSlice = createSlice({
  name: "stocktransaction",
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
 
   
  
      .addCase(getAllPurchases.pending, (state) => {
        state.isgetallStocks = true;
      })
      .addCase(getAllPurchases.fulfilled, (state, action) => {
        state.isgetallStocks = false;
        state.getallStocks = action.payload.transactions;

      })
      
      
      .addCase(getAllPurchases.rejected, (state, action) => {
        state.isgetallStocks = false;
      
      })



      .addCase(createPurchases .pending, (state) => {
        state.iscreatedStocks = true;
      })
      .addCase(createPurchases .fulfilled, (state, action) => {
        state.iscreatedStocks = false;
        // Data is refreshed via dispatch(getAllPurchases()) in the thunk
      })
      .addCase(createPurchases .rejected, (state, action) => {
        state.iscreatedStocks = false;

      })

     .addCase( searchstockdata.fulfilled,(state,action)=>{
      
       state.searchdata=action.payload
    
    
     })
     
     .addCase(searchstockdata.rejected,(state,action)=>{

  
     })
   





     



  },
});

export default purchasesSlice.reducer;
