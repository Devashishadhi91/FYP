const Order = require('../models/Ordermodel');
const logger = require('../libs/appLogger');
const logActivity = require('../libs/logger');
const ProductModel = require('../models/Productmodel');
const StoreInventory = require('../models/StoreInventorymodel');
const mongoose = require('mongoose');
const InventoryMovementLog = require('../models/InventoryMovementLogmodel');
const Purchases = require('../models/Purchasesmodel');

const createOrder = async (req, res) => {
    try {
        const { user, Description, products, status, supplier, source, storeId } = req.body;
        const userRole = req.user.role;
        const userStoreId = storeId || req.user.storeId?._id || req.user.storeId;
        const requestedBy = req.user._id;
  
        if (!user) return res.status(400).json({ message: "User ID is required" });
        if (!Description) return res.status(400).json({ message: "Description is required" });
        if (!products || !Array.isArray(products) || products.length === 0) return res.status(400).json({ message: "Products are required" });

        let totalOrderAmount = 0;

        // Verify stock first
        for (const item of products) {
            const { product, price, quantity } = item;
            if (!product || price === undefined || !quantity) return res.status(400).json({ message: "Product ID, price, and quantity are required for each item" });
            
            const productRecord = await ProductModel.findById(product);
            if (!productRecord) return res.status(404).json({ message: `Product not found: ${product}` });

            if (userRole === 'admin') {
                if (productRecord.quantity < quantity) {
                    return res.status(400).json({ 
                        message: "Insufficient warehouse quantity",
                        available: productRecord.quantity,
                        requested: quantity
                    });
                }
            } else {
                const storeInv = await StoreInventory.findOne({ storeId: userStoreId, product });
                const storeQty = storeInv?.quantity || 0;
                if (storeQty < quantity) {
                    return res.status(400).json({ 
                        message: "Insufficient store stock",
                        available: storeQty,
                        requested: quantity
                    });
                }
            }
            totalOrderAmount += price * quantity;
        }

        // Deduct stock
        for (const item of products) {
            const { product, quantity } = item;
            if (userRole === 'admin') {
                await ProductModel.findByIdAndUpdate(product, { $inc: { quantity: -quantity } });
            } else {
                await StoreInventory.findOneAndUpdate(
                    { storeId: userStoreId, product },
                    { $inc: { quantity: -quantity } }
                );
            }
        }

        const newOrder = new Order({
            user,
            storeId: userStoreId,
            Description,
            products,
            totalAmount: totalOrderAmount,
            status: status || 'pending',
            requestedBy,
            supplier: supplier || null,
            source: source || (userRole === 'admin' ? 'admin_order' : 'staff_request')
        });

        await newOrder.save();
        
        res.status(201).json({ success: true, message: "Order created successfully", order: newOrder });
    } catch (error) {
        logger.error('Error creating order:', error);
        res.status(500).json({ 
            success: false,
            message: "Error in creating order", 
            error: error.message,
            validationErrors: error.errors 
        });
    }
};



const Removeorder = async (req, res) => {
    try {
        const { OrdertId } = req.params;
        const userId = req.user._id;
        const ipAddress = req.ip;
        
        const Deletedorder = await Order.findByIdAndDelete(OrdertId);

        if (!Deletedorder) {
            return res.status(404).json({ message: "Order is not found!" });
        }

        await logActivity({
            action: "Delete order",
            description: `Order was deleted.`,
            entity: "order",
            entityId: Deletedorder._id,
            userId: userId,
            ipAddress: ipAddress,
        });

        res.status(200).json({ message: "Order deleted successfully" });

    } catch (error) {
        res.status(500).json({ message: "Error deleting Order", error: error.message });
    }
};


