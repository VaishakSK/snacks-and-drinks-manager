import mongoose from "mongoose";

const wfhRequestSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    dateKey: { type: String, required: true, index: true }, // YYYY-MM-DD
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "replaced", "revoked"],
      default: "pending",
      index: true
    },
    decidedAt: { type: Date },
    decidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

wfhRequestSchema.index({ userId: 1, dateKey: 1 });
wfhRequestSchema.index({ userId: 1, status: 1, dateKey: 1 });

export const WfhRequest = mongoose.model("WfhRequest", wfhRequestSchema);
