const Purchases = require('../models/Purchasesmodel');
const Product = require('../models/Productmodel');
const StoreInventory = require('../models/StoreInventorymodel');
const { createActivityBroadcast } = require('./notificationcontroller');

module.exports.createPurchases = async (req, res) => {
  try {
    const { product, type, quantity, supplier, expiryDate } = req.body;

    if (!product || !type || !quantity) {
      return res.status(400).json({ success: false, message: "Product, type, and quantity are required." });
    }

    const prod = await Product.findById(product);
    if (!prod) {
      return res.status(404).json({ success: false, message: "Product not found" });
    }

    const quantityNum = Number(quantity);
    const userRole = req.user.role;
    const userStoreId = req.user.storeId?._id || req.user.storeId;
    const isRounding = req.user.isRounding || false;

    // Admin can specify storeId in body; staff/manager use their assigned store
    const targetStoreId = (userRole === 'admin' && req.body.storeId)
      ? req.body.storeId
      : userStoreId;

    if (!targetStoreId && userRole !== 'admin' && !isRounding) {
      return res.status(400).json({
        success: false,
        message: "You are not assigned to any store. Contact your admin."
      });
    }

    if (type === "Stock-in" || type === "purchase") {
      
      if (userRole === 'staff') {
        // Validate staff has a store (rounding staff are exempt)
        if (!userStoreId && !isRounding) {
          return res.status(400).json({ message: "You are not assigned to a store." });
        }

        // Validate warehouse has enough stock (check only — do NOT deduct yet)
        if (prod.quantity < quantityNum) {
          return res.status(400).json({
            message: `Insufficient warehouse stock. Available: ${prod.quantity}, Requested: ${quantityNum}`
          });
        }

        // Create Order as a purchase request instead of transferring stock
        const Order = require('../models/Ordermodel');
        const newOrder = new Order({
          storeId: userStoreId,
          requestedBy: req.user._id,
          processedBy: null,
          source: 'staff_request',
          status: 'pending',
          isLocked: false,
          supplier: supplier || null,
          products: [{
            product: product,
            quantity: quantityNum,
            price: prod.Price || prod.MRP
          }],
          totalAmount: (prod.Price || prod.MRP) * quantityNum,
          Description: `Purchase request by ${req.user.name} for ${prod.name}`
        });

        await newOrder.save();

        // Log a StockTransaction record with type='purchase' but NO quantity movement
        // This serves as a pending record in the purchases history
        const pendingRecord = new Purchases({
          product,
          type: 'purchase',
          quantityChanged: quantityNum,
          previousQuantity: prod.quantity,
          newQuantity: prod.quantity, // NO change until delivered
          storeId: userStoreId,
          userId: req.user._id,
          supplier: supplier || undefined,
          orderId: newOrder._id, // New field — see PROMPT 4-A step 9
          status: 'pending' // New field on Purchases model
        });
        await pendingRecord.save();

        return res.status(201).json({
          message: "Purchase request submitted. Awaiting admin/manager approval.",
          order: newOrder,
          pendingRecord
        });
      } else if (userRole === 'admin' && !targetStoreId) {
        // ADMIN WAREHOUSE PURCHASE: Add to global company warehouse stock
        const prevWarehouseQty = prod.quantity || 0;
        prod.quantity = prevWarehouseQty + quantityNum;
        await prod.save();

        const newTransaction = new Purchases({
          product,
          type,
          quantityChanged: quantityNum,
          previousQuantity: prevWarehouseQty,
          newQuantity: prod.quantity,
          supplier: supplier || undefined,
          userId: req.user._id,
          expiryDate: expiryDate || null,
          purchasedAt: new Date()
        });

        await newTransaction.save();

        const io = req.app.get('io');
        await createActivityBroadcast(io, {
          actorUser: req.user,
          title: 'Warehouse Purchase Logged',
          message: `${req.user.name} added ${quantityNum} units of "${prod.name}" to the warehouse.`,
          storeId: null
        });

        return res.status(201).json({
          message: "Warehouse stock updated.",
          newTransaction
        });

      } else {
        // STORE PURCHASE / TRANSFER: decrease warehouse, increase store
        const prevWarehouseQty = prod.quantity || 0;
        if (prevWarehouseQty < quantityNum) {
          return res.status(400).json({
            success: false,
            message: `Insufficient warehouse stock for ${prod.name}. Available: ${prevWarehouseQty}`
          });
        }
        prod.quantity = prevWarehouseQty - quantityNum;
        await prod.save();

        // STORE INVENTORY: increase (goods arrive at store)
        const storeInv = await StoreInventory.findOneAndUpdate(
          { storeId: targetStoreId, product: product },
          { $inc: { quantity: quantityNum } },
          { upsert: true, new: true }
        );

        const newTransaction = new Purchases({
          product,
          type,
          quantityChanged: quantityNum,
          previousQuantity: storeInv.quantity - quantityNum,
          newQuantity: storeInv.quantity,
          supplier: supplier || undefined,
          storeId: targetStoreId,
          userId: req.user._id,
          expiryDate: expiryDate || null,
          purchasedAt: new Date()
        });

        await newTransaction.save();

        const io = req.app.get('io');
        await createActivityBroadcast(io, {
          actorUser: req.user,
          title: 'Stock Purchase Recorded',
          message: `${req.user.name} logged a purchase of ${quantityNum} units of "${prod.name}" for a store.`,
          storeId: targetStoreId
        });

        return res.status(201).json({
          message: "Purchase recorded. Store stock updated.",
          newTransaction,
          storeInventory: storeInv
        });
      }

    } else if (type === "Stock-out") {
      if (userRole === 'admin' && !targetStoreId) {
         // Admin warehouse stock-out
         const prevWarehouseQty = prod.quantity || 0;
         if (prevWarehouseQty < quantityNum) {
           return res.status(400).json({ success: false, message: `Insufficient warehouse stock. Available: ${prevWarehouseQty}` });
         }
         prod.quantity = prevWarehouseQty - quantityNum;
         await prod.save();
         
         const newTransaction = new Purchases({
           product, type, quantityChanged: quantityNum,
           previousQuantity: prevWarehouseQty, newQuantity: prod.quantity,
           userId: req.user._id,
         });
         await newTransaction.save();
         return res.status(201).json({ message: "Warehouse stock-out recorded.", newTransaction });
      }

      // Manual stock-out from store inventory
      const storeInv = await StoreInventory.findOne({ storeId: targetStoreId, product });
      const currentStoreQty = storeInv?.quantity || 0;

      if (currentStoreQty < quantityNum) {
        return res.status(400).json({
          success: false,
          message: `Insufficient store stock. Available: ${currentStoreQty}`
        });
      }

      const updatedStoreInv = await StoreInventory.findOneAndUpdate(
        { storeId: targetStoreId, product },
        [{ $set: { quantity: { $max: [0, { $subtract: ["$quantity", quantityNum] }] } } }],
        { new: true }
      );

      const newTransaction = new Purchases({
        product,
        type,
        quantityChanged: quantityNum,
        previousQuantity: currentStoreQty,
        newQuantity: updatedStoreInv.quantity,
        storeId: targetStoreId,
        userId: req.user._id,
      });

      await newTransaction.save();
      return res.status(201).json({ message: "Stock-out recorded.", newTransaction });
    }

    res.status(400).json({ success: false, message: "Invalid transaction type." });

  } catch (error) {
    console.error("Error creating purchase:", error);
    res.status(500).json({ success: false, message: "Error creating purchase", error: error.message });
  }
};


