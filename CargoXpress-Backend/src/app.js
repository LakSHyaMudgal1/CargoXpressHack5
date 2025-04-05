const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const connectDB = require("./config/database");
const mergedTraderRouter = require('./routes/mergedTrader');
require("dotenv").config(); 

const profileRouter = require("./routes/profile");
const authRouter = require("./routes/auth");
const scheduleDeliveryRouter = require("./routes/scheduleDelivery");
const mergeRouter = require("./routes/merge");
const viewCompanyRouter = require("./routes/viewCompany");

const app = express();
const port = process.env.PORT || 5000;
const isVercel = !!process.env.VERCEL; // Detect if running on Vercel

const allowedOrigins = ["http://localhost:5174","http://localhost:5173", "https://cargoxpress.vercel.app/"];

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: "GET,POST,PATCH,PUT,DELETE,OPTIONS",
    credentials: true,
  })
);

app.use(express.json());
app.use(cookieParser());

// Middleware to ensure DB is connected before handling requests
app.use(async (req, res, next) => {
  if (mongoose.connection.readyState === 0) {
    try {
      await connectDB();
    } catch (err) {
      console.error("Database Connection Failed:", err);
      return res.status(500).json({ error: "Database Connection Failed" });
    }
  }
  next();
});

// Base Route
app.get("/", (req, res) => {
  res.send("All is Well!");
});

// API Routes
app.use("/", profileRouter);
app.use("/", authRouter);
app.use("/", scheduleDeliveryRouter);
app.use("/", viewCompanyRouter);
app.use("/", mergeRouter);
app.use('/', mergedTraderRouter);


// Vercel Serverless Handler
if (isVercel) {
  module.exports = async (req, res) => {
    try {
      if (mongoose.connection.readyState === 0) await connectDB();
      return app(req, res);
    } catch (err) {
      console.error("Vercel API Error:", err);
      res.status(500).json({ error: "Internal Server Error" });
    }
  };
} else {
  // Local Development Mode
  connectDB()
    .then(() => {
      console.log("MongoDB Connected Successfully");
      app.listen(port, () => {
        console.log(`Server running on port ${port}`);
      });
    })
    .catch((err) => {
      console.error("Cannot connect to DB:", err);
      process.exit(1);
    });
}
