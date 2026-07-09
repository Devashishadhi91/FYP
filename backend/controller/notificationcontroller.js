const Notification = require("../models/Notificationmodel");
const Product = require("../models/Productmodel");
const StoreInventory = require("../models/StoreInventorymodel");
const User = require("../models/Usermodel");
const StockTransaction = require("../models/Purchasesmodel");
const Sale = require("../models/Salesmodel");
const { sendEmailNotification } = require("../libs/emailService");

// Shared helper — creates an in-app notification targeted at a specific user
// and also emits a socket event. Used for activity broadcasts.
const createUserNotification = async (io, { title, message, type, userId, productId }) => {
  const note = new Notification({ title, message, type, userId: userId || null, productId: productId || null });
  await note.save();
  if (io) io.emit('newNotification', note);
  return note;
};

// Broadcasts a staff action to the actor themselves, plus all admins and store managers
module.exports.createActivityBroadcast = async (io, { actorUser, title, message, storeId }) => {
  try {
    // Notify the actor
    await createUserNotification(io, { title, message, type: 'staff_activity', userId: actorUser._id });

    // Notify all admins and store managers
    const recipients = await User.find({
      role: { $in: ['admin', 'manager'] }
    }).select('_id email name');

    for (const r of recipients) {
      await createUserNotification(io, { title, message, type: 'staff_activity', userId: r._id });
    }

    // Send email to admins/managers
    const emails = recipients.map(u => u.email).filter(Boolean).join(',');
    if (emails) {
      sendEmailNotification(emails, title, `<p>${message}</p>`);
    }
  } catch (err) {
    console.error('Error in createActivityBroadcast:', err);
  }
};

// Checks for purchases where the product has not been sold for more than 90 days
module.exports.checkAgingStock = async (io = null) => {
  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    // Find all stock-in transactions older than 90 days
    const oldPurchases = await StockTransaction.find({
      type: { $in: ['Stock-in', 'purchase'] },
      purchasedAt: { $lte: ninetyDaysAgo }
    }).populate('product');

    for (const purchase of oldPurchases) {
      if (!purchase.product) continue;

      // Check if there is any sale of this product after the purchase date
      const recentSale = await Sale.findOne({
        'products.product': purchase.product._id,
        createdAt: { $gt: purchase.purchasedAt }
      });

      if (recentSale) continue; // Product has sold since this purchase — skip

      // Check if an unread alert already exists for this purchase
      const alreadyAlerted = await Notification.findOne({
        type: 'aging_stock',
        productId: purchase.product._id,
        isRead: false
      });
      if (alreadyAlerted) continue;

      const msg = `Product "${purchase.product.name}" has not been sold since ${new Date(purchase.purchasedAt).toDateString()} (over 90 days). Consider running a promotion or stock clearance.`;
      const note = new Notification({
        title: 'Aging Stock Alert',
        message: msg,
        type: 'aging_stock',
        productId: purchase.product._id
      });
      await note.save();
      if (io) io.emit('newNotification', note);

      // Email admins and managers
      const admins = await User.find({ role: { $in: ['admin', 'manager'] } });
      const emails = admins.map(u => u.email).filter(Boolean).join(',');
      if (emails) {
        sendEmailNotification(emails, `Aging Stock: ${purchase.product.name}`, `<p>${msg}</p>`);
      }
    }
  } catch (err) {
    console.error('Error in checkAgingStock:', err);
  }
};

