import {
  Request,
  Response,
} from "express";

import crypto from "crypto";

import { Device } from "../models/Device";
import { Message } from "../models/Message";

import type {
  DeviceRequest,
} from "../middleware/deviceAuth";

const ONLINE_THRESHOLD_MS =
  2 * 60 * 1000;

/* =========================================================
   HELPERS
========================================================= */

const hashToken = (
  token: string,
) => {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
};

const createDeviceToken = () => {
  return crypto
    .randomBytes(48)
    .toString("hex");
};

const getOnlineStatus = (
  lastHeartbeatAt?: Date | null,
) => {
  if (!lastHeartbeatAt) {
    return false;
  }

  return (
    Date.now() -
      new Date(
        lastHeartbeatAt,
      ).getTime() <=
    ONLINE_THRESHOLD_MS
  );
};

/* =========================================================
   ADMIN CREATE DEVICE
========================================================= */

export const createDevice =
  async (
    req: Request,
    res: Response,
  ) => {
    const { name } =
      req.body;

    if (!name?.trim()) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Device name required",
        });
    }

    const deviceId =
      crypto.randomUUID();

    const deviceToken =
      createDeviceToken();

    const device =
      await Device.create({
        name: name.trim(),

        deviceId,

        tokenHash:
          hashToken(
            deviceToken,
          ),
      });

    return res
      .status(201)
      .json({
        success: true,

        device: {
          id:
            device._id,

          name:
            device.name,

          deviceId:
            device.deviceId,

          deviceToken,
        },
      });
  };

/* =========================================================
   ADMIN GET DEVICES
========================================================= */

export const getDevices =
  async (
    _req: Request,
    res: Response,
  ) => {
    const devices =
      await Device.find()
        .select(
          "-tokenHash",
        )
        .sort({
          createdAt: -1,
        })
        .lean();

    const deviceIds =
      devices.map(
        (device) =>
          device._id,
      );

    const messageCounts =
      await Message.aggregate([
        {
          $match: {
            device: {
              $in:
                deviceIds,
            },
          },
        },

        {
          $group: {
            _id:
              "$device",

            count: {
              $sum: 1,
            },
          },
        },
      ]);

    const countMap =
      new Map(
        messageCounts.map(
          (item) => [
            String(
              item._id,
            ),

            item.count,
          ],
        ),
      );

    const result =
      devices.map(
        (device) => ({
          ...device,

          online:
            getOnlineStatus(
              device.lastHeartbeatAt,
            ),

          messageCount:
            countMap.get(
              String(
                device._id,
              ),
            ) ?? 0,
        }),
      );

    return res.json({
      success: true,
      devices: result,
    });
  };

/* =========================================================
   ADMIN GET DEVICE
========================================================= */

export const getDeviceById =
  async (
    req: Request,
    res: Response,
  ) => {
    const device =
      await Device.findById(
        req.params.id,
      )
        .select(
          "-tokenHash",
        )
        .lean();

    if (!device) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "Device not found",
        });
    }

    const messageCount =
      await Message.countDocuments({
        device:
          device._id,
      });

    return res.json({
      success: true,

      device: {
        ...device,

        online:
          getOnlineStatus(
            device.lastHeartbeatAt,
          ),

        messageCount,
      },
    });
  };

/* =========================================================
   DEVICE REGISTRATION
========================================================= */

