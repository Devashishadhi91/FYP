const express = require("express");
const router = express.Router();
const {createSupplier,searchSupplier,editSupplier,getAllSuppliers,deleteSupplier,getSupplierById,getSupplierStats} = require("../controller/suppliercontroller");

router.post("/createsupplier", createSupplier); 
router.get("/getallsupplier", getAllSuppliers); 
router.get("/searchSupplier", searchSupplier);
router.get("/stats/lastmonth", getSupplierStats);
router.get("/:supplierId", getSupplierById); 
router.put("/updatesupplier/:supplierId", editSupplier); 
router.delete("/:supplierId", deleteSupplier); 

module.exports = router;