// Checks for purchases where expiryDate is within the next 6 months
module.exports.checkExpiryWarnings = async (io = null) => {
  try {
    const now = new Date();
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow.setMonth(sixMonthsFromNow.getMonth() + 6);

    const expiringPurchases = await StockTransaction.find({
      expiryDate: { $gte: now, $lte: sixMonthsFromNow }
    }).populate('product').populate('storeId', 'name').populate('userId');

    for (const purchase of expiringPurchases) {
      if (!purchase.product) continue;

      const alreadyAlerted = await Notification.findOne({
        type: 'expiry_warning',
        productId: purchase.product._id,
        isRead: false,
        message: { $regex: purchase._id.toString() }
      });
      if (alreadyAlerted) continue;

      const expiryStr = new Date(purchase.expiryDate).toDateString();
      const storeName = purchase.storeId?.name || 'Warehouse';
      const msg = `Product "${purchase.product.name}" in ${storeName} is expiring on ${expiryStr}. Take action to clear this stock and avoid losses (Purchase ID: ${purchase._id}).`;

      // Notify admin and managers
      const admins = await User.find({ role: { $in: ['admin', 'manager'] } });
      for (const admin of admins) {
        const note = new Notification({ title: 'Expiry Warning', message: msg, type: 'expiry_warning', productId: purchase.product._id, userId: admin._id });
        await note.save();
        if (io) io.emit('newNotification', note);
      }

      // Also notify the staff member who made the purchase, if applicable
      if (purchase.userId) {
        const staffNote = new Notification({ title: 'Expiry Warning', message: msg, type: 'expiry_warning', productId: purchase.product._id, userId: purchase.userId._id });
        await staffNote.save();
        if (io) io.emit('newNotification', staffNote);
      }

      // Email notification
      const allUsers = [...admins, purchase.userId].filter(Boolean);
      const emails = [...new Set(allUsers.map(u => u.email).filter(Boolean))].join(',');
      if (emails) {
        sendEmailNotification(emails, `Expiry Warning: ${purchase.product.name}`, `<p>${msg}</p>`);
      }
    }
  } catch (err) {
    console.error('Error in checkExpiryWarnings:', err);
  }
};

module.exports.createNotification = async (req, res) => {
  try {
    const { title, message, type, productId } = req.body;

    if (!title || !message || !type) {
      return res.status(400).json({ success: false, message: "Title, message, and type are required." });
    }

    const notification = new Notification({ title, message, type, productId });
    await notification.save();

    const io = req.app.get("io");
    if (io) {
      io.emit("newNotification", notification);
    }

    try {
        const admins = await User.find({ role: { $in: ['admin', 'manager'] } });
        const emails = admins.map(u => u.email).join(',');
        if (emails) {
            sendEmailNotification(emails, title, `<p>${message}</p>`);
        }
    } catch (err) {
        console.error("Error sending notification email:", err);
    }

    res.status(201).json({ success: true, message: "Notification created successfully.", notification });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating notification.", error });
  }
};

