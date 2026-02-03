import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ["admin", "employee"], required: true },

    name: { type: String, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true, index: true, unique: true },

    passwordHash: { type: String },

    google: {
      id: { type: String },
      email: { type: String, lowercase: true, trim: true }
    },

    isDisabled: { type: Boolean, default: false },

    approvalStatus: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "approved"
    },
    approvalRequestedAt: { type: Date },
    approvalDecidedAt: { type: Date },
    approvalDecidedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" }
  },
  { timestamps: true }
);

userSchema.index({ "google.id": 1 }, { sparse: true, unique: true });

export const User = mongoose.model("User", userSchema);

