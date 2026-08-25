const Sale = require("../models/Salesmodel");
const ProductModel = require("../models/Productmodel");
const StoreInventory = require("../models/StoreInventorymodel");
const logActivity = require("../libs/logger");
const logger = require("../libs/appLogger");
const Purchases = require("../models/Purchasesmodel");
const { checkAndCreateLowStockAlerts, createActivityBroadcast } = require("./notificationcontroller");
const { resolveTargetStoreId } = require("../libs/authUtils");

module.exports.createSale = async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;
  const userStoreId = req.user.storeId?._id || req.user.storeId;
  const ipAddress = req.ip;

  try {
    const { customerName, products, paymentMethod, paymentStatus, partialAmount, status, storeId } = req.body;

    if (!customerName || !products || !Array.isArray(products) || products.length === 0) {
      return res.status(400).json({ success: false, message: "Missing required fields or empty product list" });
    }

    let targetStoreId;
    try {
      targetStoreId = resolveTargetStoreId(req.user, storeId);
    } catch (err) {
      return res.status(400).json({ message: "No store assigned. Cannot create sale." });
    }

    let totalAmount = 0;
    const productsToUpdate = [];

    // --- Stock check and deduction based on role ---
    // Admin deducts from global warehouse (Product.quantity)
    // Staff/Manager deduct from their StoreInventory
    for (const item of products) {
      if (!item.product || !item.quantity || !item.price) {
        return res.status(400).json({ message: "Invalid product data in list" });
      }

      const productRecord = await ProductModel.findById(item.product);
      if (!productRecord) {
        return res.status(404).json({ message: `Product with ID ${item.product} not found` });
      }

      if (userRole === 'admin') {
        // Admin sells from warehouse directly
        if (productRecord.quantity < item.quantity) {
          return res.status(400).json({
            message: `Insufficient warehouse stock for ${productRecord.name}`,
            available: productRecord.quantity
          });
        }
      } else {
        // Staff/Manager sell from their store's inventory
        const storeInv = await StoreInventory.findOne({ storeId: targetStoreId, product: item.product });
        const storeQty = storeInv?.quantity || 0;
        if (storeQty < item.quantity) {
          return res.status(400).json({
            message: `Insufficient store stock for ${productRecord.name}. Store has: ${storeQty}`,
            available: storeQty
          });
        }
      }

      totalAmount += Number(item.quantity) * Number(item.price);
      productsToUpdate.push({ record: productRecord, quantity: Number(item.quantity) });
    }

    const newSale = new Sale({
      customerName,
      products,
      totalAmount,
      paymentMethod: paymentMethod || "cash",
      paymentStatus,
      partialAmount: partialAmount || 0,
      status: status || (paymentStatus === "paid" ? "completed" : "pending"),
      storeId: targetStoreId
    });

    await newSale.save();

    // Deduct stock: admin from warehouse, staff/manager from store inventory
    for (const update of productsToUpdate) {
      if (userRole === 'admin') {
        update.record.quantity -= update.quantity;
        await update.record.save();
      } else {
        await StoreInventory.findOneAndUpdate(
          { storeId: targetStoreId, product: update.record._id },
          [{ $set: { quantity: { $max: [0, { $subtract: ["$quantity", update.quantity] }] } } }]
        );
      }
    }

    const transactionPromises = productsToUpdate.map(update => {
      const transaction = new Purchases({
        product: update.record._id,
        type: "sale",
        quantityChanged: -update.quantity,
        previousQuantity: update.record.quantity + update.quantity,
        newQuantity: update.record.quantity,
        reference: newSale._id,
        userId: userId,
        storeId: targetStoreId
      });
      return transaction.save();
    });

    await Promise.all(transactionPromises);

    const io = req.app.get("io");
    const alertedProducts = await checkAndCreateLowStockAlerts(io);

    if (io && alertedProducts.length > 0) {
      alertedProducts.forEach(alert => io.emit("lowStockAlert", alert));
    }

    await logActivity({
      action: "Create Sale",
      description: `Sale created for ${customerName} at store ${targetStoreId}. Total: ${totalAmount}`,
      entity: "sale",
      entityId: newSale._id,
      userId: userId,
      ipAddress: ipAddress,
    });

    // Populate product details before returning
    const populatedSale = await Sale.findById(newSale._id).populate({
      path: 'products.product',
      select: 'name quantity Category SubCategory Price MRP'
    });

    // Broadcast activity to actor + admins/managers
    const productNames = populatedSale.products.map(p => p.product?.name || 'Unknown').join(', ');
    await createActivityBroadcast(io, {
      actorUser: req.user,
      title: 'Sale Recorded',
      message: `${req.user.name} recorded a sale of ${productNames} totalling NPR ${totalAmount.toFixed(2)} for customer ${customerName}.`,
      storeId: targetStoreId
    });

    res.status(201).json({ success: true, message: "Sale created successfully", sale: populatedSale });
  } catch (error) {
    logger.error("Create Sale Error:", error);
    res.status(500).json({ success: false, message: "Error creating sale", error: error.message });
  }
};

