import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";
import axiosInstance from "../lib/axios";
import toast from 'react-hot-toast';

const initialState = {
    getallSupplier:null,
    isallSupplier:false,
    isSupplieradd:false,
    isSupplierremove:false,
    searchdata:null,
    issearchdata:false,
    editedSupplier:null,
    iseditedSupplier:false,
    editedsupplier:null,
    supplierStats: [],
    supplierDeliveries: [],
    supplierSummary: [],
    isLoadingStats: false,
 
};



export const CreateSupplier = createAsyncThunk(
  'supplier/createsupplier',
  async (Supplier, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.post("supplier/createsupplier",Supplier, { withCredentials: true });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "supplier creation failed");
    }
  }
);

export const gettingallSupplier = createAsyncThunk(
  'supplier/getallsupplier',
  async (_, { rejectWithValue }) => {
    try {
      const response = await axiosInstance.get('supplier/getallsupplier', { withCredentials: true });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Supplier retrieval failed");
    }
  }
);





  
  export const deleteSupplier = createAsyncThunk(
    'supplier/',
    async (supplierId, { rejectWithValue }) => {
      try {
        const response = await axiosInstance.delete(`supplier/${supplierId}`,supplierId, { withCredentials: true });
        return response.data;
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Supplier remove  failed");
      }
    }
  );
  



  export const SearchSupplier = createAsyncThunk(
    "supplier/searchSupplier",
    async (query, { rejectWithValue }) => {
      try {
        const response = await axiosInstance.get(`supplier/searchSupplier?query=${query}`, { withCredentials: true });
        return response.data;
      } catch (error) {
        return rejectWithValue(error.response?.data?.message || "Supplier search failed");
      }
    }
  );
  

  
  
  export const EditSupplier = createAsyncThunk(
    "supplier/updatesupplier",
    async ({ supplierId, updatedData }, { rejectWithValue }) => {
      try {
        const response = await axiosInstance.put(
          `supplier/updatesupplier/${supplierId}`, 
          updatedData, 
          { withCredentials: true }
        );
        toast.success("Supplier updated successfully"); 
        return response.data; 
      } catch (error) {
        console.log(error)
        const errorMessage =
          error.response?.data?.message || "Failed to update supplier. Please try again.";
        toast.error(errorMessage);
        return rejectWithValue(errorMessage);
      }
    }
  );

export const getSupplierStats = createAsyncThunk(
  "supplier/stats",
  async ({ startDate, endDate, supplierId } = {}, { rejectWithValue }) => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append("startDate", startDate);
      if (endDate) params.append("endDate", endDate);
      if (supplierId) params.append("supplierId", supplierId);
      const query = params.toString() ? `?${params.toString()}` : "";
      const response = await axiosInstance.get(`supplier/stats/lastmonth${query}`, { withCredentials: true });
      return response.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message || "Failed to fetch supplier stats");
    }
  }
);




const supplierSlice = createSlice({
  name: "supplier",
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
 
      .addCase(CreateSupplier .pending, (state) => {
        state.isSupplieradd = true;
      })
      .addCase(CreateSupplier .fulfilled, (state, action) => {
        state.isSupplieradd= false;
        toast.success("Supplier created successfully");
      })
      .addCase(CreateSupplier .rejected, (state, action) => {
        state.isSupplieradd= false;
        toast.error('Error creating Supplier');
      })
      
  
      .addCase(gettingallSupplier.pending, (state) => {
        state.isallSupplier = true;
      })
      .addCase(gettingallSupplier.fulfilled, (state, action) => {
        state.isallSupplier = false;
        state.getallSupplier = action.payload|| [];

      })
      
      
      .addCase(gettingallSupplier.rejected, (state, action) => {
        state. isallSupplier = false;

      })




      .addCase(deleteSupplier.pending, (state) => {
        state.isSupplierremove = true;
      })
      .addCase(deleteSupplier.fulfilled, (state, action) => {
        state.isSupplierremove= false;
        state.getallCategory = action.payload.allCategory || [];

      })
      
      
      .addCase(deleteSupplier.rejected, (state, action) => {
        state.isSupplierremove = false;

      })

 .addCase(SearchSupplier.fulfilled,(state,action)=>{
   // Backend returns { success, suppliers: [...] }, extract the array
   state.searchdata = action.payload.suppliers || action.payload;
 })
 

 .addCase(  SearchSupplier.rejected,(state,action)=>{
 

 })





.addCase(EditSupplier.fulfilled,(state,action)=>{
 state.editedsupplier=action.payload


})


.addCase(EditSupplier.rejected,(state,action)=>{


})

.addCase(getSupplierStats.pending, (state) => {
  state.isLoadingStats = true;
})
.addCase(getSupplierStats.fulfilled, (state, action) => {
  state.isLoadingStats = false;
  state.supplierDeliveries = action.payload?.deliveries || [];
  state.supplierSummary = action.payload?.summary || [];
})
.addCase(getSupplierStats.rejected, (state) => {
  state.isLoadingStats = false;
})





      
  },
});

export default  supplierSlice.reducer;
