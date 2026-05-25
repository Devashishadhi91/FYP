const express = require('express');
const router = express.Router();
const {
  createStore,
  getAllStores,
  getStoreById,
  updateStore,
  deleteStore,
  assignStaffToStore,
  unassignStaff,
  getStoreStaff,
  getUnassignedStaff,
  getStoreReportSummary,
  getUnassignedStores
} = require('../controller/storeController');
const { authmiddleware, adminmiddleware, adminOrManagerMiddleware } = require('../middleware/Authmiddleware');

// Admin only — store CRUD
router.post('/create', authmiddleware, adminmiddleware, createStore);
router.put('/update/:storeId', authmiddleware, adminmiddleware, updateStore);
router.delete('/delete/:storeId', authmiddleware, adminmiddleware, deleteStore);

// Admin or Manager — viewing and staff management
router.get('/all', authmiddleware, adminOrManagerMiddleware, getAllStores);
router.get('/unassigned-staff', authmiddleware, adminOrManagerMiddleware, getUnassignedStaff);
router.get('/unassigned-stores', authmiddleware, adminOrManagerMiddleware, getUnassignedStores);
router.get('/report-summary', authmiddleware, adminOrManagerMiddleware, getStoreReportSummary);
router.post('/assign-staff', authmiddleware, adminOrManagerMiddleware, assignStaffToStore);
router.delete('/unassign-staff/:userId', authmiddleware, adminOrManagerMiddleware, unassignStaff);
router.get('/:storeId/staff', authmiddleware, adminOrManagerMiddleware, getStoreStaff);
router.get('/:storeId', authmiddleware, adminOrManagerMiddleware, getStoreById);

module.exports = router;
