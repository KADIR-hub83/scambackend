import {
  Request,
  Response,
} from "express";

import { Device } from "../models/Device";
import { Message } from "../models/Message";

const ONLINE_THRESHOLD_MS =
  2 * 60 * 1000;

export const getDashboardStats = async (
  _req: Request,
  res: Response
) => {
  const onlineAfter = new Date(
    Date.now() - ONLINE_THRESHOLD_MS
  );

  const [
    totalDevices,
    enabledDevices,
    onlineDevices,
    totalMessages,
  ] = await Promise.all([
    Device.countDocuments(),

    Device.countDocuments({
      enabled: true,
    }),

    Device.countDocuments({
      enabled: true,

      lastHeartbeatAt: {
        $gte: onlineAfter,
      },
    }),

    Message.countDocuments(),
  ]);

  return res.json({
    success: true,

    stats: {
      totalDevices,

      enabledDevices,

      onlineDevices,

      offlineDevices: Math.max(
        enabledDevices - onlineDevices,
        0
      ),

      totalMessages,
    },
  });
};