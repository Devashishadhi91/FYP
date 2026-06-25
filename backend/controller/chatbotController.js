const logger = require('../libs/appLogger');
const Sale = require('../models/Salesmodel');
const Product = require('../models/Productmodel');
const Store = require('../models/Storemodel');
const StoreInventory = require('../models/StoreInventorymodel');
module.exports.chatWithGroq = async (req, res) => {
  try {
    const { messages } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ message: "Messages array is required" });
    }

    // Ensure the API key is configured safely in the backend environment
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ message: "Groq API key not configured on server" });
    }

    // Set up the AI's core instructions and tell it how to act and that it can use tools to fetch data
    const systemMessage = {
      role: "system",
      content: `You are an integrated AI assistant for this Inventory Management System. 
You have access to tools that can query the live database dynamically.
If the user asks for data (e.g. lowest selling, top selling, store data, low stock), use the appropriate tool to fetch it, then present it nicely.
If the user asks anything out of context or unrelated to the system, you must reply that you only have information about the system and ask them you will help if they need any help with the system.`
    };

    // Prepend the system instructions before the user's actual chat history
    let payloadMessages = [systemMessage, ...messages];

    // Define the specific functions (tools) the AI is allowed to request when it needs data
    const tools = [
      {
        type: "function",
        function: {
          name: "get_sales_data",
          description: "Get the top or lowest selling products in the system.",
          parameters: {
            type: "object",
            properties: {
              sort_order: { type: "string", enum: ["highest", "lowest"], description: "Whether to get highest selling or lowest selling" },
              limit: { type: "number", description: "How many products to return (must be a number, default 5)" }
            },
            required: ["sort_order"]
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_inventory_status",
          description: "Get the current stock levels. Can filter by low stock.",
          parameters: {
            type: "object",
            properties: {
              filter: { type: "string", enum: ["all", "low_stock"] }
            }
          }
        }
      },
      {
        type: "function",
        function: {
          name: "get_store_inventory",
          description: "Get inventory for a specific store by its name.",
          parameters: {
            type: "object",
            properties: {
              storeName: { type: "string", description: "The exact or partial name of the store" }
            },
            required: ["storeName"]
          }
        }
      }
    ];

    let finalData = null;
    let iterations = 0;

    // We use a loop because if the AI decides to call a tool, we need to fetch the data, send it back, and wait for its final text response.
    // We cap it at 3 iterations to prevent infinite loops in case the AI gets confused.
    while (iterations < 3 && !finalData) {
      iterations++;

      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: payloadMessages,
          tools: tools,
          tool_choice: "auto",
          temperature: 0.7,
          max_tokens: 1024,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 401) {
          return res.status(500).json({ message: 'Invalid API key configured on server.' });
        } else if (response.status === 429) {
          return res.status(429).json({ message: 'Rate limit exceeded. Please wait a moment and try again.' });
        } else {
          return res.status(response.status).json({ message: errorData.error?.message || `API Error: ${response.status}` });
        }
      }

      const data = await response.json();
      const responseMessage = data.choices[0].message;

      // Check if the AI decided it needs to run a query (call a tool) instead of just replying with text
      if (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
        // Append the AI's request to use a tool to the chat history
        payloadMessages.push(responseMessage);

        // Loop through and execute every tool the AI asked for
        for (const toolCall of responseMessage.tool_calls) {
          const functionName = toolCall.function.name;
          const args = JSON.parse(toolCall.function.arguments);
          let toolResult = "";

          try {
            // Handle the "get_sales_data" tool: Finds either best or worst selling products
            if (functionName === "get_sales_data") {
              const sortDir = args.sort_order === "lowest" ? 1 : -1;
              const limit = args.limit ? parseInt(args.limit, 10) : 5;
              const sales = await Sale.aggregate([
                { $unwind: "$products" },
                { $group: { _id: "$products.product", totalQty: { $sum: "$products.quantity" } } },
                { $sort: { totalQty: sortDir } },
                { $limit: limit },
                { $lookup: { from: "products", localField: "_id", foreignField: "_id", as: "productInfo" } },
                { $unwind: "$productInfo" },
                { $project: { name: "$productInfo.name", totalQty: 1, _id: 0 } }
              ]);
              toolResult = JSON.stringify(sales.length > 0 ? sales : "No sales data found.");
            }
            // Handle the "get_inventory_status" tool: Checks total products or finds items critically low on stock
            else if (functionName === "get_inventory_status") {
              if (args.filter === "low_stock") {
                const lowStock = await Product.find({ $expr: { $lte: ["$quantity", "$lowStockThreshold"] } }).select('name quantity lowStockThreshold');
                toolResult = JSON.stringify(lowStock.length > 0 ? lowStock : "No items are low on stock.");
              } else {
                const count = await Product.countDocuments();
                toolResult = `Total products in system: ${count}`;
              }
            }
            // Handle the "get_store_inventory" tool: Looks up a specific store and returns its local stock
            else if (functionName === "get_store_inventory") {
              const store = await Store.findOne({ name: new RegExp(args.storeName, 'i') });
              if (!store) {
                toolResult = `Store not found with name: ${args.storeName}`;
              } else {
                const inventory = await StoreInventory.find({ storeId: store._id }).populate('product', 'name quantity');
                const formatted = inventory.map(i => ({ product: i.product?.name, quantity: i.quantity }));
                toolResult = JSON.stringify({ storeName: store.name, inventory: formatted });
              }
            } else {
              toolResult = `Unknown tool: ${functionName}`;
            }
          } catch (err) {
            toolResult = `Error executing tool: ${err.message}`;
          }

          // Append the actual database result back into the chat history so the AI can read it
          payloadMessages.push({
            tool_call_id: toolCall.id,
            role: "tool",
            name: functionName,
            content: toolResult
          });
        }
      } else {
        // If the AI didn't ask for any tools, it means it has generated the final text response.
        // We capture this response and break the loop.
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
