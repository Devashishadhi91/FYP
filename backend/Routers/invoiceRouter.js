const express = require('express');
const router = express.Router();
const { generateInvoice } = require('../controller/invoiceController');
const { authmiddleware } = require('../middleware/Authmiddleware');

router.get('/:saleId', authmiddleware, generateInvoice);

module.exports = router;