module.exports.getAllSales = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userStoreId = req.user.storeId?._id || req.user.storeId;
    const { storeId, startDate, endDate } = req.query;

    let filter = {};

    if (userRole === 'staff' || userRole === 'manager') {
      // Staff and Managers always scoped to their store only
      filter.storeId = userStoreId;
    } else {
      // Admin or Manager: optional storeId and date range filters
      if (storeId && storeId !== 'all') filter.storeId = storeId;
      if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate) filter.createdAt.$gte = new Date(startDate);
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999);
          filter.createdAt.$lte = end;
        }
      }
    }

    const sales = await Sale.find(filter)
      .populate({
        path: 'products.product',
        select: 'name quantity Category SubCategory Price MRP'
      })
      .populate('storeId', 'name address')
      .sort({ createdAt: -1 });

    res.status(200).json(sales);
  } catch (error) {
    res.status(500).json({ message: 'Error getting sales', error: error.message });
  }
};

module.exports.getMonthlySalesSummary = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userStoreId = req.user.storeId?._id || req.user.storeId;

    const twelveMonthsAgo = new Date();
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 11);
    twelveMonthsAgo.setDate(1);
    twelveMonthsAgo.setHours(0, 0, 0, 0);

    const matchStage = { createdAt: { $gte: twelveMonthsAgo } };
    if (userRole !== 'admin') {
      matchStage.storeId = userStoreId;
    }

    const summary = await Sale.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: { year: { $year: "$createdAt" }, month: { $month: "$createdAt" } },
          revenue: { $sum: "$totalAmount" },
          transactions: { $sum: 1 }
        }
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } }
    ]);

    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    const formattedSummary = summary.map(item => ({
      month: `${months[item._id.month - 1]} ${item._id.year}`,
      revenue: item.revenue,
      transactions: item.transactions
    }));

    const now = new Date();
    const currentMonthData = summary.find(
      s => s._id.year === now.getFullYear() && s._id.month === (now.getMonth() + 1)
    ) || { revenue: 0, transactions: 0 };

    res.status(200).json({
      summary: formattedSummary,
      currentMonth: { revenue: currentMonthData.revenue, transactions: currentMonthData.transactions }
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching monthly summary", error: error.message });
  }
};

