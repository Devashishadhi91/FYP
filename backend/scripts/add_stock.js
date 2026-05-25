require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Productmodel'); // adjust path if needed

async function addStock() {
  try {
    await mongoose.connect(process.env.MONGODB_URL || 'mongodb://localhost:27017/inventory_management', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to DB");

    const result = await Product.updateMany({}, { $inc: { quantity: 100 } });
    console.log(`Successfully updated ${result.modifiedCount} products. added 100 stock to each.`);
    
    await mongoose.disconnect();
    console.log("Disconnected from DB");
  } catch (error) {
    console.error("Error updating stock:", error);
    process.exit(1);
  }
}

addStock();
