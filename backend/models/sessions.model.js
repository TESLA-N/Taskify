// models/Session.js
import mongoose from 'mongoose';

const sessionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  websites: { type: [String], required: true },
  duration: { type: String, default: "30 minutes" },
  createdAt: { type: Date, default: Date.now }
});

const Session = mongoose.model("Session", sessionSchema);
export default Session;