export const registerDevice =
  async (
    req: Request,
    res: Response,
  ) => {
    const {
      installationId,
      name,
      manufacturer,
      model,
      androidVersion,
      sdkVersion,
    } = req.body;

    if (
      !installationId ||
      typeof installationId !==
        "string"
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "installationId required",
        });
    }

    const cleanInstallationId =
      installationId.trim();

    if (
      !cleanInstallationId
    ) {
      return res
        .status(400)
        .json({
          success: false,

          message:
            "Invalid installationId",
        });
    }

    let device =
      await Device.findOne({
        deviceId:
          cleanInstallationId,
      });

    /*
     * Generate a fresh device token every time
     * registration is performed.
     *
     * This allows the same installation to recover
     * if local credentials are lost.
     */
    const deviceToken =
      createDeviceToken();

    const tokenHash =
      hashToken(
        deviceToken,
      );

    const now =
      new Date();

    if (device) {
      device.name =
        name?.trim() ||
        device.name;

      device.manufacturer =
        manufacturer ??
        device.manufacturer;

      device.model =
        model ??
        device.model;

      device.androidVersion =
        androidVersion ??
        device.androidVersion;

      device.sdkVersion =
        sdkVersion ??
        device.sdkVersion;

      device.tokenHash =
        tokenHash;

      device.enabled =
        true;

      device.lastSeenAt =
        now;

      await device.save();

      return res.json({
        success: true,

        registered:
          false,

        deviceId:
          device.deviceId,

        deviceToken,
      });
    }

    device =
      await Device.create({
        name:
          name?.trim() ||
          `${manufacturer || "Android"} ${model || "Device"}`,

        deviceId:
          cleanInstallationId,

        tokenHash,

        manufacturer,
        model,

        androidVersion,
        sdkVersion,

        enabled: true,

        lastSeenAt:
          now,
      });

    return res
      .status(201)
      .json({
        success: true,

        registered:
          true,

        deviceId:
          device.deviceId,

        deviceToken,
      });
  };

/* =========================================================
   HEARTBEAT
========================================================= */

export const heartbeat =
  async (
    req: DeviceRequest,
    res: Response,
  ) => {
    const device =
      req.deviceDocument;

    const {
      manufacturer,
      model,
      androidVersion,
      sdkVersion,

      batteryLevel,
      isCharging,

      simOperator,
      simCountry,
      simPhoneNumber,

      totalStorage,
      freeStorage,
    } = req.body;

    if (
      manufacturer !==
      undefined
    ) {
      device.manufacturer =
        String(
          manufacturer,
        );
    }

    if (
      model !== undefined
    ) {
      device.model =
        String(model);
    }

    if (
      androidVersion !==
      undefined
    ) {
      device.androidVersion =
        String(
          androidVersion,
        );
    }

    if (
      sdkVersion !==
      undefined
    ) {
      device.sdkVersion =
        String(
          sdkVersion,
        );
    }

    if (
      typeof batteryLevel ===
        "number" &&
      batteryLevel >= 0 &&
      batteryLevel <= 100
    ) {
      device.batteryLevel =
        batteryLevel;
    }

    if (
      typeof isCharging ===
      "boolean"
    ) {
      device.isCharging =
        isCharging;
    }

    if (
      simOperator !==
      undefined
    ) {
      device.simOperator =
        String(
          simOperator,
        );
    }

    if (
      simCountry !==
      undefined
    ) {
      device.simCountry =
        String(
          simCountry,
        );
    }

    if (
      simPhoneNumber !==
      undefined
    ) {
      device.simPhoneNumber =
        String(
          simPhoneNumber,
        );
    }

    if (
      typeof totalStorage ===
      "number"
    ) {
      device.totalStorage =
        totalStorage;
    }

    if (
      typeof freeStorage ===
      "number"
    ) {
      device.freeStorage =
        freeStorage;
    }

    const now =
      new Date();

    device.lastHeartbeatAt =
      now;

    device.lastSeenAt =
      now;

    await device.save();

    return res.json({
      success: true,

      serverTime:
        now.toISOString(),
    });
  };

/* =========================================================
   REVOKE DEVICE
========================================================= */

export const revokeDevice =
  async (
    req: Request,
    res: Response,
  ) => {
    const device =
      await Device.findByIdAndUpdate(
        req.params.id,

        {
          enabled: false,
        },

        {
          new: true,
        },
      ).select(
        "-tokenHash",
      );

    if (!device) {
      return res
        .status(404)
        .json({
          success: false,

          message:
            "Device not found",
        });
    }

    return res.json({
      success: true,
      device,
    });
  };