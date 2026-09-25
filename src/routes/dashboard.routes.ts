import { Router } from "express";

import {
  getDashboardStats,
} from "../controllers/dashboard.controller";

import { adminAuth } from "../middleware/adminAuth";

const router = Router();

router.use(adminAuth);

router.get(
  "/stats",
  getDashboardStats
);

export default router;