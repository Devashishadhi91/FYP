const express = require("express");
const router = express.Router();
const { authmiddleware } = require("../middleware/Authmiddleware");
const {
  createNotification,
  getAllNotifications,
  getUnreadNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  getLowStockNotifications,
  deleteAllReadNotifications
} = require("../controller/notificationcontroller");

router.post("/createNotification", authmiddleware, createNotification);
router.get("/allNotification", authmiddleware, getAllNotifications);
router.get("/unreadNotification", authmiddleware, getUnreadNotifications);
router.get("/low-stock", authmiddleware, getLowStockNotifications);
router.put("/mark-all-read", authmiddleware, markAllAsRead);
router.put("/:id/readNotification", authmiddleware, markAsRead);
router.delete("/deleteNotification/:id/", authmiddleware, deleteNotification);
router.delete("/deleteAllRead", authmiddleware, deleteAllReadNotifications);

module.exports = router;
