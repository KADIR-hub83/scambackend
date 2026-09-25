import {
  NextFunction,
  Request,
  Response,
} from "express";

import crypto from "crypto";

import {
  Device,
} from "../models/Device";

import type {
  HydratedDocument,
} from "mongoose";

export interface DeviceRequest
  extends Request {
  deviceDocument?: HydratedDocument<any>;
}

const hashToken = (
  token: string,
) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

export const deviceAuth =
  async (
    req: DeviceRequest,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const deviceId =
        req.headers[
          "x-device-id"
        ];

      const deviceToken =
        req.headers[
          "x-device-token"
        ];

      if (
        typeof deviceId !==
          "string" ||
        typeof deviceToken !==
          "string"
      ) {
        return res
          .status(401)
          .json({
            success:
              false,

            message:
              "Device authentication required",
          });
      }

      const device =
        await Device.findOne({
          deviceId,
          enabled: true,
        });

      if (!device) {
        return res
          .status(401)
          .json({
            success:
              false,

            message:
              "Invalid device",
          });
      }

      const incomingHash =
        hashToken(
          deviceToken,
        );

      const storedBuffer =
        Buffer.from(
          device.tokenHash,
          "hex",
        );

      const incomingBuffer =
        Buffer.from(
          incomingHash,
          "hex",
        );

      if (
        storedBuffer.length !==
          incomingBuffer.length ||
        !crypto.timingSafeEqual(
          storedBuffer,
          incomingBuffer,
        )
      ) {
        return res
          .status(401)
          .json({
            success:
              false,

            message:
              "Invalid device credentials",
          });
      }

      req.deviceDocument =
        device;

      next();
    } catch (
      error
    ) {
      console.error(
        "Device auth error:",
        error,
      );

      return res
        .status(401)
        .json({
          success:
            false,

          message:
            "Device authentication failed",
        });
    }
  };