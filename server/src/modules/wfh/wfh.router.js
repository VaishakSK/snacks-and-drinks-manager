import { Router } from "express";
import { z } from "zod";
import { requireAuth, requireApproved, requireRole } from "../../shared/auth/middleware.js";
import { parseDateKey, startOfWeekMonday, toDateKey } from "../../shared/date/dateKey.js";
import { WfhRequest } from "./wfh.model.js";
import { getWfhStatusForDate, isFriday, weekRange } from "./wfh.service.js";

function isWeekend(dateObj) {
  const dow = dateObj.getDay();
  return dow === 0 || dow === 6;
}

export function buildWfhRouter() {
  const router = Router();
  router.use(requireAuth, requireApproved);

  router.get("/status", async (req, res, next) => {
    try {
      const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.dateKey);
      const status = await getWfhStatusForDate(req.user._id, dateKey);
      res.json({ dateKey, ...status });
    } catch (e) {
      next(e);
    }
  });

  router.post("/request", requireRole("employee"), async (req, res, next) => {
    try {
      const body = z
        .object({
          dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
        })
        .parse(req.body);

      const d = parseDateKey(body.dateKey);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (d < today) return res.status(400).json({ error: "Cannot request past days" });
      if (isWeekend(d)) return res.status(400).json({ error: "Weekend is not selectable" });
      if (isFriday(body.dateKey)) return res.status(400).json({ error: "Friday is already your default WFH day" });

      const currentMonday = startOfWeekMonday(today);
      const targetMonday = startOfWeekMonday(d);
      if (toDateKey(targetMonday) !== toDateKey(currentMonday)) {
        return res.status(400).json({ error: "WFH can only be requested for the current week" });
      }

      const { start, end } = weekRange(body.dateKey);
      await WfhRequest.updateMany(
        { userId: req.user._id, status: "pending", dateKey: { $gte: start, $lte: end } },
        { $set: { status: "replaced", decidedAt: new Date() } }
      );

      const request = await WfhRequest.create({
        userId: req.user._id,
        dateKey: body.dateKey,
        status: "pending"
      });

      res.status(201).json({ request });
    } catch (e) {
      next(e);
    }
  });

  return router;
}
