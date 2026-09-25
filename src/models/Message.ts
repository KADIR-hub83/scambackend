import mongoose, { Schema } from "mongoose";

const messageSchema = new Schema(
  {
    device: {
      type: Schema.Types.ObjectId,
      ref: "Device",
      required: true,
      index: true,
    },

    sender: {
      type: String,
      required: true,
      trim: true,
      maxlength: 150,
    },

    body: {
      type: String,
      required: true,
      maxlength: 10000,
    },

    receivedAt: {
      type: Date,
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({
  device: 1,
  receivedAt: -1,
});

export const Message = mongoose.model("Message", messageSchema);