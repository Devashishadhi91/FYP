const express=require("express")
const router=express.Router()
const {Addproduct,getTopProductsByQuantity,RemoveProduct,SearchProduct,EditProduct,getProduct,getProductStats,getCategoryStockDistribution,getStockAlerts}=require('../controller/productController')
const {authmiddleware,adminmiddleware,managermiddleware}=require('../middleware/Authmiddleware')


router.post("/addproduct",authmiddleware,Addproduct)
router.delete("/removeproduct/:productId",authmiddleware,RemoveProduct)
router.get("/getproduct",authmiddleware,getProduct)
router.get("/stats", authmiddleware, getProductStats)
router.get("/searchproduct",authmiddleware,SearchProduct)
router.put("/update/:id", authmiddleware, EditProduct)
router.get("/getTopProductsByQuantity",authmiddleware,getTopProductsByQuantity)
router.get("/category-stock-distribution", authmiddleware, getCategoryStockDistribution)
router.get("/stock-alerts", authmiddleware, getStockAlerts)




module.exports=router