module.exports.getAllPurchases = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userStoreId = req.user.storeId?._id || req.user.storeId;

    const filter = { type: { $in: ["Stock-in", "purchase"] } };
    
    if (userRole !== 'admin') {
      filter.storeId = userStoreId;
    }

    const transactions = await Purchases.find(filter)
      .populate('product')
      .populate('supplier')
      .sort({ transactionDate: -1 });

    res.status(200).json({ message: "Purchases fetched successfully", transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching stock transactions", error });
  }
};


module.exports.getPurchasesByProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const transactions = await Purchases.find({ product: productId }).populate('Supplier').sort({ transactionDate: -1 });
    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ success: false, message: "No transactions found for this product." });
    }
    res.status(200).json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching transactions by product", error });
  }
};


module.exports.getPurchasesBySupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;
    const transactions = await Purchases.find({ supplier: supplierId }).populate('product').sort({ transactionDate: -1 });
    if (!transactions || transactions.length === 0) {
      return res.status(404).json({ success: false, message: "No transactions found for this supplier." });
    }
    res.status(200).json({ success: true, transactions });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching transactions by supplier", error });
  }
};


module.exports.searchStocks = async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const stocks = await Purchases.aggregate([
      {
        $lookup: {
          from: 'products',
          localField: 'product',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: {
          path: '$product',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: 'suppliers',
          localField: 'supplier',
          foreignField: '_id',
          as: 'supplier'
        }
      },
      {
        $unwind: {
          path: '$supplier',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $match: {
          $or: [
            { type: { $regex: query, $options: 'i' } },
            { 'product.name': { $regex: query, $options: 'i' } }
          ]
        }
      },
      {
        $sort: { transactionDate: -1 }
      }
    ]);

    res.json(stocks);
  } catch (error) {
    res.status(500).json({ message: "Error finding product", error: error.message });
  }
};

// Get the current store inventory for the logged-in user's store
module.exports.getStoreInventory = async (req, res) => {
  try {
    const userStoreId = req.user.storeId?._id || req.user.storeId;
    const storeIdParam = req.query.storeId; // admin can pass a storeId
    
    const targetStore = req.user.role === 'admin' && storeIdParam ? storeIdParam : userStoreId;

    const inventory = await StoreInventory.find({ storeId: targetStore })
      .populate('product')
      .sort({ updatedAt: -1 });

    res.status(200).json({ inventory });
  } catch (error) {
    res.status(500).json({ message: "Error fetching store inventory", error: error.message });
  }
};