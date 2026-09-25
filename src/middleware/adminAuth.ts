import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";

export interface AdminRequest extends Request {
  adminId?: string;
}

export const adminAuth = (
  req: AdminRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    const token = authorization.substring(7);

    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET is missing");
    }

    const decoded = jwt.verify(token, secret) as {
      adminId: string;
    };

    req.adminId = decoded.adminId;

    next();
  } catch {
    return res.status(401).json({
      success: false,
      message: "Invalid or expired token",
    });
  }
};