module.exports.updateSale = async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;
  const userStoreId = req.user.storeId?._id || req.user.storeId;
  const ipAddress = req.ip;

  try {
    const salesId = req.params.saleId;
    const updatedData = req.body;

    if (!updatedData || !Array.isArray(updatedData.products)) {
      return res.status(400).json({ message: "Invalid update data provided." });
    }

    const originalSale = await Sale.findById(salesId);
    if (!originalSale) {
      return res.status(404).json({ message: "Original sale record not found." });
    }

    // Determine target store for this sale
    const targetStoreId = originalSale.storeId;

    // Restore old quantities based on user role
    for (const item of originalSale.products) {
      if (userRole === 'admin') {
        // Admin restores to global warehouse
        await ProductModel.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } });
      } else {
        // Staff/Manager restore to their store inventory
        await StoreInventory.findOneAndUpdate(
          { storeId: targetStoreId, product: item.product },
          { $inc: { quantity: item.quantity } }
        );
      }
    }

    let updatedTotalAmount = 0;
    const newDeductions = [];

    // Validate new products and check stock availability
    for (const item of updatedData.products) {
      const productRecord = await ProductModel.findById(item.product);
      if (!productRecord) throw new Error(`Product ${item.product} no longer exists.`);

      if (userRole === 'admin') {
        // Admin checks global warehouse stock
        if (productRecord.quantity < item.quantity) {
          throw new Error(`Insufficient warehouse stock for ${productRecord.name}. Available: ${productRecord.quantity}`);
        }
      } else {
        // Staff/Manager check their store inventory
        const storeInv = await StoreInventory.findOne({ storeId: targetStoreId, product: item.product });
        const storeQty = storeInv?.quantity || 0;
        if (storeQty < item.quantity) {
          throw new Error(`Insufficient store stock for ${productRecord.name}. Available: ${storeQty}`);
        }
      }

      updatedTotalAmount += Number(item.quantity) * Number(item.price);
      newDeductions.push({ id: item.product, quantity: Number(item.quantity) });
    }

    // Deduct new quantities based on user role
    for (const deduction of newDeductions) {
      if (userRole === 'admin') {
        // Admin deducts from global warehouse
        await ProductModel.findByIdAndUpdate(deduction.id, { $inc: { quantity: -deduction.quantity } });
      } else {
        // Staff/Manager deduct from their store inventory (floor at 0)
        await StoreInventory.findOneAndUpdate(
          { storeId: targetStoreId, product: deduction.id },
          [{ $set: { quantity: { $max: [0, { $subtract: ["$quantity", deduction.quantity] }] } } }]
        );
      }
    }

    const updatedSale = await Sale.findByIdAndUpdate(
      salesId,
      { ...updatedData, totalAmount: updatedTotalAmount },
      { new: true }
    ).populate({
      path: 'products.product',
      select: 'name quantity Category SubCategory Price MRP'
    });

    await logActivity({
      action: "Update Sale",
      description: `Sale for ${updatedSale.customerName} updated. New Total: ${updatedTotalAmount}`,
      entity: "sale",
      entityId: updatedSale._id,
      userId: userId,
      ipAddress: ipAddress,
    });

    const io = req.app.get("io");
    const alertedProducts = await checkAndCreateLowStockAlerts(io);
    if (io && alertedProducts.length > 0) {
      alertedProducts.forEach(alert => io.emit("lowStockAlert", alert));
    }

    res.status(200).json(updatedSale);
  } catch (error) {
    logger.error("Update Sale Stock Error:", error);
    res.status(400).json({ success: false, message: "Failed to update sale: " + error.message });
  }
};

