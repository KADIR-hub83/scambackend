import type {
  Request,
  Response,
} from "express";

import {
  Message,
} from "../models/Message.js";

import {
  Device,
} from "../models/Device.js";

import type {
  DeviceRequest,
} from "../middleware/deviceAuth.js";

import {
  isSensitiveMessage,
} from "../utils/filterSensitiveMessage.js";

/* =========================================================
   RECEIVE MESSAGE
========================================================= */

export const receiveMessage =
  async (
    req: DeviceRequest,
    res: Response
  ) => {
    try {
      const {
        sender,
        body,
        receivedAt,
      } = req.body;

      if (
        typeof sender !==
          "string" ||
        typeof body !==
          "string" ||
        !receivedAt
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "sender, body and receivedAt are required",
          });
      }

      const cleanSender =
        sender.trim();

      const cleanBody =
        body.trim();

      if (
        !cleanSender ||
        !cleanBody
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid SMS payload",
          });
      }

      /*
       * Never store authentication/security messages.
       */
      if (
        isSensitiveMessage(
          cleanBody
        )
      ) {
        return res
          .status(202)
          .json({
            success: true,
            stored: false,
            message:
              "Sensitive authentication message ignored",
          });
      }

      const date =
        new Date(
          receivedAt
        );

      if (
        Number.isNaN(
          date.getTime()
        )
      ) {
        return res
          .status(400)
          .json({
            success: false,
            message:
              "Invalid receivedAt date",
          });
      }

      const message =
        await Message.create({
          device:
            req.deviceDocument
              ._id,

          sender:
            cleanSender,

          body:
            cleanBody,

          receivedAt:
            date,
        });

      /*
       * Update device activity immediately.
       */
      await Device.updateOne(
        {
          _id:
            req.deviceDocument
              ._id,
        },
        {
          $set: {
            lastSeenAt:
              new Date(),
          },
        }
      );

      return res
        .status(201)
        .json({
          success: true,
          stored: true,

          message: {
            id:
              message._id,
          },
        });
    } catch (
      error
    ) {
      console.error(
        "Receive SMS error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to store SMS",
        });
    }
  };

/* =========================================================
   GET MESSAGES
========================================================= */

export const getMessages =
  async (
    req: Request,
    res: Response
  ) => {
    try {
      const page =
        Math.max(
          Number(
            req.query.page
          ) || 1,
          1
        );

      const limit =
        Math.min(
          Math.max(
            Number(
              req.query.limit
            ) || 30,
            1
          ),
          100
        );

      const skip =
        (
          page -
          1
        ) *
        limit;

      const filter:
        Record<
          string,
          unknown
        > = {};

      if (
        req.query.deviceId
      ) {
        const device =
          await Device.findOne(
            {
              deviceId:
                String(
                  req.query
                    .deviceId
                ),
            }
          ).select(
            "_id"
          );

        if (!device) {
          return res.json({
            success: true,
            page,
            limit,
            total: 0,
            pages: 0,
            messages: [],
          });
        }

        filter.device =
          device._id;
      }

      if (
        req.query
          .deviceMongoId
      ) {
        filter.device =
          req.query
            .deviceMongoId;
      }

      if (
        req.query.search
      ) {
        const search =
          String(
            req.query
              .search
          ).trim();

        if (search) {
          filter.$or = [
            {
              sender: {
                $regex:
                  search,

                $options:
                  "i",
              },
            },

            {
              body: {
                $regex:
                  search,

                $options:
                  "i",
              },
            },
          ];
        }
      }

      const from =
        req.query.from
          ? new Date(
              String(
                req.query
                  .from
              )
            )
          : null;

      const to =
        req.query.to
          ? new Date(
              String(
                req.query
                  .to
              )
            )
          : null;

      if (
        from ||
        to
      ) {
        const range:
          Record<
            string,
            Date
          > = {};

        if (
          from &&
          !Number.isNaN(
            from.getTime()
          )
        ) {
          range.$gte =
            from;
        }

        if (
          to &&
          !Number.isNaN(
            to.getTime()
          )
        ) {
          range.$lte =
            to;
        }

        if (
          Object.keys(
            range
          ).length >
          0
        ) {
          filter.receivedAt =
            range;
        }
      }

      const [
        messages,
        total,
      ] =
        await Promise.all([
          Message.find(
            filter
          )
            .populate(
              "device",
              "name deviceId manufacturer model lastSeenAt lastHeartbeatAt"
            )
            .sort({
              receivedAt:
                -1,
            })
            .skip(
              skip
            )
            .limit(
              limit
            )
            .lean(),

          Message.countDocuments(
            filter
          ),
        ]);

      return res.json({
        success: true,
        page,
        limit,
        total,

        pages:
          Math.ceil(
            total /
              limit
          ),

        messages,
      });
    } catch (
      error
    ) {
      console.error(
        "Get messages error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Unable to load messages",
        });
    }
  };