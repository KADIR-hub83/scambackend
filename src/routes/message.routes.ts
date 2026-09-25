import { Router } from "express";

import {
  getMessages,
  receiveMessage,
} from "../controllers/message.controller.js";

import { adminAuth } from "../middleware/adminAuth.js";
import { deviceAuth } from "../middleware/deviceAuth.js";

const router = Router();

router.post("/receive", deviceAuth, receiveMessage);

router.get("/", adminAuth, getMessages);

export default router;