
import { configureStore } from "@reduxjs/toolkit";
import authReducer from "../features/authSlice";
import productReducer from "../features/productSlice"
import categoryReducer from "../features/categorySlice"
import supplierReducer from "../features/SupplierSlice"
import  activityReducer from '../features/activitySlice'
import orderReducer from "../features/orderSlice"
import notificationReducer from  "../features/notificationSlice"
import stocktransactionReducer from '../features/purchasesSlice'
import salesReducer from "../features/salesSlice";
import storeReducer from "../features/storeSlice";
import attendanceReducer from "../features/attendanceSlice";
import scheduleReducer from "../features/scheduleSlice";

const store=configureStore({
    reducer:{
        auth:authReducer,
        product:productReducer,
        category:categoryReducer,
        supplier:supplierReducer,
        activity:activityReducer,
        order:orderReducer,
        notification:notificationReducer,
        stocktransaction:stocktransactionReducer,
        sales: salesReducer,
        store: storeReducer,
        attendance: attendanceReducer,
        schedule: scheduleReducer
    }
})
export default store;