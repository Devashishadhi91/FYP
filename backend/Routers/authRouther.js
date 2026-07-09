const express=require("express")
const rateLimit = require('express-rate-limit');
const router=express.Router()
const {signup,login,updateProfile,logout,staffuser,manageruser,adminuser,removeuser,changePassword,adminCreateUser,editUser,getUsersForRole,getDistributors,getRoundingStaffForDistributor,getAllRoundingStaff}=require('../controller/authcontroller')
const {authmiddleware,adminmiddleware,managermiddleware,adminOrManagerMiddleware}=require('../middleware/Authmiddleware')





// Stricter limiter for auth routes: 10 requests per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { message: "Too many login/signup attempts, please try again after 15 minutes" }
});

router.post("/signup", authLimiter, signup)
router.post("/admin-create-user", authmiddleware, adminmiddleware, adminCreateUser)
router.post("/login", authLimiter, login)
router.delete("/removeuser/:UserId", authmiddleware, adminmiddleware, removeuser)
router.get("/staffuser",authmiddleware,staffuser)
router.get("/manageruser",authmiddleware,manageruser)
router.get("/adminuser",authmiddleware,adminuser)
router.get("/users-for-role", authmiddleware, adminOrManagerMiddleware, getUsersForRole)
router.post("/logout",authmiddleware,logout)
router.put("/updateProfile",authmiddleware,updateProfile)
router.put("/change-password", authmiddleware, changePassword)
router.put("/edit-user/:userId", authmiddleware, editUser)
router.get("/distributors", authmiddleware, adminOrManagerMiddleware, getDistributors)
router.get("/rounding-staff", authmiddleware, adminOrManagerMiddleware, getAllRoundingStaff)
router.get("/distributor/:distributorId/staff", authmiddleware, adminOrManagerMiddleware, getRoundingStaffForDistributor)









module.exports=router