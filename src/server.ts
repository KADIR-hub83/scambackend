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

import dashboardRoutes from "./routes/dashboard.routes";
import { errorHandler } from "./middleware/errorHandler.js";

const app = express();

const PORT = Number(process.env.PORT) || 5002;

app.use(helmet());

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
  })
);

app.use(express.json({ limit: "100kb" }));

app.use(morgan("dev"));

app.use(
  rateLimit({
    windowMs: 60 * 1000,
    limit: 100,
  })
);

app.get("/", (_req, res) => {
  res.json({
    success: true,
    message: "Personal SMS Sync API running",
  });
});

app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/devices", deviceRoutes);
app.use("/api/messages", messageRoutes);
app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(errorHandler);

const createInitialAdmin = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      "ADMIN_EMAIL or ADMIN_PASSWORD missing"
    );

    return;
  }

  const existingAdmin = await Admin.findOne({
    email: email.toLowerCase(),
  });

  if (existingAdmin) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await Admin.create({
    email: email.toLowerCase(),
    passwordHash,
  });

  console.log("Initial admin created");
};


const startServer = async () => {
  try {
    await connectDB();

    await createInitialAdmin();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `Backend running on http://localhost:${PORT}`
      );
    });
  } catch (error) {
    console.error("Failed to start server:", error);

    process.exit(1);
  }
};

startServer();