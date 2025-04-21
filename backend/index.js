// index.js
import express from "express";
import dotenv from "dotenv";
import {connectDB }from "./lib/db.js";
import mongoose from "mongoose";
import sessionRoutes from "./routes/session.routes.js"; // ✅

dotenv.config();
const app = express();

connectDB();

app.use(express.json());

// Mount route
app.use("/sessions", sessionRoutes); // ✅

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
