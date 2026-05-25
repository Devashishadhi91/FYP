const Store = require('../models/Storemodel');
const User = require('../models/Usermodel');
const logger = require('../libs/appLogger');
const logActivity = require('../libs/logger');

// Create a new store (admin only)
module.exports.createStore = async (req, res) => {
  try {
    const { name, address, contactNumber } = req.body;

    if (!name || !address) {
      return res.status(400).json({ message: "Store name and address are required." });
    }

    const existing = await Store.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
    if (existing) {
      return res.status(409).json({ message: "A store with this name already exists." });
    }

    const store = new Store({ name, address, contactNumber });
    await store.save();

    await logActivity({
      action: "Create Store",
      description: `Store "${name}" was created.`,
      entity: "store",
      entityId: store._id,
      userId: req.user._id,
      ipAddress: req.ip,
    });

    res.status(201).json({ message: "Store created successfully", store });
  } catch (error) {
    logger.error("Error creating store:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Get all stores — admin and manager can see all stores
module.exports.getAllStores = async (req, res) => {
  try {
    const stores = await Store.find({}).sort({ createdAt: -1 });

    // Attach staff count to each store
    const storesWithStats = await Promise.all(
      stores.map(async (store) => {
        const staffCount = await User.countDocuments({ storeId: store._id, role: 'staff' });
        return { ...store.toObject(), staffCount };
      })
    );

    res.status(200).json(storesWithStats);
  } catch (error) {
    res.status(500).json({ message: "Error fetching stores", error: error.message });
  }
};

// Get a single store
module.exports.getStoreById = async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });
    res.status(200).json(store);
  } catch (error) {
    res.status(500).json({ message: "Error fetching store", error: error.message });
  }
};

// Update a store (admin only)
module.exports.updateStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const { name, address, contactNumber } = req.body;

    const updatedStore = await Store.findByIdAndUpdate(
      storeId,
      { name, address, contactNumber },
      { new: true }
    );
    if (!updatedStore) return res.status(404).json({ message: "Store not found" });

    await logActivity({
      action: "Update Store",
      description: `Store "${updatedStore.name}" was updated.`,
      entity: "store",
      entityId: updatedStore._id,
      userId: req.user._id,
      ipAddress: req.ip,
    });

    res.status(200).json({ message: "Store updated successfully", store: updatedStore });
  } catch (error) {
    logger.error("Error updating store:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Delete a store (admin only)
module.exports.deleteStore = async (req, res) => {
  try {
    const { storeId } = req.params;
    const store = await Store.findByIdAndDelete(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });

    // Unassign all staff from this store
    await User.updateMany({ storeId: storeId }, { storeId: null });

    await logActivity({
      action: "Delete Store",
      description: `Store "${store.name}" was deleted.`,
      entity: "store",
      entityId: store._id,
      userId: req.user._id,
      ipAddress: req.ip,
    });

    res.status(200).json({ message: "Store deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting store", error: error.message });
  }
};

// Assign a staff member to a store (admin or manager)
module.exports.assignStaffToStore = async (req, res) => {
  try {
    const { userId, storeId } = req.body;

    const store = await Store.findById(storeId);
    if (!store) return res.status(404).json({ message: "Store not found" });

    const user = await User.findById(userId).populate('storeId');
    if (!user) return res.status(404).json({ message: "User not found" });
    if (user.role !== 'staff') {
      return res.status(400).json({ message: "Only staff members can be assigned to stores." });
    }

    const alreadyAssigned = await User.findOne({
      storeId: storeId,
      role: 'staff',
      _id: { $ne: userId }
    });
    if (alreadyAssigned) {
      return res.status(409).json({
        message: `Store "${store.name}" is already assigned to ${alreadyAssigned.name}. Unassign them first.`
      });
    }

    let description = `${user.name} was assigned to store "${store.name}".`;
    if (user.storeId && user.storeId._id.toString() !== storeId.toString()) {
      description = `${user.name} was re-assigned from store "${user.storeId.name}" to store "${store.name}".`;
    } else if (user.storeId && user.storeId._id.toString() === storeId.toString()) {
      return res.status(200).json({ message: `${user.name} is already assigned to ${store.name}.` });
    }

    await User.findByIdAndUpdate(userId, { storeId: storeId });

    await logActivity({
      action: "Assign Staff",
      description: description,
      entity: "user",
      entityId: user._id,
      userId: req.user._id,
      ipAddress: req.ip,
    });

    res.status(200).json({ message: `${user.name} successfully assigned to ${store.name}` });
  } catch (error) {
    logger.error("Error assigning staff:", error);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};

// Remove a staff member from their store (unassign)
module.exports.unassignStaff = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const oldStoreName = user.storeId ? (await Store.findById(user.storeId))?.name : "N/A";
    await User.findByIdAndUpdate(userId, { storeId: null });

    await logActivity({
      action: "Unassign Staff",
      description: `${user.name} was removed from store "${oldStoreName}".`,
      entity: "user",
      entityId: user._id,
      userId: req.user._id,
      ipAddress: req.ip,
    });

    res.status(200).json({ message: `${user.name} has been unassigned.` });
  } catch (error) {
    res.status(500).json({ message: "Error unassigning staff", error: error.message });
  }
};

// Get all staff for a specific store (admin or manager)
module.exports.getStoreStaff = async (req, res) => {
  try {
    const { storeId } = req.params;
    const staff = await User.find({ storeId: storeId, role: 'staff' }).select('-password');
    res.status(200).json(staff);
  } catch (error) {
    res.status(500).json({ message: "Error fetching store staff", error: error.message });
  }
};

// Get all unassigned staff (admin or manager)
module.exports.getUnassignedStaff = async (req, res) => {
  try {
    const unassigned = await User.find({ role: 'staff', storeId: null }).select('-password');
    res.status(200).json(unassigned);
  } catch (error) {
    res.status(500).json({ message: "Error fetching unassigned staff", error: error.message });
  }
};

// Get per-store revenue summary (admin and manager)
module.exports.getStoreReportSummary = async (req, res) => {
  try {
    const Sale = require('../models/Salesmodel');

    const storeReport = await Sale.aggregate([
      {
        $group: {
          _id: "$storeId",
          totalRevenue: { $sum: "$totalAmount" },
          totalTransactions: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "stores",
          localField: "_id",
          foreignField: "_id",
          as: "storeInfo"
        }
      },
      { $unwind: { path: "$storeInfo", preserveNullAndEmptyArrays: true } },
      {
        $project: {
          storeName: { $ifNull: ["$storeInfo.name", "Unknown Store"] },
          storeAddress: "$storeInfo.address",
          totalRevenue: 1,
          totalTransactions: 1
        }
      },
      { $sort: { totalRevenue: -1 } }
    ]);

    res.status(200).json(storeReport);
  } catch (error) {
    res.status(500).json({ message: "Error fetching store report", error: error.message });
  }
};

// Get stores that are NOT assigned to any staff member
module.exports.getUnassignedStores = async (req, res) => {
  try {
    const { excludeUserId } = req.query;
    
    const query = { role: 'staff', storeId: { $ne: null } };
    if (excludeUserId) {
      query._id = { $ne: excludeUserId };
    }
    
    const assignedStoreIds = await User.find(query).distinct('storeId');
    const unassignedStores = await Store.find({ _id: { $nin: assignedStoreIds } });
    
    res.status(200).json(unassignedStores);
  } catch (error) {
    res.status(500).json({ message: "Error fetching unassigned stores", error: error.message });
  }
};

