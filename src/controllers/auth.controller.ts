import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

import { Admin } from "../models/Admin.js";

export const login = async (
  req: Request,
  res: Response
) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required",
    });
  }

  const admin = await Admin.findOne({
    email: email.toLowerCase(),
  });

  if (!admin) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  const validPassword = await bcrypt.compare(
    password,
    admin.passwordHash
  );

  if (!validPassword) {
    return res.status(401).json({
      success: false,
      message: "Invalid credentials",
    });
  }

  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error("JWT_SECRET missing");
  }

  const token = jwt.sign(
    {
      adminId: admin._id.toString(),
    },
    secret,
    {
      expiresIn: "7d",
    }
  );

  return res.json({
    success: true,
    token,
    admin: {
      id: admin._id,
      email: admin.email,
    },
  });
};