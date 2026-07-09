const Supplier = require("../models/Suppliermodel");
const StockTranscation = require("../models/Purchasesmodel");
const logger = require("../libs/appLogger");


module.exports.createSupplier = async (req, res) => {
  try {
    const { name, contactInfo, productsSupplied } = req.body;

    if (!name || !contactInfo || !productsSupplied) {
      return res.status(400).json({ success: false, message: "All fields are required." });

  

    }

    const newSupplier = new Supplier({
      name,
      contactInfo,
      productsSupplied,
    });

    await newSupplier.save();

    res.status(201).json({ success: true, message: "Supplier created successfully", newSupplier });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error creating supplier", error });
  }
};


module.exports.getAllSuppliers = async (req, res) => {
  try {
    const Suppliers = await Supplier.find().populate("productsSupplied");

    res.status(200).json(Suppliers);
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching suppliers", error });
  }
};


module.exports.getSupplierById = async (req, res) => {
  try {
    const { supplierId } = req.params;

    const supplier = await Supplier.findById(supplierId).populate("productsSupplied");

    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }

    res.status(200).json({ success: true, supplier });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error fetching supplier", error });
  }
};





module.exports.editSupplier = async (req, res) => {
  const { supplierId } = req.params;
  const { name, contactInfo, productsSupplied } = req.body;

  try {
    const supplier = await Supplier.findById(supplierId);
    if (!supplier) {
      return res.status(404).json({ message: "Supplier not found" });
    }

   
    supplier.name = name || supplier.name;
    supplier.contactInfo = {
      phone: contactInfo?.phone || supplier.contactInfo?.phone || '',
      email: contactInfo?.email || supplier.contactInfo?.email || '',
      address: contactInfo?.address || supplier.contactInfo?.address || '',
    };

    // Schema stores productsSupplied as a single ObjectId (not array)
    if (productsSupplied !== undefined) {
      const singleProduct = Array.isArray(productsSupplied)
        ? productsSupplied.filter(p => p && p !== '')[0] || null
        : (productsSupplied && productsSupplied !== '' ? productsSupplied : null);
      supplier.productsSupplied = singleProduct;
    }

    const updatedSupplier = await supplier.save();

    res.status(200).json({
      message: "Supplier updated successfully",
      supplier: updatedSupplier,
    });
  } catch (error) {
    console.error('=== EDIT SUPPLIER ERROR ===');
    console.error('Message:', error.message);
    console.error('Name:', error.name);
    console.error('Stack:', error.stack);
    res.status(500).json({ message: "Error updating supplier", error: error.message });
  }
};



module.exports.deleteSupplier = async (req, res) => {
  try {
    const { supplierId } = req.params;

    const supplier = await Supplier.findByIdAndDelete(supplierId);

    if (!supplier) {
      return res.status(404).json({ success: false, message: "Supplier not found" });
    }

    res.status(200).json({ success: true, message: "Supplier deleted successfully" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Error deleting supplier", error });
  }
};


module.exports.searchSupplier = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim() === "") {
      return res.status(400).json({ success: false, message: "Query parameter is required" });
    }

  
    const suppliers = await Supplier.find({
      name: { $regex: new RegExp(query, "i") }, 
    });

    return res.json({ success: true, suppliers });
  } catch (error) {
    logger.error("Search Error:", error);
    return res.status(500).json({ success: false, message: "Error fetching supplier", error: error.message });
  }
};


module.exports.getSupplierStats = async (req, res) => {
  try {
    const mongoose = require("mongoose");
    const { startDate, endDate, supplierId } = req.query;

    // Match: only inbound purchase records that have a supplier set
    const matchStage = {
      supplier: { $ne: null, $exists: true },
      type: { $in: ["Stock-in", "purchase"] }
    };

    if (startDate || endDate) {
      matchStage.transactionDate = {};
      if (startDate) matchStage.transactionDate.$gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        matchStage.transactionDate.$lte = end;
      }
    }

    if (supplierId) {
      matchStage.supplier = new mongoose.Types.ObjectId(supplierId);
    }

    // Fetch individual purchase records with product + supplier populated
    const records = await StockTranscation.find(matchStage)
      .populate("supplier", "name contactInfo")
      .populate("product", "name sku MRP Price")
      .sort({ transactionDate: -1 })
      .lean();

    // Build per-supplier summary
    const summaryMap = {};
    const deliveries = [];

    for (const r of records) {
      const sid = r.supplier?._id?.toString() || "unknown";
      const sName = r.supplier?.name || "Unknown Supplier";

      if (!summaryMap[sid]) {
        summaryMap[sid] = {
          supplierId: sid,
          supplierName: sName,
          totalPurchases: 0,
          totalUnitsSupplied: 0,
          totalAmount: 0,
          lastDelivery: null,
        };
      }
      summaryMap[sid].totalPurchases += 1;
      summaryMap[sid].totalUnitsSupplied += r.quantityChanged || 0;
      
      const price = r.product?.Price || r.product?.MRP || 0;
      const amount = (r.quantityChanged || 0) * price;
      summaryMap[sid].totalAmount += amount;

      const t = new Date(r.transactionDate);
      if (!summaryMap[sid].lastDelivery || t > new Date(summaryMap[sid].lastDelivery)) {
        summaryMap[sid].lastDelivery = r.transactionDate;
      }

      deliveries.push({
        _id: r._id,
        supplierName: sName,
        supplierId: sid,
        productName: r.product?.name || "Unknown Product",
        productSku: r.product?.sku || "-",
        quantitySupplied: r.quantityChanged || 0,
        date: r.transactionDate,
        status: r.status || "delivered",
        type: r.type,
        amount: amount,
      });
    }

    const summary = Object.values(summaryMap).sort(
      (a, b) => b.totalUnitsSupplied - a.totalUnitsSupplied
    );

    res.status(200).json({ success: true, deliveries, summary });
  } catch (error) {
    logger.error("Supplier Stats Error:", error);
    res.status(500).json({ success: false, message: "Error fetching supplier stats", error: error.message });
  }
};


