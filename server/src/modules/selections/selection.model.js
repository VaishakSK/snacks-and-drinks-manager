import mongoose from "mongoose";

const selectionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    dateKey: { type: String, required: true, index: true }, // YYYY-MM-DD

    // Drinks are available Mon-Fri for both sessions. Snacks only if enabled (checked at write-time).
    morningDrinkItemId: { type: mongoose.Schema.Types.ObjectId, ref: "CatalogItem" },
    eveningDrinkItemId: { type: mongoose.Schema.Types.ObjectId, ref: "CatalogItem" },
    eveningSnackItemId: { type: mongoose.Schema.Types.ObjectId, ref: "CatalogItem" }
  },
  { timestamps: true }
);

selectionSchema.index({ userId: 1, dateKey: 1 }, { unique: true });

export const Selection = mongoose.model("Selection", selectionSchema);

