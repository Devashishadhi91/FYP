# Inventory Management System

> A full-stack, multi-store Inventory Management System built with the **MERN Stack** — designed for businesses that need real-time stock tracking, role-based access control, and intelligent analytics.

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-Express-339933?logo=node.js)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-black?logo=socket.io)](https://socket.io/)

---

## Live Demo

- **Frontend:** [https://advanced-inventory-management-system.vercel.app](https://advanced-inventory-management-system.vercel.app)

---

## Features

### Multi-Store Architecture
- Manage multiple store locations from a single system
- Each store has its own scoped inventory, orders, and purchases
- Store-level stock tracking with `StoreInventory` model

### Product & Category Management
- Add, edit, delete, and view products with image uploads (via **Cloudinary**)
- Organize products by categories
- Track per-store and global stock levels
- Low-stock and out-of-stock alerts scoped per store

### Order Management
- Create customer orders with automatic store assignment
- Manage order statuses: `Pending → Delivered → Returned`
- Returned orders automatically revert stock to the warehouse
- Associated **Purchase records** are auto-generated on order creation

### Sales & Purchase Tracking
- View daily, weekly, and monthly sales revenue
- Full purchase history with supplier linkage
- Inventory valuation: total stock × unit cost per store

### Dashboard Analytics
- Role-specific dashboards (Admin / Manager / Staff)
- KPI cards: Total Revenue, Orders, Products, Inventory Value
- Interactive charts: Sales trends, category stock distribution
- Top-selling products view

### AI Chatbot Assistant
- Built-in chatbot powered by the backend AI controller
- Helps users query inventory, orders, and summaries

### Real-Time Notifications
- WebSocket (Socket.IO) powered live notifications
- Push notification support via **Web Push API**
- Activity log tracking for all key system actions

### Reports & Invoices
- Generate PDF reports and invoices using **PDFKit**
- Export data to Excel via **XLSX**

### Authentication & Security
- JWT-based authentication stored in **HTTP-only cookies**
- Role-Based Access Control: `Admin`, `Manager`, `Staff`
- Rate limiting (`express-rate-limit`), MongoDB sanitization, and Helmet security headers
- Email-based features via **Nodemailer** + **Google APIs**

### User Management
- Admin can view, activate/deactivate, and manage user roles
- Profile pages with activity history
- Signup and login with secure password hashing (**bcryptjs**)

---

## Tech Stack

### Backend
| Package               | Purpose                                      |
|-----------------------|----------------------------------------------|
| Node.js + Express     | REST API server                              |
| MongoDB + Mongoose    | Database & ODM                               |
| Socket.IO             | Real-time WebSocket communication            |
| JWT + bcryptjs        | Auth & password hashing                      |
| Helmet                | HTTP security headers                        |
| express-rate-limit    | API rate limiting                            |
| express-mongo-sanitize| NoSQL injection prevention                   |
| Cloudinary            | Image storage & delivery                     |
| Nodemailer + googleapis| Email & OAuth2 integration                  |
| PDFKit                | PDF report & invoice generation              |
| Winston               | Server-side logging                          |
| Web Push              | Browser push notifications                   |
| Jest + Supertest      | Unit & integration testing                   |
| mongodb-memory-server | In-memory MongoDB for tests                  |

### Frontend
| Package               | Purpose                                      |
|-----------------------|----------------------------------------------|
| React 19              | UI library                                   |
| React Router DOM v7   | Client-side routing                          |
| Redux Toolkit         | Global state management                      |
| Tailwind CSS v3 + DaisyUI | Styling                                 |
| Recharts + Chart.js   | Data visualisation & analytics charts        |
| Framer Motion         | Animations & transitions                     |
| React Hook Form + Yup | Form handling & validation                   |
| Axios                 | HTTP client                                  |
| Socket.IO Client      | Real-time event handling                     |
| Lucide React + React Icons | Icon libraries                         |
| react-hot-toast       | Toast notifications                          |
| XLSX                  | Excel export                                 |
| date-fns              | Date formatting utilities                    |

---

## Project Structure

```
inventory-management-system/
├── backend/
│   ├── controller/          # Route handlers (auth, product, order, sales, store, chatbot, ...)
│   ├── models/              # Mongoose schemas (User, Product, Order, Sales, Purchase, Store, ...)
│   ├── Routers/             # Express routers
│   ├── middleware/          # Auth guards, role checks
│   ├── libs/                # DB config, env validation, utilities
│   ├── __tests__/           # Jest unit & integration tests
│   ├── logs/                # Winston log files
│   └── server.js            # App entry point
│
└── frontend/
    ├── src/
    │   ├── pages/           # All page components (Dashboard, Products, Orders, Sales, ...)
    │   ├── components/      # Reusable UI components
    │   ├── lib/             # API helpers and utility functions
    │   ├── store/           # Redux slices & store config
    │   └── App.jsx          # Root component & routing
    └── public/
```

---

## User Roles

| Role    | Capabilities                                                                 |
|---------|------------------------------------------------------------------------------|
| **Admin**   | Full access: manage stores, users, products, orders, reports, settings   |
| **Manager** | Manage store-scoped inventory, purchases, orders, and view reports       |
| **Staff**   | View store inventory, process sales, and receive notifications            |

---

## Getting Started

### Prerequisites
- Node.js ≥ 18
- MongoDB Atlas account (or local MongoDB)
- Cloudinary account
- Google Cloud project (for Gmail OAuth2 / Nodemailer)

### 1. Clone the Repository
```bash
git clone https://github.com/Devashishadhi91/FYP.git
cd FYP
```

### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
PORT=3003
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

EMAIL_USER=your_gmail@gmail.com
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REFRESH_TOKEN=your_refresh_token

VAPID_PUBLIC_KEY=your_vapid_public_key
VAPID_PRIVATE_KEY=your_vapid_private_key
```

Start the backend server:
```bash
npm start
```
> Server runs at `http://localhost:3003`

### 3. Frontend Setup
```bash
cd ../frontend
npm install
```

Create a `.env` file in the `frontend/` directory:
```env
REACT_APP_API_URL=http://localhost:3003
```

Start the frontend dev server:
```bash
npm start
```
> App runs at `http://localhost:3000`

---

## Running Tests

```bash
cd backend
npm test
```

Tests use **Jest** with **mongodb-memory-server** for an isolated in-memory database. No external MongoDB connection is required for testing.

---

## API Overview

| Prefix                  | Module                    |
|-------------------------|---------------------------|
| `/api/auth`             | Authentication & user auth|
| `/api/product`          | Product CRUD & stats      |
| `/api/order`            | Order management          |
| `/api/sales`            | Sales tracking            |
| `/api/stocktransaction` | Purchases & stock entries |
| `/api/category`         | Category management       |
| `/api/supplier`         | Supplier management       |
| `/api/store`            | Multi-store management    |
| `/api/inventory`        | Inventory movements       |
| `/api/notification`     | Notifications             |
| `/api/activitylogs`     | Activity log tracking     |
| `/api/reports`          | Report generation         |
| `/api/invoice`          | Invoice PDF generation    |
| `/api/chatbot`          | AI chatbot queries        |

---

## Security

- All routes are protected with JWT middleware
- Passwords are hashed with **bcryptjs**
- API rate-limited to **1000 requests / 15 min**
- MongoDB injection sanitized via `express-mongo-sanitize`
- HTTP headers hardened with `helmet`
- CORS restricted to allowed origins only

---

## License

This project is for academic / final year project purposes.
