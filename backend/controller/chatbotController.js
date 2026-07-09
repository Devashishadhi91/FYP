const logger = require('../libs/appLogger');
const Sale = require('../models/Salesmodel');
const Product = require('../models/Productmodel');
const Store = require('../models/Storemodel');
const StoreInventory = require('../models/StoreInventorymodel');
const User = require('../models/Usermodel');
const Supplier = require('../models/Suppliermodel');
const Category = require('../models/Categorymodel');
const Order = require('../models/Ordermodel');
const StockTransaction = require('../models/Purchasesmodel');
const Attendance = require('../models/Attendancemodel');

module.exports.chatWithGroq = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "Messages array is required" });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "Groq API key not configured on server" });
    }

    // System prompt: tells the AI what it is, what it can access, and how to behave
    const systemMessage = {
      role: "system",
      content: `You are an integrated AI assistant for this Inventory Management System (IMS). 
You have full access to the live database through a set of tools. Use them whenever the user asks about data.
You can answer questions about: products, inventory, sales, orders, purchases/stock transactions, suppliers, users (staff, managers, admins, distributors), stores, categories, attendance, and system-wide summaries.
When the user asks a question that requires live data, always call the appropriate tool first. Present data in a clear, readable format using lists or summaries.
If the user asks something completely unrelated to inventory management, politely say you can only assist with the Inventory Management System.
Today's date is: ${new Date().toDateString()}.`
    };

    let payloadMessages = [systemMessage, ...messages];

    // ── Full set of tools the AI can call ──────────────────────────────────────
    const tools = [
      // 1. System-wide overview
      {
        type: "function",
        function: {
          name: "get_system_summary",
          description: "Get a high-level overview of the entire IMS: counts of products, users, stores, suppliers, categories, sales, and orders.",
          parameters: { type: "object", properties: {} }
        }
      },
      // 2. Users / Staff
      {
        type: "function",
        function: {
          name: "get_users_data",
          description: "Get users in the system. Can filter by role (admin, manager, staff, distributor) or get all users. Returns names, emails, roles, and assigned store.",
          parameters: {
            type: "object",
            properties: {
              role: {
                type: "string",
                enum: ["all", "admin", "manager", "staff", "distributor"],
                description: "Filter users by their role. Use 'all' to get everyone."
              },
              limit: { type: "number", description: "Max number of users to return (default 20)" }
            },
            required: ["role"]
          }
        }
      },
      // 3. Products
      {
        type: "function",
        function: {
          name: "get_products_data",
          description: "Get product information. Can search by name or category, list all products, or find products by stock level.",
          parameters: {
            type: "object",
            properties: {
              filter: {
                type: "string",
                enum: ["all", "low_stock", "out_of_stock", "by_category", "search"],
                description: "Type of product query to perform"
              },
              category: { type: "string", description: "Category name to filter by (used when filter is 'by_category')" },
              searchTerm: { type: "string", description: "Product name to search for (used when filter is 'search')" },
              limit: { type: "number", description: "Max number of products to return (default 10)" }
            },
            required: ["filter"]
          }
        }
      },
      // 4. Sales
      {
        type: "function",
        function: {
          name: "get_sales_data",
          description: "Get sales information: top/lowest selling products, total revenue, recent sales, or sales by payment status.",
          parameters: {
            type: "object",
            properties: {
              query_type: {
                type: "string",
                enum: ["top_selling", "lowest_selling", "total_revenue", "recent_sales", "by_payment_status", "by_store"],
                description: "What kind of sales data to retrieve"
              },
              limit: { type: "number", description: "Number of records to return (default 5)" },
              payment_status: { type: "string", enum: ["paid", "pending", "partial"], description: "Filter by payment status" },
              store_name: { type: "string", description: "Store name to filter sales by (used with by_store)" }
            },
            required: ["query_type"]
          }
        }
      },
      // 5. Orders
      {
        type: "function",
        function: {
          name: "get_orders_data",
          description: "Get order information: all orders, orders by status, recent orders, or order counts.",
          parameters: {
            type: "object",
            properties: {
              filter: {
                type: "string",
                enum: ["all", "pending", "shipped", "delivered", "returned", "summary"],
                description: "Filter orders by status, or get a summary count of each status"
              },
              limit: { type: "number", description: "Number of orders to return (default 5)" }
            },
            required: ["filter"]
          }
        }
      },
      // 6. Suppliers
      {
        type: "function",
        function: {
          name: "get_suppliers_data",
          description: "Get supplier information: all suppliers, total supplier count, or details of a specific supplier.",
          parameters: {
            type: "object",
            properties: {
              filter: {
                type: "string",
                enum: ["all", "count"],
                description: "Whether to list all suppliers or just count them"
              },
              supplier_name: { type: "string", description: "Search for a specific supplier by name" }
            },
            required: ["filter"]
          }
        }
      },
      // 7. Categories
      {
        type: "function",
        function: {
          name: "get_categories_data",
          description: "Get product categories in the system.",
          parameters: {
            type: "object",
            properties: {
              include_product_counts: { type: "boolean", description: "Whether to include how many products are in each category" }
            }
          }
        }
      },
      // 8. Stores
      {
        type: "function",
        function: {
          name: "get_stores_data",
          description: "Get all stores, a specific store's details, or store inventory by store name.",
          parameters: {
            type: "object",
            properties: {
              filter: {
                type: "string",
                enum: ["all", "inventory"],
                description: "Whether to list all stores or fetch inventory for a specific store"
              },
              store_name: { type: "string", description: "Store name to filter by (used when filter is 'inventory')" }
            },
            required: ["filter"]
          }
        }
      },
      // 9. Stock Transactions / Purchases
      {
        type: "function",
        function: {
          name: "get_stock_transactions",
          description: "Get stock transaction history: recent purchases (Stock-in), stock adjustments, or transactions for a specific product.",
          parameters: {
            type: "object",
            properties: {
              filter: {
                type: "string",
                enum: ["recent", "stock_in", "stock_out", "by_product"],
                description: "Type of transaction data to fetch"
              },
              product_name: { type: "string", description: "Product name to search transactions for" },
              limit: { type: "number", description: "Number of records to return (default 10)" }
            },
            required: ["filter"]
          }
        }
      },
      // 10. Attendance
      {
        type: "function",
        function: {
          name: "get_attendance_data",
          description: "Get attendance records: today's attendance, summary for a date, or staff attendance status.",
          parameters: {
            type: "object",
            properties: {
              filter: {
                type: "string",
                enum: ["today", "summary"],
                description: "Whether to get today's records or a general summary"
              }
            },
            required: ["filter"]
          }
        }
      }
    ];

    let finalData = null;
    let iterations = 0;

    // Loop because the AI may call multiple tools before giving its final answer
    while (iterations < 5 && !finalData) {
      iterations++;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          messages: payloadMessages,
          tools: tools,
          tool_choice: "auto",
          temperature: 0.5,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) return res.status(500).json({ message: 'Invalid API key configured on server.' });
        if (response.status === 429) return res.status(429).json({ message: 'Rate limit exceeded. Please wait a moment and try again.' });
        return res.status(response.status).json({ message: errorData.error?.message || `API Error: ${response.status}` });
      }

      const data = await response.json();
      const responseMessage = data.choices[0].message;

      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        payloadMessages.push(responseMessage);

        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          let toolResult = "";

          try {

            // ── 1. System Summary ──────────────────────────────────────────────
            if (functionName === "get_system_summary") {
              const [
                totalProducts, totalUsers, totalStaff, totalManagers,
                totalAdmins, totalDistributors, totalStores, totalSuppliers,
                totalCategories, totalSales, totalOrders,
                totalRevResult, lowStockCount
              ] = await Promise.all([
                Product.countDocuments(),
                User.countDocuments(),
                User.countDocuments({ role: 'staff' }),
                User.countDocuments({ role: 'manager' }),
                User.countDocuments({ role: 'admin' }),
                User.countDocuments({ role: 'distributor' }),
                Store.countDocuments(),
                Supplier.countDocuments(),
                Category.countDocuments(),
                Sale.countDocuments(),
                Order.countDocuments(),
                Sale.aggregate([{ $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
                Product.countDocuments({ $expr: { $lte: ["$quantity", "$lowStockThreshold"] } })
              ]);
              const totalRevenue = totalRevResult[0]?.total || 0;
              toolResult = JSON.stringify({
                totalProducts, totalUsers,
                userBreakdown: { admins: totalAdmins, managers: totalManagers, staff: totalStaff, distributors: totalDistributors },
                totalStores, totalSuppliers, totalCategories,
                totalSales, totalOrders,
                totalRevenue: `Rs. ${totalRevenue.toLocaleString()}`,
                lowStockProducts: lowStockCount
              });
            }

            // ── 2. Users / Staff ────────────────────────────────────────────────
            else if (functionName === "get_users_data") {
              const limit = args.limit || 20;
              const filter = args.role === "all" ? {} : { role: args.role };
              const users = await User.find(filter)
                .select('name email role storeId createdAt')
                .populate('storeId', 'name')
                .limit(limit)
                .lean();
              const count = await User.countDocuments(filter);
              const formatted = users.map(u => ({
                name: u.name,
                email: u.email,
                role: u.role,
                store: u.storeId?.name || 'Not assigned',
                joinedOn: u.createdAt ? new Date(u.createdAt).toDateString() : 'N/A'
              }));
              toolResult = JSON.stringify({ totalCount: count, users: formatted });
            }

            // ── 3. Products ─────────────────────────────────────────────────────
            else if (functionName === "get_products_data") {
              const limit = args.limit || 10;
              let query = {};
              if (args.filter === 'low_stock') {
                query = { $expr: { $lte: ["$quantity", "$lowStockThreshold"] } };
              } else if (args.filter === 'out_of_stock') {
                query = { quantity: 0 };
              } else if (args.filter === 'by_category' && args.category) {
                query = { Category: new RegExp(args.category, 'i') };
              } else if (args.filter === 'search' && args.searchTerm) {
                query = { name: new RegExp(args.searchTerm, 'i') };
              }
              const products = await Product.find(query)
                .select('name Category quantity lowStockThreshold MRP Price')
                .populate('supplier', 'name')
                .limit(limit)
                .lean();
              const count = await Product.countDocuments(query);
              const formatted = products.map(p => ({
                name: p.name,
                category: p.Category,
                quantity: p.quantity,
                threshold: p.lowStockThreshold,
                mrp: `Rs. ${p.MRP}`,
                price: `Rs. ${p.Price}`,
                supplier: p.supplier?.name || 'N/A'
              }));
              toolResult = JSON.stringify({ matchedCount: count, products: formatted });
            }

            // ── 4. Sales ────────────────────────────────────────────────────────
            else if (functionName === "get_sales_data") {
              const limit = args.limit || 5;
              if (args.query_type === "top_selling" || args.query_type === "lowest_selling") {
                const sortDir = args.query_type === "lowest_selling" ? 1 : -1;
                const sales = await Sale.aggregate([
                  { $unwind: "$products" },
                  { $group: { _id: "$products.product", totalQty: { $sum: "$products.quantity" }, totalRevenue: { $sum: { $multiply: ["$products.quantity", "$products.price"] } } } },
                  { $sort: { totalQty: sortDir } },
                  { $limit: limit },
                  { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productInfo" } },
                  { $unwind: "$productInfo" },
                  { $project: { name: "$productInfo.name", category: "$productInfo.Category", totalQty: 1, totalRevenue: 1, _id: 0 } }
                ]);
                toolResult = JSON.stringify(sales.length > 0 ? sales : "No sales data found.");
              } else if (args.query_type === "total_revenue") {
                const result = await Sale.aggregate([
                  { $group: { _id: null, totalRevenue: { $sum: "$totalAmount" }, totalSales: { $sum: 1 } } }
                ]);
                toolResult = JSON.stringify(result[0] || { totalRevenue: 0, totalSales: 0 });
              } else if (args.query_type === "recent_sales") {
                const sales = await Sale.find()
                  .sort({ createdAt: -1 })
                  .limit(limit)
                  .populate('products.product', 'name')
                  .select('customerName totalAmount paymentStatus paymentMethod createdAt')
                  .lean();
                toolResult = JSON.stringify(sales.map(s => ({
                  customer: s.customerName,
                  amount: `Rs. ${s.totalAmount}`,
                  paymentStatus: s.paymentStatus,
                  paymentMethod: s.paymentMethod,
                  date: new Date(s.createdAt).toDateString()
                })));
              } else if (args.query_type === "by_payment_status") {
                const status = args.payment_status || "pending";
                const sales = await Sale.find({ paymentStatus: status }).limit(limit).select('customerName totalAmount createdAt').lean();
                const count = await Sale.countDocuments({ paymentStatus: status });
                toolResult = JSON.stringify({ count, sales: sales.map(s => ({ customer: s.customerName, amount: `Rs. ${s.totalAmount}`, date: new Date(s.createdAt).toDateString() })) });
              } else if (args.query_type === "by_store") {
                const store = args.store_name ? await Store.findOne({ name: new RegExp(args.store_name, 'i') }) : null;
                const storeFilter = store ? { storeId: store._id } : {};
                const result = await Sale.aggregate([
                  { $match: storeFilter },
                  { $group: { _id: "$storeId", totalRevenue: { $sum: "$totalAmount" }, totalSales: { $sum: 1 } } },
                  { $lookup: { from: "stores", localField: "_id", foreignField: "_id", as: "storeInfo" } },
                  { $unwind: { path: "$storeInfo", preserveNullAndEmpty: true } },
                  { $project: { storeName: { $ifNull: ["$storeInfo.name", "Warehouse/Direct"] }, totalRevenue: 1, totalSales: 1, _id: 0 } }
                ]);
                toolResult = JSON.stringify(result);
              }
            }

            // ── 5. Orders ───────────────────────────────────────────────────────
            else if (functionName === "get_orders_data") {
              const limit = args.limit || 5;
              if (args.filter === "summary") {
                const [pending, shipped, delivered, returned] = await Promise.all([
                  Order.countDocuments({ status: 'pending' }),
                  Order.countDocuments({ status: 'shipped' }),
                  Order.countDocuments({ status: 'delivered' }),
                  Order.countDocuments({ status: 'returned' }),
                ]);
                toolResult = JSON.stringify({ pending, shipped, delivered, returned, total: pending + shipped + delivered + returned });
              } else {
                const filter = args.filter === "all" ? {} : { status: args.filter };
                const orders = await Order.find(filter)
                  .sort({ createdAt: -1 })
                  .limit(limit)
                  .populate('requestedBy', 'name')
                  .populate('supplier', 'name')
                  .select('Description totalAmount status createdAt requestedBy supplier')
                  .lean();
                toolResult = JSON.stringify(orders.map(o => ({
                  description: o.Description,
                  amount: `Rs. ${o.totalAmount}`,
                  status: o.status,
                  requestedBy: o.requestedBy?.name || 'N/A',
                  supplier: o.supplier?.name || 'N/A',
                  date: new Date(o.createdAt).toDateString()
                })));
              }
            }

            // ── 6. Suppliers ────────────────────────────────────────────────────
            else if (functionName === "get_suppliers_data") {
              if (args.filter === "count") {
                const count = await Supplier.countDocuments();
                toolResult = `Total suppliers in the system: ${count}`;
              } else {
                const searchFilter = args.supplier_name ? { name: new RegExp(args.supplier_name, 'i') } : {};
                const suppliers = await Supplier.find(searchFilter)
                  .select('name contactInfo createdAt')
                  .lean();
                toolResult = JSON.stringify(suppliers.map(s => ({
                  name: s.name,
                  phone: s.contactInfo?.phone || 'N/A',
                  email: s.contactInfo?.email || 'N/A',
                  address: s.contactInfo?.address || 'N/A',
                  addedOn: new Date(s.createdAt).toDateString()
                })));
              }
            }

            // ── 7. Categories ───────────────────────────────────────────────────
            else if (functionName === "get_categories_data") {
              const categories = await Category.find().select('name description').lean();
              if (args.include_product_counts) {
                const withCounts = await Promise.all(categories.map(async (cat) => {
                  const count = await Product.countDocuments({ Category: new RegExp(`^${cat.name}$`, 'i') });
                  return { name: cat.name, description: cat.description || 'N/A', productCount: count };
                }));
                toolResult = JSON.stringify({ total: withCounts.length, categories: withCounts });
              } else {
                toolResult = JSON.stringify({ total: categories.length, categories: categories.map(c => ({ name: c.name, description: c.description || 'N/A' })) });
              }
            }

            // ── 8. Stores ───────────────────────────────────────────────────────
            else if (functionName === "get_stores_data") {
              if (args.filter === "inventory" && args.store_name) {
                const store = await Store.findOne({ name: new RegExp(args.store_name, 'i') });
                if (!store) {
                  toolResult = `Store not found with name: ${args.store_name}`;
                } else {
                  const inventory = await StoreInventory.find({ storeId: store._id }).populate('product', 'name Category quantity').lean();
                  toolResult = JSON.stringify({
                    storeName: store.name,
                    storeAddress: store.address,
                    inventory: inventory.map(i => ({ product: i.product?.name, category: i.product?.Category, storeQuantity: i.quantity }))
                  });
                }
              } else {
                const stores = await Store.find().select('name address contactNumber').lean();
                const withStaffCounts = await Promise.all(stores.map(async (store) => {
                  const staffCount = await User.countDocuments({ storeId: store._id, role: 'staff' });
                  return { name: store.name, address: store.address, contact: store.contactNumber || 'N/A', staffCount };
                }));
                toolResult = JSON.stringify({ total: withStaffCounts.length, stores: withStaffCounts });
              }
            }

            // ── 9. Stock Transactions / Purchases ───────────────────────────────
            else if (functionName === "get_stock_transactions") {
              const limit = args.limit || 10;
              let filter = {};
              if (args.filter === 'stock_in') filter = { type: 'Stock-in' };
              else if (args.filter === 'stock_out') filter = { type: 'Stock-out' };
              else if (args.filter === 'by_product' && args.product_name) {
                const product = await Product.findOne({ name: new RegExp(args.product_name, 'i') });
                if (!product) { toolResult = `Product not found: ${args.product_name}`; }
                else { filter = { product: product._id }; }
              }
              if (!toolResult) {
                const transactions = await StockTransaction.find(filter)
                  .sort({ createdAt: -1 })
                  .limit(limit)
                  .populate('product', 'name')
                  .populate('userId', 'name')
                  .populate('supplier', 'name')
                  .lean();
                toolResult = JSON.stringify(transactions.map(t => ({
                  type: t.type,
                  product: t.product?.name || 'N/A',
                  quantityChanged: t.quantityChanged,
                  by: t.userId?.name || 'System',
                  supplier: t.supplier?.name || 'N/A',
                  date: new Date(t.createdAt).toDateString()
                })));
              }
            }

            // ── 10. Attendance ───────────────────────────────────────────────────
            else if (functionName === "get_attendance_data") {
              const today = new Date().toISOString().split('T')[0];
              if (args.filter === "today") {
                const records = await Attendance.find({ date: today })
                  .populate('userId', 'name role')
                  .populate('storeId', 'name')
                  .lean();
                const present = records.filter(r => r.status === 'present').length;
                const absent = records.filter(r => r.status === 'absent').length;
                const pending = records.filter(r => r.status === 'pending').length;
                toolResult = JSON.stringify({
                  date: today,
                  totalRecords: records.length,
                  present, absent, pending,
                  details: records.map(r => ({
                    staff: r.userId?.name || 'N/A',
                    role: r.userId?.role || 'N/A',
                    store: r.storeId?.name || 'N/A',
                    status: r.status,
                    checkedInAt: r.checkedInAt ? new Date(r.checkedInAt).toLocaleTimeString() : 'Not checked in'
                  }))
                });
              } else {
                const allTime = await Attendance.aggregate([
                  { $group: { _id: "$status", count: { $sum: 1 } } }
                ]);
                const staffCount = await User.countDocuments({ role: 'staff' });
                toolResult = JSON.stringify({ staffCount, attendanceSummaryAllTime: allTime });
              }
            }

            else {
              toolResult = `Unknown tool: ${functionName}`;
            }
          } catch (err) {
            logger.error(`Tool error (${functionName}):`, err.message);
            toolResult = `Error executing tool ${functionName}: ${err.message}`;
          }

          payloadMessages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: functionName,
            content: toolResult
          });
        }
      } else {
        finalData = data;
      }
    }

    if (!finalData) {
      return res.status(500).json({ message: "Failed to generate response after multiple tool calls." });
    }

    return res.status(200).json(finalData);

  } catch (error) {
    logger.error("Error during Groq API call:", error.message);
    res.status(500).json({ message: "Internal Server Error", error: error.message });
  }
};
