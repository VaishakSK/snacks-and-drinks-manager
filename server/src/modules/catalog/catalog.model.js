import mongoose from "mongoose";

const catalogItemSchema = new mongoose.Schema(
  {
    type: { type: String, enum: ["drink", "snack"], required: true, index: true },
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    cost: { type: Number, min: 0, default: null }
  },
  { timestamps: true }
);

catalogItemSchema.index({ type: 1, name: 1 }, { unique: true });

export const CatalogItem = mongoose.model("CatalogItem", catalogItemSchema);

