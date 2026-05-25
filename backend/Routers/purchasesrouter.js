const express = require('express');
const router = express.Router();
const { createPurchases, getAllPurchases, searchStocks, getPurchasesByProduct, getPurchasesBySupplier, getStoreInventory } = require('../controller/purchasescontroller');

const { authmiddleware, staffStoreGuard } = require("../middleware/Authmiddleware");

router.post('/createPurchases', authmiddleware, staffStoreGuard, createPurchases);
router.get('/getallPurchases', authmiddleware, staffStoreGuard, getAllPurchases);
router.get('/store-inventory', authmiddleware, getStoreInventory);
router.get('/product/:productId', authmiddleware, getPurchasesByProduct);
router.get('/supplier/:supplierId', authmiddleware, getPurchasesBySupplier);
router.get('/searchstocks', authmiddleware, searchStocks);

module.exports = router;
