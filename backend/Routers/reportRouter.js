const express = require('express');
const router = express.Router();
const { getSalesReport, getInventoryReport } = require('../controller/reportController');
const { authmiddleware, adminOrManagerMiddleware } = require('../middleware/Authmiddleware');

// Restrict reports to Admin or Manager
router.use(authmiddleware);
router.use(adminOrManagerMiddleware);

router.get('/sales', getSalesReport);
router.get('/inventory', getInventoryReport);

module.exports = router;
