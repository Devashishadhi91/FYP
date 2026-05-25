const mongoose = require('mongoose');

const ProductSchema = new mongoose.Schema({
    productId: {
        type: String,
        unique: true,
        sparse: true // allows existing products without ID to not conflict
    },
    name: {
        type: String,
        required: true
    },
    description: { // Renamed from Desciption
        type: String,
        default: ""
    },
    Category: {
        type: String, 
        required: true,
        index: true // Regular index for category filtering
    }, 
    SubCategory: {
        type: String
    },
    MRP: {
        type: Number,
        required: true,
    },
    Price: {
        type: Number,
        default: 0
    },
    quantity: {
        type: Number,
        default: 0,
        index: true // Regular index for inventory queries
    },
    lowStockThreshold: {
        type: Number,
        default: 10
    },
    image: {
        type: String,
    },
    supplier: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: "Supplier" 
    },
    storeId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Store',
        default: null
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
},
{ timestamps: true }
);

// Text index for search functionality
ProductSchema.index({ name: 'text' });

const Product = mongoose.model("Product", ProductSchema);

module.exports = Product;