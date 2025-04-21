// routes/session.routes.js
import express from "express";
import {
  createSession,
  getAllSessions,
  getSessionById,
} from "../controllers/session.controller.js";

const router = express.Router();

// POST /sessions - create a session
router.post("/create", createSession);

// GET /sessions - fetch all sessions
router.get("/getall", getAllSessions);

// GET /sessions/:id - fetch session by ID
// router.get("/by/:id", getSessionById);
router.get("/by/:id", getSessionById);


export default router;
