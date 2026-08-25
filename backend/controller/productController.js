const Product = require('../models/Productmodel')
const CategoryModel = require('../models/Categorymodel');
const StoreInventory = require('../models/StoreInventorymodel');
const logger = require('../libs/appLogger');
const logActivity = require('../libs/logger');
const { resolveTargetStoreId } = require('../libs/authUtils');

module.exports.Addproduct = async (req, res) => {
  const userId = req.user._id;
  const userRole = req.user.role;
  const userStoreId = req.user.storeId;
  const ipAddress = req.ip

  try {
    // Restriction: Staff cannot add/create products
    if (userRole === 'staff') {
      return res.status(403).json({ message: "Staff are not allowed to create products." });
    }

    const { productId, name, description, Category, SubCategory, MRP, Price, quantity, supplier, storeId } = req.body;

    if (!name || !Category || MRP === undefined || MRP === null) {
      return res.status(400).json({ error: "Please provide all essential product details (name, Category, MRP)." });
    }

    let targetStoreId;
    try {
      targetStoreId = resolveTargetStoreId(req.user, storeId);
    } catch (err) {
      return res.status(400).json({ message: err.message });
    }

    // Auto-create category if it doesn't exist
    const categoryName = String(Category).trim();
    try {
      const escapedName = categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingCategory = await CategoryModel.findOne({ name: { $regex: new RegExp(`^${escapedName}$`, 'i') } });
      if (!existingCategory) {
        const newCat = new CategoryModel({
          name: categoryName,
          description: `Auto-created category for ${categoryName}`
        });
        await newCat.save();
      }
    } catch (catError) {
      logger.error("Error auto-creating category:", catError);
    }

    const createdProduct = new Product({
      productId, name, description, Category, SubCategory, MRP, Price, quantity, supplier, 
      storeId: targetStoreId
    });

    await createdProduct.save();

    await logActivity({
      action: "Add Product",
      description: `Product ${name} was added to store ${targetStoreId}`,
      entity: "product",
      entityId: createdProduct._id,
      userId: userId,
      ipAddress: ipAddress,
    })

    res.status(201).json({ message: "Product created successfully" });

  } catch (error) {
    logger.error("Backend Error in Addproduct:", error);
    res.status(500).json({ message: "Error in creating product: " + error.message, error: error.message });
  }
}

module.exports.getProduct = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userStoreId = req.user.storeId?._id || req.user.storeId;

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 1000;
    const skip = (page - 1) * limit;

    // Products are global catalog — all users see all products
    // Only admin filters by nothing; staff/manager still see the full catalog
    const totalProduct = await Product.countDocuments({});
    const Products = await Product.find({})
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate("supplier", "name contactInfo")
      .populate("storeId", "name");

    if (Products.length === 0 && page === 1) {
      return res.status(404).json({ message: "Products not found" });
    }

    // For staff/manager: attach their store's quantity from StoreInventory
    let productsWithStoreQty = Products;
    if (userRole !== 'admin' && userStoreId) {
      const storeInventory = await StoreInventory.find({ storeId: userStoreId });
      const inventoryMap = {};
      storeInventory.forEach(inv => {
        inventoryMap[inv.product.toString()] = inv.quantity;
      });

      productsWithStoreQty = Products.map(p => {
        const obj = p.toObject();
        obj.storeQuantity = inventoryMap[p._id.toString()] ?? 0;
        return obj;
      });
    }

    res.status(200).json({ 
      Products: productsWithStoreQty, 
      totalProduct, 
      currentPage: page, 
      totalPages: Math.ceil(totalProduct / limit) 
    });
  } catch (error) {
    res.status(500).json({ message: "Error getting products", error: error.message });
  }
};

