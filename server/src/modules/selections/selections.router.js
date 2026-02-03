import { Router } from "express";
import { z } from "zod";
import mongoose from "mongoose";

import { requireAuth, requireApproved } from "../../shared/auth/middleware.js";
import { Selection } from "./selection.model.js";
import { CatalogItem } from "../catalog/catalog.model.js";
import { addDays, parseDateKey, startOfWeekMonday, toDateKey } from "../../shared/date/dateKey.js";
import { isWeekend, snacksAvailableOnDateKey } from "../admin/serviceCalendar.service.js";
import { getApprovedWfhDateKeyForWeek } from "../wfh/wfh.service.js";
import { isEditAllowed } from "./editTimeValidator.js";

async function ensureCatalogType(itemId, type) {
  if (!itemId) return null;
  if (!mongoose.isValidObjectId(itemId)) {
    const err = new Error("Invalid item id");
    err.statusCode = 400;
    throw err;
  }
  const item = await CatalogItem.findById(itemId);
  if (!item || !item.isActive) {
    const err = new Error("Item not found/inactive");
    err.statusCode = 404;
    throw err;
  }
  if (item.type !== type) {
    const err = new Error(`Item must be of type ${type}`);
    err.statusCode = 400;
    throw err;
  }
  return item._id;
}

function isFridayDateKey(dateKey) {
  return parseDateKey(dateKey).getDay() === 5;
}

