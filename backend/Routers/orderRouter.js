const express = require("express");
const router = express.Router();
const {
  createOrder,
  searchOrder,
  updatestatusOrder,
  getOrder,
  getOrderStatistics,
  Removeorder,
  createStaffPurchaseRequest,
  getMovementLog
} = require("../controller/orderController");
const {
  authmiddleware,
  adminmiddleware,
  managermiddleware,
  adminOrManagerMiddleware,
  staffStoreGuard
} = require("../middleware/Authmiddleware");

router.post("/createorder", authmiddleware, adminOrManagerMiddleware, createOrder);
router.post("/staff-request", authmiddleware, staffStoreGuard, createStaffPurchaseRequest);
router.get("/getorders", authmiddleware, getOrder);
router.delete("/removeorder/:OrdertId", authmiddleware, adminOrManagerMiddleware, Removeorder);
router.put("/updatestatusOrder/:OrderId", authmiddleware, adminOrManagerMiddleware, updatestatusOrder);
router.get("/Searchdata", authmiddleware, searchOrder);
router.get("/graphstatusorder", authmiddleware, getOrderStatistics);
router.get("/movement-log/:orderId", authmiddleware, adminOrManagerMiddleware, getMovementLog);


module.exports = router;
