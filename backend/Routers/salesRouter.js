const express = require("express");
const router = express.Router();
const { createSale, getAllSales, SearchSales, getSaleById, updateSale, getMonthlySalesSummary, getStoreSalesStats, deleteSale } = require("../controller/salescontroller");
const { authmiddleware, adminOrManagerMiddleware, staffStoreGuard } = require('../middleware/Authmiddleware');

router.post("/createsales", authmiddleware, staffStoreGuard, createSale);
router.get("/getallsales", authmiddleware, staffStoreGuard, getAllSales); 
router.get("/monthly-summary", authmiddleware, getMonthlySalesSummary);
router.get("/store-stats", authmiddleware, getStoreSalesStats);
router.get("/searchdata", authmiddleware, SearchSales); 
router.get("/:saleId", authmiddleware, getSaleById);
router.put("/updatesales/:saleId", authmiddleware, adminOrManagerMiddleware, updateSale);
router.delete("/deletesale/:saleId", authmiddleware, adminOrManagerMiddleware, deleteSale);

module.exports = router;