export function buildSelectionsRouter() {
  const router = Router();
  router.use(requireAuth, requireApproved);

  // Get availability + current selection for a date
  router.get("/day", async (req, res, next) => {
    try {
      const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.dateKey);
      const snacksAvailable = await snacksAvailableOnDateKey(dateKey);
      const approvedDateKey = await getApprovedWfhDateKeyForWeek(req.user._id, dateKey);
      const isWfh = approvedDateKey ? approvedDateKey === dateKey : isFridayDateKey(dateKey);
      const selection = await Selection.findOne({ userId: req.user._id, dateKey });
      res.json({ dateKey, snacksAvailable, isWfh, selection });
    } catch (e) {
      next(e);
    }
  });

  // Week overview for current user (Mon-Fri)
  router.get("/week", async (req, res, next) => {
    try {
      const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.dateKey);
      const weekMonday = startOfWeekMonday(parseDateKey(dateKey));
      const days = Array.from({ length: 5 }, (_, i) => addDays(weekMonday, i));
      const dateKeys = days.map((d) => toDateKey(d));
      const approvedDateKey = await getApprovedWfhDateKeyForWeek(req.user._id, dateKey);

      const selections = await Selection.find({
        userId: req.user._id,
        dateKey: { $in: dateKeys }
      });

      const byDate = new Map(selections.map((s) => [s.dateKey, s]));
      const dayRows = await Promise.all(
        days.map(async (d) => {
          const dk = toDateKey(d);
          const s = byDate.get(dk);
          const snacksAvailable = await snacksAvailableOnDateKey(dk);
          const isWfh = approvedDateKey ? approvedDateKey === dk : isFridayDateKey(dk);
          const hasSelection = Boolean(
            s && (s.morningDrinkItemId || s.eveningDrinkItemId || s.eveningSnackItemId)
          );
          return {
            dateKey: dk,
            snacksAvailable,
            isWfh,
            hasSelection
          };
        })
      );

      res.json({ weekOf: toDateKey(weekMonday), days: dayRows });
    } catch (e) {
      next(e);
    }
  });

  // Upsert selection for a date (single day)
  router.put("/day", async (req, res, next) => {
    try {
      const body = z
        .object({
          dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          morningDrinkItemId: z.string().nullable().optional(),
          eveningDrinkItemId: z.string().nullable().optional(),
          eveningSnackItemId: z.string().nullable().optional()
        })
        .parse(req.body);

      const d = parseDateKey(body.dateKey);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) return res.status(400).json({ error: "Cannot modify selections for past days" });

      if (isWeekend(d)) return res.status(400).json({ error: "Weekend is not selectable" });

      const snacksAvailable = await snacksAvailableOnDateKey(body.dateKey);
      const approvedDateKey = await getApprovedWfhDateKeyForWeek(req.user._id, body.dateKey);
      const isWfh = approvedDateKey ? approvedDateKey === body.dateKey : isFridayDateKey(body.dateKey);
      if (isWfh) return res.status(400).json({ error: "Work from home day" });

      const currentMonday = startOfWeekMonday(today);
      const targetMonday = startOfWeekMonday(d);
      if (toDateKey(targetMonday) !== toDateKey(currentMonday)) {
        return res.status(400).json({ error: "Selections can only be made for the current week" });
      }

      const isToday = toDateKey(d) === toDateKey(today);
      const morningAllowed = !isToday || isEditAllowed("morning");
      const eveningAllowed = !isToday || isEditAllowed("evening");

      if (body.morningDrinkItemId && !morningAllowed) {
        return res.status(403).json({
          error: "Admin blocked the edit access",
          detail: "Morning drink selections must be made before the cutoff time"
        });
      }

      if ((body.eveningDrinkItemId || body.eveningSnackItemId) && !eveningAllowed) {
        return res.status(403).json({
          error: "Admin blocked the edit access",
          detail: "Evening selections must be made before the cutoff time"
        });
      }

      if (!snacksAvailable && body.eveningSnackItemId) {
        return res.status(400).json({ error: "Snacks are not available on this day" });
      }

      const update = {
        morningDrinkItemId: await ensureCatalogType(body.morningDrinkItemId, "drink"),
        eveningDrinkItemId: await ensureCatalogType(body.eveningDrinkItemId, "drink"),
        eveningSnackItemId: snacksAvailable ? await ensureCatalogType(body.eveningSnackItemId, "snack") : null
      };

      const selection = await Selection.findOneAndUpdate(
        { userId: req.user._id, dateKey: body.dateKey },
        { $set: update },
        { upsert: true, new: true }
      );
      res.json({ selection });
    } catch (e) {
      next(e);
    }
  });

  // Fast weekly selection: apply same choices for Mon-Fri of a week (skips weekends; snacks only if enabled per day)
  router.put("/week", async (req, res, next) => {
    try {
      const body = z
        .object({
          weekOf: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), // any date within the week
          morningDrinkItemId: z.string().nullable().optional(),
          eveningDrinkItemId: z.string().nullable().optional(),
          eveningSnackItemId: z.string().nullable().optional()
        })
        .parse(req.body);

      const targetMonday = startOfWeekMonday(parseDateKey(body.weekOf));
      const currentMonday = startOfWeekMonday(new Date());

      if (toDateKey(targetMonday) !== toDateKey(currentMonday)) {
        return res.status(400).json({ error: "Week preference can only be set for the current week" });
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const approvedDateKey = await getApprovedWfhDateKeyForWeek(req.user._id, body.weekOf);

      let dates = Array.from({ length: 7 }, (_, i) => addDays(targetMonday, i))
        .filter((d) => !isWeekend(d) && d >= today)
        .map((d) => toDateKey(d));

      const todayKey = toDateKey(today);
      const includesToday = dates.includes(todayKey);

      if (includesToday) {
        const morningAllowed = isEditAllowed("morning");
        const eveningAllowed = isEditAllowed("evening");

        // If today's cutoff has passed, still allow week selection for future days.
        if (
          (!morningAllowed && body.morningDrinkItemId) ||
          (!eveningAllowed && (body.eveningDrinkItemId || body.eveningSnackItemId))
        ) {
          dates = dates.filter((d) => d !== todayKey);
        }
      }

      dates = dates.filter((d) => {
        const isWfh = approvedDateKey ? approvedDateKey === d : isFridayDateKey(d);
        return !isWfh;
      });

      const morningDrinkItemId = await ensureCatalogType(body.morningDrinkItemId, "drink");
      const eveningDrinkItemId = await ensureCatalogType(body.eveningDrinkItemId, "drink");
      const snackCandidate = body.eveningSnackItemId ? await ensureCatalogType(body.eveningSnackItemId, "snack") : null;

      const ops = [];
      for (const dateKey of dates) {
        const snacksAvailable = await snacksAvailableOnDateKey(dateKey);
        ops.push({
          updateOne: {
            filter: { userId: req.user._id, dateKey },
            update: {
              $set: {
                morningDrinkItemId,
                eveningDrinkItemId,
                eveningSnackItemId: snacksAvailable ? snackCandidate : null
              }
            },
            upsert: true
          }
        });
      }
      if (ops.length) await Selection.bulkWrite(ops);

      res.json({ ok: true, appliedDates: dates });
    } catch (e) {
      next(e);
    }
  });

  // History for current user
  router.get("/history", async (req, res, next) => {
    try {
      const limit = req.query.limit ? z.coerce.number().int().min(1).max(200).parse(req.query.limit) : 50;
      const selections = await Selection.find({ userId: req.user._id })
        .sort({ dateKey: -1 })
        .limit(limit)
        .populate("morningDrinkItemId eveningDrinkItemId eveningSnackItemId", "type name");
      res.json({ selections });
    } catch (e) {
      next(e);
    }
  });

  return router;
}

