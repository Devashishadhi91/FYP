const Notification = require("../models/Notificationmodel");
const Product = require("../models/Productmodel");
const StoreInventory = require("../models/StoreInventorymodel");
const User = require("../models/Usermodel");
const { sendEmailNotification } = require("../libs/emailService");

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
