import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

import { Admin } from "../src/models/Admin";

async function updateAdmin() {
  try {
    await mongoose.connect(process.env.MONGODB_URI!);

    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
      throw new Error("ADMIN_EMAIL or ADMIN_PASSWORD missing");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await Admin.updateOne(
      { email: "admin@example.com" },
      {
        $set: {
          email: email.toLowerCase(),
          passwordHash,
        },
      }
    );

    if (result.matchedCount === 0) {
      throw new Error("Existing admin not found");
    }

    console.log("Admin credentials updated successfully");
  } catch (error) {
    console.error("Failed to update admin:", error);
  } finally {
    await mongoose.disconnect();
  }
}

updateAdmin();