const Product = require('../models/Productmodel')
const CategoryModel = require('../models/Categorymodel');
const StoreInventory = require('../models/StoreInventorymodel');
const logger = require('../libs/appLogger');
const logActivity = require('../libs/logger')

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

    // Admins can specify storeId, Managers/Staff are locked to their assigned store
    const targetStoreId = userRole === 'admin' ? storeId : userStoreId;

    if (!targetStoreId && userRole !== 'admin') {
      return res.status(400).json({ message: "No store assigned to this user." });
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
    const userStoreId = req.user.storeId?._id || req.user.storeId;
    
    if (userRole === 'admin') {
      // Admin: Get stats from global Product collection (warehouse)
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
        totalInventoryValue += (p.quantity * (p.MRP || p.Price || 0));
      });

      return res.status(200).json({
        totalProducts: products.length,
        lowStockCount,
        outOfStockCount,
        totalInventoryValue
      });
    } else {
      // Staff/Manager: Get stats from StoreInventory with product details
      const totalGlobalProducts = await Product.countDocuments({});
      const storeInventory = await StoreInventory.aggregate([
        {
          $match: { storeId: new (require('mongoose').Types.ObjectId)(userStoreId) }
        },
        {
          $lookup: {
            from: 'products',
            localField: 'product',
            foreignField: '_id',
            as: 'productDetails'
          }
        },
        {
          $unwind: {
            path: '$productDetails',
            preserveNullAndEmptyArrays: true
          }
        }
      ]);

      let lowStockCount = 0;
      let outOfStockCount = 0;
      let totalInventoryValue = 0;
      const productSet = new Set();

      storeInventory.forEach(item => {
        if (item.product) productSet.add(item.product.toString());
        
        if (item.quantity === 0) {
          outOfStockCount++;
        } else if (item.quantity <= (item.productDetails?.lowStockThreshold || 10)) {
          lowStockCount++;
        }
        
        const price = item.productDetails?.MRP || item.productDetails?.Price || 0;
        totalInventoryValue += (item.quantity * price);
      });

      return res.status(200).json({
        totalProducts: totalGlobalProducts,
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
    const userRole = req.user.role;
    const userStoreId = req.user.storeId?._id || req.user.storeId;

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

    if (userRole !== 'admin') {
      filter.storeId = userStoreId;
    }

    const products = await Product.find(filter);

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
    const userStoreId = req.user.storeId;
    const matchFilter = (userRole === 'admin') ? {} : { storeId: userStoreId };

    // Aggregate total quantity per category
    const categoryAgg = await Product.aggregate([
      { $match: matchFilter },
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

    // For each category, get top 5 products by quantity
    const categoriesWithTopProducts = await Promise.all(
      categoryAgg.map(async (cat) => {
        const catFilter = { ...matchFilter, Category: cat._id };
        const topProducts = await Product.find(catFilter)
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

    res.status(200).json({ success: true, categories: categoriesWithTopProducts });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching category stock distribution', error: error.message });
  }
};

module.exports.getStockAlerts = async (req, res) => {
  try {
    const userRole = req.user.role;
    const userStoreId = req.user.storeId?._id || req.user.storeId;

    if (userRole === 'admin') {
      const products = await Product.find({})
        .select('name Category quantity MRP Price lowStockThreshold')
        .sort({ quantity: 1 });

      const outOfStock = products.filter(p => p.quantity === 0);
      const lowStock   = products.filter(p => p.quantity > 0 && p.quantity <= (p.lowStockThreshold || 10));

      return res.status(200).json({ success: true, outOfStock, lowStock });
    } else {
      // Staff / Manager — query from StoreInventory
      const mongoose = require('mongoose');
      const storeInventory = await StoreInventory.aggregate([
        { $match: { storeId: new mongoose.Types.ObjectId(userStoreId) } },
        {
          $lookup: {
            from: 'products',
            localField: 'product',
            foreignField: '_id',
            as: 'productDetails',
          },
        },
        { $unwind: { path: '$productDetails', preserveNullAndEmptyArrays: true } },
        {
          $project: {
            _id: '$productDetails._id',
            name: '$productDetails.name',
            Category: '$productDetails.Category',
            quantity: '$quantity',
            MRP: '$productDetails.MRP',
            Price: '$productDetails.Price',
            lowStockThreshold: '$productDetails.lowStockThreshold',
          },
        },
        { $sort: { quantity: 1 } },
      ]);

      const outOfStock = storeInventory.filter(p => p.quantity === 0);
      const lowStock   = storeInventory.filter(p => p.quantity > 0 && p.quantity <= (p.lowStockThreshold || 10));

      return res.status(200).json({ success: true, outOfStock, lowStock });
    }
  } catch (error) {
    res.status(500).json({ message: 'Error fetching stock alerts', error: error.message });
  }
};
