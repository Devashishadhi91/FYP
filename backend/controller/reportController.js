const Sale = require('../models/Salesmodel');
const Product = require('../models/Productmodel');

module.exports.getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'daily', storeId } = req.query;
    const userRole = req.user.role;
    const userStoreId = req.user.storeId?._id || req.user.storeId;

    const query = {};

    // Scope staff to their store automatically
    if (userRole === 'staff') {
      query.storeId = userStoreId;
    } else if (storeId && storeId !== 'all') {
      query.storeId = storeId;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        query.createdAt.$lte = end;
      }
    }

    const format = groupBy === 'monthly' ? '%Y-%m' : '%Y-%m-%d';

    const reportData = await Sale.aggregate([
      { $match: query },
      {
        $group: {
          _id: { $dateToString: { format: format, date: "$createdAt" } },
          totalRevenue: { $sum: "$totalAmount" },
          totalTransactions: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    const overall = reportData.reduce((acc, curr) => ({
      revenue: acc.revenue + curr.totalRevenue,
      count: acc.count + curr.totalTransactions
    }), { revenue: 0, count: 0 });

    res.status(200).json({
      period: groupBy,
      totalRevenue: overall.revenue,
      totalTransactions: overall.count,
      data: reportData.map(item => ({
        date: item._id,
        revenue: item.totalRevenue,
        transactions: item.totalTransactions
      }))
    });

  } catch (error) {
    res.status(500).json({ message: "Error generating sales report", error: error.message });
  }
};

module.exports.getInventoryReport = async (req, res) => {
  try {
    const products = await Product.find().populate('supplier', 'name');

    const inventoryData = products.map(p => ({
      name: p.name,
      category: p.Category,
      quantity: p.quantity,
      mrp: p.MRP,
      totalValue: p.quantity * p.MRP,
      supplier: p.supplier?.name || "N/A",
      lowStock: p.quantity <= p.lowStockThreshold
    }));

    const totalStoreValue = inventoryData.reduce((sum, p) => sum + p.totalValue, 0);

    res.status(200).json({
      totalProducts: products.length,
      totalStoreValue,
      inventory: inventoryData
    });

  } catch (error) {
    res.status(500).json({ message: "Error generating inventory report", error: error.message });
  }
};