module.exports.getProductStats = async (req, res) => {
  try {
    const userRole = req.user.role;
    const reqStoreId = req.query.storeId;
    let targetStoreId = null;

    if (userRole === 'admin') {
      targetStoreId = reqStoreId && reqStoreId !== 'all' ? reqStoreId : null;
    } else {
      targetStoreId = req.user.storeId?._id || req.user.storeId;
    }
    
    if (!targetStoreId && userRole === 'admin') {
      // Global stats
      const products = await Product.find({});
      
      let lowStockCount = 0;
      let outOfStockCount = 0;
      let totalInventoryValue = 0;

      products.forEach(p => {
        if (p.quantity === 0) {
          outOfStockCount++;
        } else if (p.quantity <= (p.lowStockThreshold || 10)) {
          lowStockCount++;
        }
        totalInventoryValue += (Math.max(0, p.quantity) * (p.MRP || p.Price || 0));
      });

      return res.status(200).json({
        totalProducts: products.length,
        lowStockCount,
        outOfStockCount,
        totalInventoryValue
      });
    } else {
      if (!targetStoreId) {
        return res.status(200).json({
          totalProducts: 0,
          lowStockCount: 0,
          outOfStockCount: 0,
          totalInventoryValue: 0
        });
      }

      // Store-specific stats: compare against global catalog
      const allProducts = await Product.find({}).lean();
      const storeInventory = await StoreInventory.find({ storeId: targetStoreId }).lean();
      
      const inventoryMap = {};
      storeInventory.forEach(inv => {
        inventoryMap[inv.product.toString()] = inv.quantity;
      });

      let lowStockCount = 0;
      let outOfStockCount = 0;
      let totalInventoryValue = 0;

      allProducts.forEach(p => {
        const qty = inventoryMap[p._id.toString()] || 0;
        
        if (qty === 0) {
          outOfStockCount++;
        } else if (qty <= (p.lowStockThreshold || 10)) {
          lowStockCount++;
        }
        
        const price = p.MRP || p.Price || 0;
        totalInventoryValue += (Math.max(0, qty) * price);
      });

      return res.status(200).json({
        totalProducts: allProducts.length,
        lowStockCount,
        outOfStockCount,
        totalInventoryValue
      });
    }
  } catch (error) {
    res.status(500).json({ message: "Error fetching dashboard stats", error: error.message });
  }
};

module.exports.RemoveProduct = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user._id;
    const userRole = req.user.role;
    const ipAddress = req.ip

    // Restriction: Staff cannot remove products
    if (userRole === 'staff') {
      return res.status(403).json({ message: "Staff are not allowed to remove products." });
    }

    const deletedProduct = await Product.findByIdAndDelete(productId);

    if (!deletedProduct) {
      return res.status(404).json({ message: "Product not found!" });
    }

    await logActivity({
      action: "Delete Product",
      description: `Product ${deletedProduct.name}" was deleted.`,
      entity: "product",
      entityId: deletedProduct._id,
      userId: userId,
      ipAddress: ipAddress,
    });

    res.status(200).json({ message: "Product deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Error deleting product", error: error.message });
  }
};

module.exports.EditProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;
    const userId = req.user._id;
    const userRole = req.user.role;
    const ipAddress = req.ip;

    // Restriction: Staff cannot edit products
    if (userRole === 'staff') {
      return res.status(403).json({ message: "Staff are not allowed to edit products." });
    }

    if (!updatedData || Object.keys(updatedData).length === 0) {
      return res.status(400).json({ message: "Invalid update data provided." });
    }

    const updatedProduct = await Product.findByIdAndUpdate(
      id,
      updatedData,
      { new: true, runValidators: true }
    );

    if (!updatedProduct) {
      return res.status(404).json({ message: "Product not found." });
    }

    await logActivity({
      action: "Update Product",
      description: `Product "${updatedProduct.name}" was updated.`,
      entity: "product",
      entityId: updatedProduct._id,
      userId: userId,
      ipAddress: ipAddress,
    });

    res.status(200).json(updatedProduct);
  } catch (error) {
    logger.error("Error updating product:", error);
    res.status(500).json({ message: "Error updating product", error: error.message });
  }
};

module.exports.SearchProduct = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res.status(400).json({ message: "Query parameter is required" });
    }

    const filter = {
      $or: [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { Category: { $regex: query, $options: "i" } },
      ],
    };

    const products = await Product.find(filter)
      .populate("supplier", "name contactInfo")
      .populate("storeId", "name");

    res.json(products);
  } catch (error) {
    res.status(500).json({ message: "Error finding product", error: error.message });
  }
};

module.exports.getTopProductsByQuantity = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userStoreId = req.user.storeId;
    const filter = (userRole === 'admin') ? {} : { storeId: userStoreId };

    const topProducts = await Product.find(filter)
      .sort({ quantity: -1 })
      .limit(10);

    if (!topProducts || topProducts.length === 0) {
      return res.status(404).json({ message: "No products found" });
    }

    res.status(200).json({ success: true, topProducts });
  } catch (error) {
    res.status(500).json({ message: "Error fetching products for chart", error: error.message });
  }
};

