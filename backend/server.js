require("dotenv").config();
require('./libs/validateEnv')();
const express = require("express");
const { MongoDBconfig } = require('./libs/mongoconfig');
const { Server } = require("socket.io");
const http = require("http");
const cors = require('cors');
const cookieParser = require("cookie-parser");
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const rateLimit = require('express-rate-limit');
const authrouter = require('./Routers/authRouther');
const productrouter = require('./Routers/ProductRouter');
const orderrouter = require('./Routers/orderRouter');
const categoryrouter = require("./Routers/categoryRouter")
const notificationrouter = require("./Routers/notificationRouters");
const activityrouter = require("./Routers/activityRouter");
const inventoryrouter = require('./Routers/inventoryRouter');
const salesrouter = require('./Routers/salesRouter');
const supplierrouter = require('./Routers/supplierrouter');
const purchasesrouter = require('./Routers/purchasesrouter');
const reportrouter = require('./Routers/reportRouter');
const invoicerouter = require('./Routers/invoiceRouter');
const storerouter = require('./Routers/storeRouter');
const chatbotRouter = require('./Routers/chatbotRouter');

const PORT = process.env.PORT || 3003;
const app = express();

// Trust Render's reverse proxy for rate limiting
app.set('trust proxy', 1);

// 1. Move CORS to the TOP
const allowedOrigins = [
  "https://advanced-inventory-management-system.vercel.app",
  "https://fyp-rho-two.vercel.app",
  "http://localhost:3000"
];

app.use(cors({
  origin: function (origin, callback) {
    // allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  optionsSuccessStatus: 200
}));

// 2. Configure Helmet to be less restrictive for development/cross-origin
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginOpenerPolicy: { policy: "same-origin-allow-popups" }
}));

// 3. Rate Limiter (AFTER CORS)
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000, // Increased for dev/testing
  message: { message: "Too many requests from this IP, please try again after 15 minutes" }
});
app.use(globalLimiter);

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  },
});

io.on("connection", (socket) => {
  console.log("A user connected");
  socket.on("disconnect", () => {
    console.log("A user disconnected");
  });
})

app.use(express.json({limit: "10mb"}));
app.use(mongoSanitize());

app.set("io", io);
app.use(cookieParser());

app.use('/api/auth', authrouter);
app.use('/api/product', productrouter);
app.use('/api/order', orderrouter);
app.use('/api/category', categoryrouter);
app.use('/api/notification', notificationrouter);
app.use('/api/activitylogs', activityrouter(app)); 
app.use('/api/inventory', inventoryrouter);
app.use('/api/sales', salesrouter);
app.use('/api/supplier', supplierrouter);
app.use("/api/stocktransaction", purchasesrouter);
app.use('/api/reports', reportrouter);
app.use('/api/invoice', invoicerouter);
app.use('/api/store', storerouter);
app.use('/api/chatbot', chatbotRouter);

server.listen(PORT, () => {
  MongoDBconfig();
  console.log(`The server is running at port ${PORT}`);
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  // Ensure error response also has CORS headers if the error happened before or during route handling
  res.status(500).json({ message: "Internal Server Error" });
});

module.exports = { io, server };