module.exports.SearchSales = async (req, res) => {
  try {
    const { query } = req.query;
    const userRole = req.user.role;
    const userStoreId = req.user.storeId?._id || req.user.storeId;

    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const mongoose = require('mongoose');

    // Build initial match stage for store scoping
    const storeMatch = userRole !== 'admin' && userStoreId
      ? { storeId: new mongoose.Types.ObjectId(userStoreId) }
      : {};

    const sales = await Sale.aggregate([
      { $match: storeMatch },
      // Join product details so we can search by product name
      {
        $lookup: {
          from: 'products',
          localField: 'products.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      // Filter: match customerName OR any product name
      {
        $match: {
          $or: [
            { customerName: { $regex: query, $options: 'i' } },
            { 'productDetails.name': { $regex: query, $options: 'i' } }
          ]
        }
      },
      { $sort: { createdAt: -1 } },
      // Re-populate products.product correctly for the frontend
      {
        $lookup: {
          from: 'products',
          localField: 'products.product',
          foreignField: '_id',
          as: '_productLookup'
        }
      }
    ]);

    // Populate the embedded products.product field properly
    const populated = await Sale.populate(sales, {
      path: 'products.product',
      select: 'name quantity Category SubCategory Price MRP'
    });

    res.status(200).json(populated);
  } catch (error) {
    res.status(500).json({ message: "Error searching sales", error: error.message });
  }
};

module.exports.getSaleById = async (req, res) => {
  try {
    const { saleId } = req.params;
    const sale = await Sale.findById(saleId).populate({
      path: 'products.product',
      select: 'name quantity Category SubCategory Price MRP'
    });
    if (!sale) return res.status(404).json({ message: "Sale not found" });
    res.status(200).json(sale);
  } catch (error) {
    res.status(500).json({ message: "Error getting sale", error: error.message });
  }
};

// Store-scoped KPI stats for dashboard
module.exports.getStoreSalesStats = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userStoreId = req.user.storeId?._id || req.user.storeId;
    const { storeId } = req.query;

    let filter = {};

    if (userRole === 'staff') {
      // Staff with no assigned store → return zeroes gracefully (don't crash dashboard)
      if (!userStoreId) {
        return res.status(200).json({ totalSales: 0, totalRevenue: 0, pendingAmount: 0, noStore: true });
      }
      filter.storeId = userStoreId;
    } else if (userRole === 'manager') {
      // Manager scoped to their store
      if (userStoreId) filter.storeId = userStoreId;
    } else {
      // Admin: optional storeId filter from query
      if (storeId && storeId !== 'all') filter.storeId = storeId;
    }

    const sales = await Sale.find(filter);
    const totalSales = sales.length;
    const totalRevenue = sales.reduce((sum, s) => sum + (s.totalAmount || 0), 0);
    const pendingAmount = sales
      .filter(s => s.paymentStatus === 'pending' || s.paymentStatus === 'partial')
      .reduce((sum, s) => {
        if (s.paymentStatus === 'partial') return sum + (s.totalAmount - (s.partialAmount || 0));
        return sum + s.totalAmount;
      }, 0);

    res.status(200).json({ totalSales, totalRevenue, pendingAmount });
  } catch (error) {
    res.status(500).json({ message: "Error fetching store stats", error: error.message });
  }
};

module.exports.deleteSale = async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;
  const ipAddress = req.ip;

  try {
    const { saleId } = req.params;

    const sale = await Sale.findById(saleId);
    if (!sale) {
      return res.status(404).json({ success: false, message: "Sale not found" });
    }

    // Restore stock for each product in the sale based on user role
    for (const item of sale.products) {
      if (userRole === 'admin') {
        // Admin restores to global warehouse
        await ProductModel.findByIdAndUpdate(item.product, { $inc: { quantity: item.quantity } });
      } else {
        // Staff/Manager restore to their store inventory
        await StoreInventory.findOneAndUpdate(
          { storeId: sale.storeId, product: item.product },
          { $inc: { quantity: item.quantity } }
        );
      }
    }

    // Delete the sale
    await Sale.findByIdAndDelete(saleId);

    // Log the activity
    await logActivity({
      action: "Delete Sale",
      description: `Sale ${saleId} for ${sale.customerName} was deleted. Stock quantities restored.`,
      entity: "sale",
      entityId: saleId,
      userId: userId,
      ipAddress: ipAddress,
    });

    res.status(200).json({ success: true, message: "Sale deleted successfully" });
  } catch (error) {
    logger.error("Delete Sale Error:", error);
    res.status(500).json({ success: false, message: "Error deleting sale", error: error.message });
  }
};