module.exports.getCategoryStockDistribution = async (req, res) => {
  try {
    const userRole = req.user.role;
    const reqStoreId = req.query.storeId;
    let targetStoreId = null;

    if (userRole === 'admin') {
      targetStoreId = reqStoreId && reqStoreId !== 'all' ? reqStoreId : null;
    } else {
      targetStoreId = req.user.storeId?._id || req.user.storeId;
    }

    if (!targetStoreId && userRole === 'admin') {
      // Aggregate total quantity per category using global Product
      const categoryAgg = await Product.aggregate([
        { $match: {} },
        {
          $group: {
            _id: '$Category',
            totalQuantity: { $sum: '$quantity' },
            totalValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$MRP', 0] }] } },
            productCount: { $sum: 1 },
          },
        },
        { $sort: { totalQuantity: -1 } },
      ]);

      const categoriesWithTopProducts = await Promise.all(
        categoryAgg.map(async (cat) => {
          const topProducts = await Product.find({ Category: cat._id })
            .sort({ quantity: -1 })
            .limit(5)
            .select('name quantity MRP Price');
          return {
            category: cat._id,
            totalQuantity: cat.totalQuantity,
            totalValue: cat.totalValue,
            productCount: cat.productCount,
            topProducts,
          };
        })
      );
      return res.status(200).json({ success: true, categories: categoriesWithTopProducts });
    } else {
      if (!targetStoreId) {
        return res.status(200).json({ success: true, categories: [] });
      }

      // Aggregate using StoreInventory
      const mongoose = require('mongoose');
      const categoryAgg = await StoreInventory.aggregate([
        { $match: { storeId: new mongoose.Types.ObjectId(targetStoreId) } },
        {
          $lookup: {
            from: 'products',
            localField: 'product',
            foreignField: '_id',
            as: 'prod'
          }
        },
        { $unwind: '$prod' },
        {
          $group: {
            _id: '$prod.Category',
            totalQuantity: { $sum: '$quantity' },
            totalValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$prod.MRP', '$prod.Price', 0] }] } },
            productCount: { $sum: 1 },
          },
        },
        { $sort: { totalQuantity: -1 } },
      ]);

      const categoriesWithTopProducts = await Promise.all(
        categoryAgg.map(async (cat) => {
          const topProductsAgg = await StoreInventory.aggregate([
            { $match: { storeId: new mongoose.Types.ObjectId(targetStoreId) } },
            {
              $lookup: {
                from: 'products',
                localField: 'product',
                foreignField: '_id',
                as: 'prod'
              }
            },
            { $unwind: '$prod' },
            { $match: { 'prod.Category': cat._id } },
            { $sort: { quantity: -1 } },
            { $limit: 5 },
            {
              $project: {
                name: '$prod.name',
                quantity: '$quantity',
                MRP: '$prod.MRP',
                Price: '$prod.Price'
              }
            }
          ]);
          return {
            category: cat._id,
            totalQuantity: cat.totalQuantity,
            totalValue: cat.totalValue,
            productCount: cat.productCount,
            topProducts: topProductsAgg,
          };
        })
      );
      return res.status(200).json({ success: true, categories: categoriesWithTopProducts });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching category stock distribution', error: error.message });
  }
};

module.exports.getStockAlerts = async (req, res) => {
  try {
    const userRole = req.user.role;
    const reqStoreId = req.query.storeId;
    let targetStoreId = null;

    if (userRole === 'admin') {
      targetStoreId = reqStoreId && reqStoreId !== 'all' ? reqStoreId : null;
    } else {
      targetStoreId = req.user.storeId?._id || req.user.storeId;
    }

    if (!targetStoreId && userRole === 'admin') {
      const products = await Product.find({})
        .select('name Category quantity MRP Price lowStockThreshold')
        .sort({ quantity: 1 });

      const outOfStock = products.filter(p => p.quantity === 0);
      const lowStock   = products.filter(p => p.quantity > 0 && p.quantity <= (p.lowStockThreshold || 10));

      return res.status(200).json({ success: true, outOfStock, lowStock });
    } else {
      if (!targetStoreId) {
        return res.status(200).json({ success: true, outOfStock: [], lowStock: [] });
      }

      // Staff / Manager or filtered by store — compare against global catalog
      const allProducts = await Product.find({})
        .select('name Category MRP Price lowStockThreshold')
        .sort({ name: 1 })
        .lean();
      
      const storeInventory = await StoreInventory.find({ storeId: targetStoreId }).lean();
      
      const inventoryMap = {};
      storeInventory.forEach(inv => {
        inventoryMap[inv.product.toString()] = inv.quantity;
      });

      const outOfStock = [];
      const lowStock = [];

      allProducts.forEach(p => {
        const qty = inventoryMap[p._id.toString()] || 0;
        const pDetails = {
          _id: p._id,
          name: p.name,
          Category: p.Category,
          quantity: qty,
          MRP: p.MRP,
          Price: p.Price,
          lowStockThreshold: p.lowStockThreshold
        };

        if (qty === 0) {
          outOfStock.push(pDetails);
        } else if (qty > 0 && qty <= (p.lowStockThreshold || 10)) {
          lowStock.push(pDetails);
        }
      });

      return res.status(200).json({ success: true, outOfStock, lowStock });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock alerts', error: error.message });
  }
};
