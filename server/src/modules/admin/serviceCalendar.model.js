import mongoose from "mongoose";

// Controls which weekdays have snacks by default, plus date overrides.
// Weekends always excluded by business logic (Sat/Sun).
//
// Example:
// defaultSnackWeekdays: [1,3]  // Mon, Wed
// overrides: [{ dateKey: "2026-01-26", snacksAvailable: false }, { dateKey: "2026-01-27", snacksAvailable: true }]
const serviceCalendarSchema = new mongoose.Schema(
  {
    defaultSnackWeekdays: {
      type: [Number],
      default: [1, 3],
      validate: {
        validator: (arr) => arr.every((n) => Number.isInteger(n) && n >= 0 && n <= 6),
        message: "Weekdays must be integers 0..6"
      }
    },
    overrides: [
      {
        dateKey: { type: String, required: true }, // YYYY-MM-DD
        snacksAvailable: { type: Boolean, required: true }
      }
    ]
  },
  { timestamps: true }
);

serviceCalendarSchema.index({ "overrides.dateKey": 1 });

export const ServiceCalendar = mongoose.model("ServiceCalendar", serviceCalendarSchema);

