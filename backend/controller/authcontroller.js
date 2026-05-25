const User = require('../models/Usermodel')
const Store = require('../models/Storemodel')
const logger = require('../libs/appLogger');
const bcrypt = require("bcryptjs");
const generateToken = require('../libs/Tokengenerator')
const Cloundinary = require('../libs/Cloundinary')
const logActivity = require('../libs/logger');

module.exports.signup = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    const duplicatedUser = await User.findOne({ email });
    if (duplicatedUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedpassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedpassword,
      ProfilePic: "",
      role,
    });

    const savedUser = await newUser.save();
    const token = await generateToken(savedUser, res);

    res.status(201).json({
      message: "Signup successful",
      savedUser: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        ProfilePic: savedUser.ProfilePic,
        storeId: savedUser.storeId || null,
        token,
      },
    });

    await logActivity({
      action: "User Signup",
      description: `User ${name} signed up.`,
      entity: "user",
      entityId: savedUser._id,
      userId: savedUser._id,
      ipAddress: req.ip,
    });

  } catch (error) {
    logger.error("Error during signup:", error.message);
    if (error.code === 11000) {
      return res.status(409).json({ message: "User already exists" });
    }
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports.adminCreateUser = async (req, res) => {
  try {
    const { name, email, password, role, storeId, isRounding } = req.body;

    const duplicatedUser = await User.findOne({ email });
    if (duplicatedUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedpassword = await bcrypt.hash(password, 10);

    const newUser = new User({
      name,
      email,
      password: hashedpassword,
      ProfilePic: "",
      role: role || "staff",
      storeId: isRounding ? null : (storeId || null),
      isRounding: isRounding ? true : false,
    });

    const savedUser = await newUser.save();

    await logActivity({
      action: "Admin Created User",
      description: `Admin ${req.user.name} created user ${name} (${role}${isRounding ? ', rounding' : ''}).`,
      entity: "user",
      entityId: savedUser._id,
      userId: req.user._id,
      ipAddress: req.ip,
    });

    res.status(201).json({
      message: "User created successfully",
      savedUser: {
        id: savedUser._id,
        name: savedUser.name,
        email: savedUser.email,
        role: savedUser.role,
        storeId: savedUser.storeId,
        isRounding: savedUser.isRounding,
      },
    });

  } catch (error) {
    logger.error("Error during adminCreateUser:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const ipAddress = req.ip;
    const duplicatedUser = await User.findOne({ email }).populate('storeId', 'name address');

    if (!duplicatedUser) {
      return res.status(400).json({ message: "No user found" })
    }

    const hasedpassword = await bcrypt.compare(password, duplicatedUser.password)

    if (!hasedpassword) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const token = await generateToken(duplicatedUser, res)

    await logActivity({
      action: "User Login",
      description: `User ${duplicatedUser.name} logged in.`,
      entity: "user",
      entityId: duplicatedUser._id,
      userId: duplicatedUser._id,
      ipAddress: ipAddress,
    });

    return res.status(200).json({
      message: "login successfully",
      user: {
        id: duplicatedUser.id,
        name: duplicatedUser.name,
        email: duplicatedUser.email,
        role: duplicatedUser.role,
        ProfilePic: duplicatedUser.ProfilePic,
        storeId: duplicatedUser.storeId || null,
        token
      }
    })

  } catch (error) {
    logger.error("Login error:", error.message);
    res.status(500).json({
      error: "Internal Server Error"
    })
  }
}

module.exports.logout = async (req, res) => {
  try {
    res.cookie("Inventorymanagmentsystem", '', { maxAge: 0 })
    res.status(200).json({ message: "Logged out successfully" })
  } catch (error) {
    res.status(500).json({
      message: 'An error occurred during logout. Please try again.',
      error: error.message,
    });
  }
}

module.exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user._id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Incorrect current password" });
    }

    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    await logActivity({
      action: "Change Password",
      description: `User ${user.name} changed their password.`,
      entity: "user",
      entityId: user._id,
      userId: user._id,
      ipAddress: req.ip,
    });

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    logger.error("Error in changePassword:", error.message);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

module.exports.updateProfile = async (req, res) => {
  try {
    const { ProfilePic } = req.body;
    const userId = req.user?._id;

    if (!userId) {
      return res.status(400).json({ message: "User not authenticated" });
    }

    if (ProfilePic) {
      try {
        const uploadResponse = await Cloundinary.uploader.upload(ProfilePic, {
          folder: "profile_inventory_system",
          upload_preset: "upload",
        });

        const updatedUser = await User.findOneAndUpdate(
          { _id: userId },
          { ProfilePic: uploadResponse.secure_url },
          { new: true }
        );

        if (!updatedUser) {
          return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
          message: "Profile updated successfully",
          updatedUser
        });

      } catch (cloudinaryError) {
        logger.error("Cloudinary upload failed:", cloudinaryError);
        return res.status(500).json({ message: "Image upload failed", error: cloudinaryError.message });
      }
    } else {
      return res.status(400).json({ message: "No profile picture provided" });
    }
  } catch (error) {
    logger.error("Error in update profile Controller", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

module.exports.staffuser = async (req, res) => {
  try {
    const staffuser = await User.find({ role: "staff" }).select("-password");
    if (staffuser.length === 0) {
      return res.status(200).json({ message: "There are no staff users available." });
    }
    res.status(200).json(staffuser);
  } catch (error) {
    logger.info("Error in get staff Controller:", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

module.exports.manageruser = async (req, res) => {
  try {
    const manageruser = await User.find({ role: "manager" }).select("-password");
    if (manageruser.length === 0) {
      return res.status(200).json({ message: "There are no manager users available." });
    }
    res.status(200).json(manageruser);
  } catch (error) {
    logger.info("Error in get manager Controller:", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
};

module.exports.adminuser = async (req, res) => {
  try {
    const adminuser = await User.find({ role: "admin" }).select("-password");
    if (adminuser.length === 0) {
      return res.status(200).json({ message: "There are no admin users available." });
    }
    res.status(200).json(adminuser);
  } catch (error) {
    logger.info("Error in get admin Controller:", error.message);
    res.status(500).json({ message: "Internal Server Error", error });
  }
}

module.exports.removeuser = async (req, res) => {
  try {
    const { UserId } = req.params;
    if (!UserId) {
      return res.status(400).json({ message: "User ID is required" });
    }
    const deleteUser = await User.findByIdAndDelete(UserId);
    if (!deleteUser) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    logger.error("Error deleting user:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.editUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const { name, email, storeId, role, password, isRounding } = req.body;
    const currentUser = req.user;

    const targetUser = await User.findById(userId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    if (currentUser.role === 'admin') {
      if (targetUser.role === 'admin' && currentUser._id.toString() !== targetUser._id.toString()) {
        return res.status(403).json({ message: "Admin cannot edit another admin" });
      }
      if (currentUser._id.toString() === targetUser._id.toString() && role && role !== targetUser.role) {
        return res.status(403).json({ message: "You cannot change your own role" });
      }
    } else if (currentUser.role === 'manager') {
      if (targetUser.role === 'admin' || targetUser.role === 'manager') {
        return res.status(403).json({ message: "Manager can only edit staff" });
      }
      if (role && role !== targetUser.role) {
        return res.status(403).json({ message: "Managers cannot change roles" });
      }
    } else {
      return res.status(403).json({ message: "Unauthorized role" });
    }

    const updates = {};
    if (name) updates.name = name;
    if (email) updates.email = email;
    if (role && currentUser.role === 'admin') updates.role = role;
    if (typeof isRounding !== 'undefined') updates.isRounding = isRounding;
    
    const finalRole = updates.role || targetUser.role;
    const finalIsRounding = typeof isRounding !== 'undefined' ? isRounding : targetUser.isRounding;

    if (finalRole === 'staff' && !finalIsRounding) {
      if (storeId === null || storeId === "") {
        updates.storeId = null;
      } else if (storeId !== undefined) {
        const storeExists = await Store.findById(storeId);
        if (!storeExists) {
          return res.status(404).json({ message: "Store not found" });
        }
        
        const existingStaff = await User.findOne({ storeId, _id: { $ne: userId }, role: 'staff', isRounding: { $ne: true } });
        if (existingStaff) {
          return res.status(409).json({ message: "This store is already assigned to another staff member." });
        }
        updates.storeId = storeId;
      }
    } else if (finalIsRounding) {
      // Rounding staff: clear storeId
      updates.storeId = null;
    } else if (storeId !== undefined) {
      updates.storeId = storeId === "" ? null : storeId;
    }

    if (password) {
      updates.password = await bcrypt.hash(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true, runValidators: true }).select('-password');

    await logActivity({
      action: "Edit User",
      description: `User ${updatedUser.name} (${updatedUser.role}) was edited.`,
      entity: "user",
      entityId: updatedUser._id,
      userId: currentUser._id,
      ipAddress: req.ip,
    });

    res.status(200).json({ message: "User updated successfully", user: updatedUser });

  } catch (error) {
    logger.error("Error during editUser:", error.message);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

module.exports.getUsersForRole = async (req, res) => {
  try {
    const { role } = req.query;
    if (!role) {
      return res.status(400).json({ message: "Role query parameter is required" });
    }
    
    if (req.user.role === 'manager' && role !== 'staff') {
      return res.status(403).json({ message: "Managers can only view staff" });
    }

    const users = await User.find({ role }).populate('storeId', 'name address').select('-password');
    res.status(200).json(users);
  } catch (error) {
    logger.error("Error in getUsersForRole:", error.message);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