const getOrder = async (req, res) => {
    try {
        const filter = {};
        if (req.user.role === 'staff') {
            filter.storeId = req.user.storeId?._id || req.user.storeId;
        }

        const orders = await Order.find(filter)
  .populate("products.product", "name price ") 
  .populate("user", "name email"); 

        if (!orders) {
            return res.status(200).json([]);
        }

        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ message: "Error getting orders", error: error.message });
    }
};



 
const updatestatusOrder = async (req, res) => {
  try {
    const { OrderId } = req.params;
    const { status } = req.body;
    
    if (!['pending', 'shipped', 'delivered'].includes(status)) {
      return res.status(400).json({ message: "Invalid status. Must be 'pending', 'shipped', or 'delivered'." });
    }

    const order = await Order.findById(OrderId);
    if (!order) return res.status(404).json({ message: "Order not found" });

    if (order.isLocked) {
      return res.status(400).json({ message: "This order has been delivered and is locked." });
    }

    // Prevent backwards changes
    const statuses = { 'pending': 0, 'shipped': 1, 'delivered': 2 };
    if (statuses[status] <= statuses[order.status]) {
      console.log("STATUS ERROR:", status, order.status);
      return res.status(400).json({ message: "Invalid status transition (cannot move backwards or to same status)." });
    }

    if (status === 'delivered') {
      try {
        for (const item of order.products) {
          const prod = await ProductModel.findById(item.product);
          if (!prod) throw new Error(`Product ${item.product} not found`);

          if (prod.quantity < item.quantity) {
            throw new Error(`Insufficient warehouse stock for ${prod.name}. Available: ${prod.quantity}, Needed: ${item.quantity}`);
          }

          prod.quantity -= item.quantity;
          await prod.save();

          const storeInvBefore = await StoreInventory.findOne({ storeId: order.storeId, product: item.product });
          const qtyBefore = storeInvBefore?.quantity || 0;
          
          const updatedInv = await StoreInventory.findOneAndUpdate(
            { storeId: order.storeId, product: item.product },
            { $inc: { quantity: item.quantity } },
            { upsert: true, new: true }
          );

          await InventoryMovementLog.create({
            orderId: order._id,
            product: item.product,
            storeId: order.storeId,
            warehouseQtyBefore: prod.quantity + item.quantity,
            warehouseQtyAfter: prod.quantity,
            storeQtyBefore: qtyBefore,
            storeQtyAfter: updatedInv.quantity,
            quantityTransferred: item.quantity,
            performedBy: req.user._id
          });

          await Purchases.findOneAndUpdate(
            { orderId: order._id, product: item.product },
            { status: 'delivered', newQuantity: updatedInv.quantity, previousQuantity: qtyBefore }
          );
        }

        order.status = 'delivered';
        order.isLocked = true;
        order.deliveredAt = new Date();
        order.processedBy = req.user._id;
        await order.save();

        await logActivity({
          action: "Order Delivered",
          description: `Order ${order._id} delivered. Stock transferred to store ${order.storeId}.`,
          entity: "order",
          entityId: order._id,
          userId: req.user._id,
          ipAddress: req.ip
        });

        return res.status(200).json({ message: "Order delivered. Inventory transferred.", order });

      } catch (err) {
        console.log("================= ERROR IN ORDER DELIVERY ==================");
        console.log(err);
        return res.status(400).json({ message: err.message || "Failed to process delivery. No changes were made." });
      }
    } else {
      order.status = status;
      order.processedBy = req.user._id;
      await order.save();

      await logActivity({
        action: "Update Order",
        description: `Order ${order._id} status updated to ${status}.`,
        entity: "order",
        entityId: order._id,
        userId: req.user._id,
        ipAddress: req.ip,
      });

      return res.status(200).json({ message: `Order successfully updated to ${status}`, order });
    }
  } catch (error) {
    res.status(500).json({ message: "Error updating order", error: error.message });
  }
};

const searchOrder = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query) {
            return res.status(400).json({ message: "Query parameter is required" });
        }

        const searchdata = await Order.find({
            $or: [
                { Desciption: { $regex: query, $options: "i" } },
                { status: { $regex: query, $options: "i" } },
                { "user.name": { $regex: query, $options: "i" } }
            ]
        });

        res.json(searchdata);

    } catch (error) {
        res.status(500).json({ message: "Error in search Orders", error: error.message });
    }
};



const getOrderStatistics=async(req,res)=>{
try {
    const orderStats=await Order.aggregate([
        {
            $group:{
                _id:"$status",
                count:{$sum:1}
            }
        }

    ])


    res.status(200).json(orderStats)
} 

catch (error) {
    
}
}


const createStaffPurchaseRequest = async (req, res) => {
    try {
        if (req.user.role !== 'staff') {
            return res.status(403).json({ message: "Only staff can call this route." });
        }

        const { productId, quantity, supplierId } = req.body;
        const userStoreId = req.user.storeId?._id || req.user.storeId;

        if (!userStoreId) {
            return res.status(400).json({ message: "You are not assigned to a store." });
        }
        if (!productId || !quantity || quantity <= 0) {
            return res.status(400).json({ message: "Product ID and valid quantity are required." });
        }

        const prod = await ProductModel.findById(productId);
        if (!prod) return res.status(404).json({ message: "Product not found" });

        if (prod.quantity < quantity) {
            return res.status(400).json({ message: `Insufficient warehouse stock. Available: ${prod.quantity}, Requested: ${quantity}` });
        }

        const price = prod.Price || prod.MRP;

        const newOrder = new Order({
            storeId: userStoreId,
            requestedBy: req.user._id,
            source: 'staff_request',
            status: 'pending',
            isLocked: false,
            products: [{ product: productId, quantity, price }],
            totalAmount: quantity * price,
            Description: `Stock request: ${prod.name}`,
            supplier: supplierId || null
        });

        await newOrder.save();
        
        await newOrder.populate('products.product', 'name');

        await logActivity({
            action: "Staff Purchase Request",
            description: `Staff ${req.user.name} created a stock request for ${prod.name}.`,
            entity: "order",
            entityId: newOrder._id,
            userId: req.user._id,
            ipAddress: req.ip
        });

        res.status(201).json({ message: "Purchase request submitted successfully", order: newOrder });
    } catch (error) {
        logger.error('Error creating staff request:', error);
        res.status(500).json({ message: "Error creating request", error: error.message });
    }
};

const getMovementLog = async (req, res) => {
    try {
        const { orderId } = req.params;
        const logs = await InventoryMovementLog.find({ orderId })
            .populate('product', 'name')
            .populate('performedBy', 'name email')
            .sort({ createdAt: -1 });

        res.status(200).json(logs);
    } catch (error) {
        res.status(500).json({ message: "Error fetching movement logs", error: error.message });
    }
};

module.exports = {
    createOrder,
    searchOrder,
    updatestatusOrder,
    getOrder,
    getOrderStatistics,
    Removeorder,
    createStaffPurchaseRequest,
    getMovementLog
};