module.exports.checkAndCreateLowStockAlerts = async (io = null) => {
  const alertedProducts = [];
  try {
    // 1. Warehouse (Product) low stock check
    const lowStockProducts = await Product.find({
      $expr: { $lte: ["$quantity", "$lowStockThreshold"] }
    });

    for (const product of lowStockProducts) {
      // 2. Check if unread notification already exists
      const existing = await Notification.findOne({
        productId: product._id,
        type: "low_stock",
        isRead: false
      });

      if (!existing) {
        // 3. Create new alert
        const message = `Warehouse Low Stock | Product: ${product.name} | Category: ${product.Category || 'N/A'} | Remaining Stock: ${product.quantity} units`;
        const notification = new Notification({
          title: "Warehouse Low Stock Alert",
          message: message,
          type: "low_stock",
          productId: product._id,
          isRead: false
        });
        await notification.save();

        alertedProducts.push({
          productId: product._id,
          productName: product.name,
          quantity: product.quantity
        });

        if (io) {
          io.emit("newNotification", notification);
        }

        try {
            const admins = await User.find({ role: { $in: ['admin', 'manager'] } });
            const emails = admins.map(u => u.email).filter(Boolean).join(',');
            if (emails) {
                const htmlMessage = `
                    <h2>Warehouse Low Stock Alert</h2>
                    <p><strong>Product:</strong> ${product.name}</p>
                    <p><strong>Category:</strong> ${product.Category || 'N/A'}</p>
                    <p><strong>Remaining Stock:</strong> ${product.quantity} units</p>
                    <p>Please restock this item in the warehouse soon to avoid stockouts.</p>
                `;
                sendEmailNotification(emails, `Warehouse Low Stock: ${product.name}`, htmlMessage);
            }
        } catch (err) {
            console.error("Error sending warehouse low stock email:", err);
        }
      }
    }

    // 2. StoreInventory low stock check
    const storeInventories = await StoreInventory.find({}).populate('product').populate('storeId');
    
    for (const storeInv of storeInventories) {
        if (!storeInv.product || !storeInv.storeId) continue;
        const threshold = storeInv.product.lowStockThreshold || 10;
        
        if (storeInv.quantity <= threshold) {
            const message = `Store Low Stock (${storeInv.storeId.name}) | Product: ${storeInv.product.name} | Remaining Stock: ${storeInv.quantity} units`;
            
            const existingStoreAlert = await Notification.findOne({
                productId: storeInv.product._id,
                type: "low_stock",
                message: message,
                isRead: false
            });

            if (!existingStoreAlert) {
                const notification = new Notification({
                    title: `Store Low Stock: ${storeInv.storeId.name}`,
                    message: message,
                    type: "low_stock",
                    productId: storeInv.product._id,
                    isRead: false
                });
                await notification.save();

                if (io) {
                    io.emit("newNotification", notification);
                }

                try {
                    // Notify admins, managers, and staff of THIS store
                    const usersToNotify = await User.find({ 
                        $or: [
                            { role: { $in: ['admin', 'manager'] } },
                            { role: 'staff', storeId: storeInv.storeId._id }
                        ]
                    });
                    const emails = usersToNotify.map(u => u.email).filter(Boolean).join(',');
                    if (emails) {
                        const htmlMessage = `
                            <h2>Store Low Stock Alert</h2>
                            <p><strong>Store:</strong> ${storeInv.storeId.name}</p>
                            <p><strong>Product:</strong> ${storeInv.product.name}</p>
                            <p><strong>Category:</strong> ${storeInv.product.Category || 'N/A'}</p>
                            <p><strong>Remaining Stock:</strong> ${storeInv.quantity} units</p>
                            <p>Please restock this item in the store soon.</p>
                        `;
                        sendEmailNotification(emails, `Store Low Stock: ${storeInv.product.name} at ${storeInv.storeId.name}`, htmlMessage);
                    }
                } catch (err) {
                    console.error("Error sending store low stock email:", err);
                }
            }
        }
    }

    return alertedProducts;
  } catch (error) {
    console.error("Error in low stock check:", error);
    return [];
  }
};

module.exports.getLowStockNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ type: "low_stock", isRead: false })
      .populate("productId")
      .sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching low stock alerts", error });
  }
};

module.exports.getAllNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find().populate("productId").sort({ createdAt: -1 });
    res.status(200).json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Error fetching notifications.", error });
  }
};

module.exports.getUnreadNotifications = async (req, res) => {
  try {
    const unreadNotifications = await Notification.find({ isRead: false }).sort({ createdAt: -1 });
    res.status(200).json({ success: true, unreadNotifications });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching unread notifications.", error });
  }
};

module.exports.markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndUpdate(id, { isRead: true }, { new: true });
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    res.status(200).json({ success: true, message: "Notification marked as read.", notification });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating notification.", error });
  }
};

module.exports.markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });
    res.status(200).json({ success: true, message: "All notifications marked as read." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error updating notifications.", error });
  }
};

module.exports.deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findByIdAndDelete(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: "Notification not found." });
    }

    res.status(200).json({ success: true, message: "Notification deleted successfully." });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting notification.", error });
  }
};

module.exports.deleteAllReadNotifications = async (req, res) => {
  try {
    const result = await Notification.deleteMany({ isRead: true });

    res.status(200).json({ 
      success: true, 
      message: "All read notifications deleted.", 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting read notifications.", error });
  }
};
