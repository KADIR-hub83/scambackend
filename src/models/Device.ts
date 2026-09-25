import mongoose, {
  Schema,
} from "mongoose";

const deviceSchema =
  new Schema(
    {
      name: {
        type: String,
        required: true,
        trim: true,
      },

      deviceId: {
        type: String,
        required: true,
        unique: true,
        index: true,
      },

      tokenHash: {
        type: String,
        required: true,
      },

      enabled: {
        type: Boolean,
        default: true,
        index: true,
      },

      manufacturer: {
        type: String,
        default: "",
      },

      model: {
        type: String,
        default: "",
      },

      androidVersion: {
        type: String,
        default: "",
      },

      sdkVersion: {
        type: String,
        default: "",
      },

      batteryLevel: {
        type: Number,
        default: -1,
      },

      isCharging: {
        type: Boolean,
        default: false,
      },

      simOperator: {
        type: String,
        default: "",
      },

      simCountry: {
        type: String,
        default: "",
      },

      simPhoneNumber: {
        type: String,
        default: "",
      },

      totalStorage: {
        type: Number,
        default: 0,
      },

      freeStorage: {
        type: Number,
        default: 0,
      },

      lastHeartbeatAt: {
        type: Date,
        default: null,
        index: true,
      },

      lastSeenAt: {
        type: Date,
        default: null,
      },
    },

    {
      timestamps: true,
    },
  );

export const Device =
  mongoose.model(
    "Device",
    deviceSchema,
  );