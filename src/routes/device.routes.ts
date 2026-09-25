import {
  Router,
} from "express";

import {
  createDevice,
  getDeviceById,
  getDevices,
  heartbeat,
  registerDevice,
  revokeDevice,
} from "../controllers/device.controller";

import {
  adminAuth,
} from "../middleware/adminAuth";

import {
  deviceAuth,
} from "../middleware/deviceAuth";

const router =
  Router();

/* =========================================================
   ANDROID PUBLIC REGISTRATION
========================================================= */

router.post(
  "/register",
  registerDevice,
);

/* =========================================================
   ANDROID AUTHENTICATED ROUTES
========================================================= */

router.post(
  "/heartbeat",
  deviceAuth,
  heartbeat,
);

/* =========================================================
   ADMIN AUTHENTICATION
========================================================= */

router.use(
  adminAuth,
);

/* =========================================================
   ADMIN DEVICE ROUTES
========================================================= */

router.get(
  "/",
  getDevices,
);

router.get(
  "/:id",
  getDeviceById,
);

router.post(
  "/",
  createDevice,
);

router.patch(
  "/:id/revoke",
  revokeDevice,
);

export default router;