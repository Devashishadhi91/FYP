
const jwt=require('jsonwebtoken')
const User=require('../models/Usermodel')
require('dotenv').config();

module.exports.authmiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.Inventorymanagmentsystem;

    if (!token) {
      return res.status(401).json({ message: "Unauthorized: No token provided." });
    }

 
    const decodedToken = jwt.verify(token, process.env.SecretKey);

    

    if (!decodedToken || !decodedToken.userId) {
      return res.status(401).json({ message: "Unauthorized: Invalid token." });
    }

   
    const user = await User.findById(decodedToken.userId).select("-password").populate("storeId", "name address");

    if (!user) {
      return res.status(401).json({ message: "Unauthorized: User not found." });
    }

    
    req.user = user;
    next();
  } catch (error) {
    console.error("Token verification error:", error.message);
    return res.status(401).json({ message: "Unauthorized: Invalid or expired token." });
  }
};

  module.exports.adminmiddleware=async(req,res,next)=>{
    const user=req.user
    try {
        if(!user){
            return res.status(403).json({ message: "Access denied." });
        }

        if(user.role!=="admin"){
            return res.status(403).json({ message: "Access denied. admin role required." });
        }
        next()
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized: Invalid or expired token." });
    }
    
}



module.exports.managermiddleware=async(req,res,next)=>{
    const user=req.user
    try {
        if(!user){
            return res.status(403).json({ message: "Access denied." });
        }

        if(user.role!=="manager"){
            return res.status(403).json({ message: "Access denied. manager role required." });
        }
        next()
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized: Invalid or expired token." });
    }
    
}

module.exports.adminOrManagerMiddleware = async (req, res, next) => {
    const user = req.user;
    try {
        if (!user) {
            return res.status(403).json({ message: "Access denied." });
        }

        if (user.role !== "admin" && user.role !== "manager") {
            return res.status(403).json({ message: "Access denied. Admin or Manager role required." });
        }
        next();
    } catch (error) {
        return res.status(401).json({ message: "Unauthorized: Invalid or expired token." });
    }
};

module.exports.staffStoreGuard = async (req, res, next) => {
  const user = req.user;
  // Rounding staff have no fixed store — allow them through
  if (user.role === 'staff' && !user.storeId && !user.isRounding) {
    return res.status(403).json({
      message: "Access denied. Your account is not assigned to any store. Contact your admin."
    });
  }
  next();
};
