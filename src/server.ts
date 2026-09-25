import "dotenv/config";

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";

import { connectDB } from "./config/db.js";
import { Admin } from "./models/Admin.js";

import authRoutes from "./routes/auth.routes.js";
import deviceRoutes from "./routes/device.routes.js";
import messageRoutes from "./routes/message.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";

import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

const PORT = Number(process.env.PORT) || 5002;

/* =========================================================
   MIDDLEWARE
========================================================= */

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);

app.use(
  express.json({
    limit: "100kb",
  })
);

app.use(morgan("dev"));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
  })
);

/* =========================================================
   DATABASE INITIALIZATION
========================================================= */

let databasePromise: Promise<void> | null = null;

const createInitialAdmin = async (): Promise<void> => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      "ADMIN_EMAIL or ADMIN_PASSWORD missing"
    );

    return;
  }

  const normalizedEmail =
    email.toLowerCase().trim();

  const existingAdmin =
    await Admin.findOne({
      email: normalizedEmail,
    });

  if (existingAdmin) {
    return;
  }

  const passwordHash =
    await bcrypt.hash(
      password,
      12
    );

  await Admin.create({
    email: normalizedEmail,
    passwordHash,
  });

  console.log("Initial admin created");
};

const initializeDatabase =
  async (): Promise<void> => {
    if (!databasePromise) {
      databasePromise = (async () => {
        await connectDB();

        await createInitialAdmin();
      })().catch((error) => {
        /*
         * Allow a later request to retry
         * if MongoDB temporarily failed.
         */
        databasePromise = null;

        throw error;
      });
    }

    await databasePromise;
  };

/* =========================================================
   DATABASE MIDDLEWARE

   Local:
   First request reuses the connection created at startup.

   Vercel:
   First invocation connects to MongoDB.
   Warm invocations reuse the same promise/connection.
========================================================= */

app.use(async (_req, res, next) => {
  try {
    await initializeDatabase();

    next();
  } catch (error) {
    console.error(
      "Database initialization failed:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Database connection failed",
    });
  }
});

/* =========================================================
   ROOT
========================================================= */

app.get("/", (_req, res) => {
  res.status(200).json({
    success: true,
    message:
      "Personal SMS Sync API running",
    environment:
      process.env.VERCEL === "1"
        ? "vercel"
        : "local",
  });
});

/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/api/health",
  (_req, res) => {
    res.status(200).json({
      success: true,
      status: "healthy",
      environment:
        process.env.VERCEL === "1"
          ? "vercel"
          : "local",
      timestamp:
        new Date().toISOString(),
    });
  }
);

/* =========================================================
   API ROUTES
========================================================= */

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/devices",
  deviceRoutes
);

app.use(
  "/api/messages",
  messageRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

/* =========================================================
   404
========================================================= */

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(errorHandler);

/* =========================================================
   LOCAL SERVER

   Vercel automatically sets VERCEL=1.
   Therefore app.listen() only runs locally.
========================================================= */

const startLocalServer =
  async (): Promise<void> => {
    try {
      await initializeDatabase();

      app.listen(
        PORT,
        "0.0.0.0",
        () => {
          console.log(
            `Backend running on http://localhost:${PORT}`
          );
        }
      );
    } catch (error) {
      console.error(
        "Failed to start server:",
        error
      );

      process.exit(1);
    }
  };

if (process.env.VERCEL !== "1") {
  void startLocalServer();
}

/* =========================================================
   VERCEL EXPORT
========================================================= */

export default app;