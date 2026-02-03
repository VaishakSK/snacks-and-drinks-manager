import { Router } from "express";
import { z } from "zod";

import { requireAuth, requireApproved, requireRole } from "../../shared/auth/middleware.js";
import { getCalendarConfig, snacksAvailableOnDateKey } from "./serviceCalendar.service.js";
import { ServiceCalendar } from "./serviceCalendar.model.js";
import { Selection } from "../selections/selection.model.js";
import { WfhRequest } from "../wfh/wfh.model.js";
import { weekRange } from "../wfh/wfh.service.js";
import { User } from "../users/user.model.js";

export function buildAdminRouter() {
  const router = Router();

  // Admin: approve/reject new account requests
  router.get("/user-approvals", requireAuth, requireApproved, requireRole("admin"), async (req, res, next) => {
    try {
      const status = req.query.status
        ? z.enum(["pending", "approved", "rejected", "all"]).parse(req.query.status)
        : "pending";
      const query = status === "all" ? {} : { approvalStatus: status };
      const users = await User.find(query)
        .select("-passwordHash")
        .sort({ approvalRequestedAt: -1, createdAt: -1 })
        .limit(2000);
      res.json({ status, users });
    } catch (e) {
      next(e);
    }
  });

  router.patch("/user-approvals/:id", requireAuth, requireApproved, requireRole("admin"), async (req, res, next) => {
    try {
      const body = z
        .object({ status: z.enum(["approved", "rejected"]) })
        .parse(req.body);
      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.role === "admin" && body.status === "rejected") {
        return res.status(400).json({ error: "Cannot reject admin account" });
      }
      const now = new Date();
      user.approvalStatus = body.status;
      user.approvalDecidedAt = now;
      user.approvalDecidedBy = req.user._id;
      if (!user.approvalRequestedAt) user.approvalRequestedAt = user.createdAt || now;
      await user.save();
      res.json({ user: await User.findById(user._id).select("-passwordHash") });
    } catch (e) {
      next(e);
    }
  });

  // Calendar config
  router.get("/calendar", requireAuth, requireApproved, requireRole("admin"), async (_req, res, next) => {
    try {
      const cfg = await getCalendarConfig();
      res.json({ calendar: cfg });
    } catch (e) {
      next(e);
    }
  });

  router.put("/calendar", requireAuth, requireApproved, requireRole("admin"), async (req, res, next) => {
    try {
      const body = z
        .object({
          defaultSnackWeekdays: z.array(z.number().int().min(0).max(6)).min(0).max(7),
          overrides: z
            .array(
              z.object({
                dateKey: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
                snacksAvailable: z.boolean()
              })
            )
            .max(3660),
        })
        .parse(req.body);

      let cfg = await ServiceCalendar.findOne();
      if (!cfg) cfg = await ServiceCalendar.create(body);
      else {
        cfg.defaultSnackWeekdays = body.defaultSnackWeekdays;
        cfg.overrides = body.overrides;
        await cfg.save();
      }
      res.json({ calendar: cfg });
    } catch (e) {
      next(e);
    }
  });

  // Admin: manage WFH requests
  router.get("/wfh-requests", requireAuth, requireApproved, requireRole("admin"), async (req, res, next) => {
    try {
      const status = req.query.status ? z.enum(["pending", "approved", "rejected", "replaced", "revoked"]).parse(req.query.status) : undefined;
      const weekOf = req.query.weekOf ? z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.weekOf) : null;
      const today = new Date();
      const weekKey = weekOf || `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
      const { start, end } = weekRange(weekKey);

      const query = { dateKey: { $gte: start, $lte: end }, ...(status ? { status } : {}) };
      const requests = await WfhRequest.find(query)
        .populate("userId", "name email role")
        .sort({ createdAt: -1 })
        .limit(2000);
      res.json({ start, end, requests });
    } catch (e) {
      next(e);
    }
  });

  router.patch("/wfh-requests/:id", requireAuth, requireApproved, requireRole("admin"), async (req, res, next) => {
    try {
      const body = z
        .object({ status: z.enum(["approved", "rejected", "revoked"]) })
        .parse(req.body);

      const request = await WfhRequest.findById(req.params.id);
      if (!request) return res.status(404).json({ error: "Request not found" });

      const now = new Date();
      if (body.status === "approved") {
        const { start, end } = weekRange(request.dateKey);
        await WfhRequest.updateMany(
          {
            userId: request.userId,
            status: "approved",
            dateKey: { $gte: start, $lte: end },
            _id: { $ne: request._id }
          },
          { $set: { status: "replaced", decidedAt: now, decidedBy: req.user._id } }
        );
      }

      request.status = body.status;
      request.decidedAt = now;
      request.decidedBy = req.user._id;
      await request.save();

      res.json({ request });
    } catch (e) {
      next(e);
    }
  });

  // Admin: view selections + counts for a date/session
  // session: morning | evening | all
  // include: drinks | snacks | all
  router.get("/counts/day", requireAuth, requireApproved, requireRole("admin"), async (req, res, next) => {
    try {
      const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.dateKey);
      const session = z.enum(["morning", "evening", "all"]).parse(req.query.session);
      const include = req.query.include ? z.enum(["drinks", "snacks", "all"]).parse(req.query.include) : "all";

      const snacksAvailable = await snacksAvailableOnDateKey(dateKey);

      const project = {};
      if (session === "morning") {
        project.itemField = "$morningDrinkItemId";
      } else {
        // evening can include drink and snack
        project.itemDrinkField = "$eveningDrinkItemId";
        project.itemSnackField = "$eveningSnackItemId";
      }

      const match = { dateKey };

      const pipelines = [];
      if (session === "morning") {
        if (include === "snacks") return res.json({ dateKey, session, snacksAvailable, counts: [], selections: [] });
        pipelines.push({
          label: "drinks",
          pipeline: [
            { $match: match },
            { $group: { _id: "$morningDrinkItemId", count: { $sum: 1 } } },
            { $match: { _id: { $ne: null } } },
            {
              $lookup: {
                from: "catalogitems",
                localField: "_id",
                foreignField: "_id",
                as: "item"
              }
            },
            { $unwind: "$item" },
            { $project: { _id: 0, itemId: "$item._id", name: "$item.name", type: "$item.type", count: 1 } },
            { $sort: { count: -1, name: 1 } }
          ]
        });
      } else if (session === "evening") {
        if (include !== "snacks") {
          pipelines.push({
            label: "drinks",
            pipeline: [
              { $match: match },
              { $group: { _id: "$eveningDrinkItemId", count: { $sum: 1 } } },
              { $match: { _id: { $ne: null } } },
              {
                $lookup: {
                  from: "catalogitems",
                  localField: "_id",
                  foreignField: "_id",
                  as: "item"
                }
              },
              { $unwind: "$item" },
              { $project: { _id: 0, itemId: "$item._id", name: "$item.name", type: "$item.type", count: 1 } },
              { $sort: { count: -1, name: 1 } }
            ]
          });
        }
        if (include !== "drinks" && snacksAvailable) {
          pipelines.push({
            label: "snacks",
            pipeline: [
              { $match: match },
              { $group: { _id: "$eveningSnackItemId", count: { $sum: 1 } } },
              { $match: { _id: { $ne: null } } },
              {
                $lookup: {
                  from: "catalogitems",
                  localField: "_id",
                  foreignField: "_id",
                  as: "item"
                }
              },
              { $unwind: "$item" },
              { $project: { _id: 0, itemId: "$item._id", name: "$item.name", type: "$item.type", count: 1 } },
              { $sort: { count: -1, name: 1 } }
            ]
          });
        }
      } else {
        // session === "all"
        if (include !== "snacks") {
          pipelines.push({
            label: "drinksMorning",
            pipeline: [
              { $match: match },
              { $group: { _id: "$morningDrinkItemId", count: { $sum: 1 } } },
              { $match: { _id: { $ne: null } } },
              {
                $lookup: {
                  from: "catalogitems",
                  localField: "_id",
                  foreignField: "_id",
                  as: "item"
                }
              },
              { $unwind: "$item" },
              { $project: { _id: 0, itemId: "$item._id", name: "$item.name", type: "$item.type", count: 1 } },
              { $sort: { count: -1, name: 1 } }
            ]
          });
          pipelines.push({
            label: "drinksEvening",
            pipeline: [
              { $match: match },
              { $group: { _id: "$eveningDrinkItemId", count: { $sum: 1 } } },
              { $match: { _id: { $ne: null } } },
              {
                $lookup: {
                  from: "catalogitems",
                  localField: "_id",
                  foreignField: "_id",
                  as: "item"
                }
              },
              { $unwind: "$item" },
              { $project: { _id: 0, itemId: "$item._id", name: "$item.name", type: "$item.type", count: 1 } },
              { $sort: { count: -1, name: 1 } }
            ]
          });
        }
        if (include !== "drinks" && snacksAvailable) {
          pipelines.push({
            label: "snacksEvening",
            pipeline: [
              { $match: match },
              { $group: { _id: "$eveningSnackItemId", count: { $sum: 1 } } },
              { $match: { _id: { $ne: null } } },
              {
                $lookup: {
                  from: "catalogitems",
                  localField: "_id",
                  foreignField: "_id",
                  as: "item"
                }
              },
              { $unwind: "$item" },
              { $project: { _id: 0, itemId: "$item._id", name: "$item.name", type: "$item.type", count: 1 } },
              { $sort: { count: -1, name: 1 } }
            ]
          });
        }
      }

      const counts = {};
      for (const p of pipelines) counts[p.label] = await Selection.aggregate(p.pipeline);

      const selections = await Selection.find({ dateKey })
        .populate("userId", "name email role")
        .populate("morningDrinkItemId eveningDrinkItemId eveningSnackItemId", "type name")
        .sort({ createdAt: -1 })
        .limit(2000);

      res.json({ dateKey, session, snacksAvailable, counts, selections });
    } catch (e) {
      next(e);
    }
  });

  // Admin: counts over a week range [start,end] inclusive
  router.get("/counts/range", requireAuth, requireApproved, requireRole("admin"), async (req, res, next) => {
    try {
      const start = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.start);
      const end = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.end);

      // Drinks morning
      const aggDrinksMorning = await Selection.aggregate([
        { $match: { dateKey: { $gte: start, $lte: end } } },
        { $group: { _id: "$morningDrinkItemId", count: { $sum: 1 } } },
        { $match: { _id: { $ne: null } } },
        {
          $lookup: {
            from: "catalogitems",
            localField: "_id",
            foreignField: "_id",
            as: "item"
          }
        },
        { $unwind: "$item" },
        { $project: { _id: 0, itemId: "$item._id", name: "$item.name", type: "$item.type", count: 1, session: "morning" } },
        { $sort: { count: -1, name: 1 } }
      ]);

      // Drinks evening
      const aggDrinksEvening = await Selection.aggregate([
        { $match: { dateKey: { $gte: start, $lte: end } } },
        { $group: { _id: "$eveningDrinkItemId", count: { $sum: 1 } } },
        { $match: { _id: { $ne: null } } },
        {
          $lookup: {
            from: "catalogitems",
            localField: "_id",
            foreignField: "_id",
            as: "item"
          }
        },
        { $unwind: "$item" },
        { $project: { _id: 0, itemId: "$item._id", name: "$item.name", type: "$item.type", count: 1, session: "evening" } },
        { $sort: { count: -1, name: 1 } }
      ]);

      // Snacks evening
      const aggSnacksEvening = await Selection.aggregate([
        { $match: { dateKey: { $gte: start, $lte: end } } },
        { $group: { _id: "$eveningSnackItemId", count: { $sum: 1 } } },
        { $match: { _id: { $ne: null } } },
        {
          $lookup: {
            from: "catalogitems",
            localField: "_id",
            foreignField: "_id",
            as: "item"
          }
        },
        { $unwind: "$item" },
        { $project: { _id: 0, itemId: "$item._id", name: "$item.name", type: "$item.type", count: 1, session: "evening" } },
        { $sort: { count: -1, name: 1 } }
      ]);

      res.json({
        start,
        end,
        counts: {
          drinksMorning: aggDrinksMorning,
          drinksEvening: aggDrinksEvening,
          snacksEvening: aggSnacksEvening
        }
      });
    } catch (e) {
      next(e);
    }
  });

  // Admin: cost report for date range (optional item costs)
  router.post("/cost-report", requireAuth, requireApproved, requireRole("admin"), async (req, res, next) => {
    try {
      const body = z
        .object({
          start: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          end: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          costs: z.record(z.string(), z.coerce.number().min(0)).optional()
        })
        .parse(req.body);

      const costs = body.costs || {};

      const [agg] = await Selection.aggregate([
        { $match: { dateKey: { $gte: body.start, $lte: body.end } } },
        {
          $facet: {
            morning: [
              { $group: { _id: "$morningDrinkItemId", count: { $sum: 1 } } },
              { $match: { _id: { $ne: null } } },
              {
                $lookup: {
                  from: "catalogitems",
                  localField: "_id",
                  foreignField: "_id",
                  as: "item"
                }
              },
              { $unwind: "$item" },
              { $project: { itemId: "$item._id", name: "$item.name", type: "$item.type", cost: "$item.cost", count: 1 } }
            ],
            eveningDrink: [
              { $group: { _id: "$eveningDrinkItemId", count: { $sum: 1 } } },
              { $match: { _id: { $ne: null } } },
              {
                $lookup: {
                  from: "catalogitems",
                  localField: "_id",
                  foreignField: "_id",
                  as: "item"
                }
              },
              { $unwind: "$item" },
              { $project: { itemId: "$item._id", name: "$item.name", type: "$item.type", cost: "$item.cost", count: 1 } }
            ],
            eveningSnack: [
              { $group: { _id: "$eveningSnackItemId", count: { $sum: 1 } } },
              { $match: { _id: { $ne: null } } },
              {
                $lookup: {
                  from: "catalogitems",
                  localField: "_id",
                  foreignField: "_id",
                  as: "item"
                }
              },
              { $unwind: "$item" },
              { $project: { itemId: "$item._id", name: "$item.name", type: "$item.type", cost: "$item.cost", count: 1 } }
            ]
          }
        }
      ]);

      const rows = [
        ...(agg?.morning || []).map((r) => ({ ...r, session: "morning" })),
        ...(agg?.eveningDrink || []).map((r) => ({ ...r, session: "evening" })),
        ...(agg?.eveningSnack || []).map((r) => ({ ...r, session: "evening" }))
      ];

      let totalCost = 0;
      let hasAnyCost = false;
      const items = rows.map((r) => {
        const unitCost = costs[String(r.itemId)] ?? r.cost ?? null;
        const itemCost = unitCost != null ? unitCost * r.count : null;
        if (itemCost != null) {
          totalCost += itemCost;
          hasAnyCost = true;
        }
        return {
          ...r,
          unitCost,
          itemCost
        };
      });
      if (!hasAnyCost) totalCost = null;

      res.json({
        start: body.start,
        end: body.end,
        totalCost,
        items
      });
    } catch (e) {
      next(e);
    }
  });

  // Admin: Export selections as CSV
  router.get("/export/csv", requireAuth, requireApproved, requireRole("admin"), async (req, res, next) => {
    try {
      console.log("CSV Export request:", req.query);

      const dateKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/).parse(req.query.dateKey);
      const session = z.enum(["morning", "evening", "all"]).optional().parse(req.query.session);
      const include = req.query.include ? z.enum(["drinks", "snacks", "all"]).parse(req.query.include) : "all";

      // Fetch selections with populated user and item data
      const selections = await Selection.find({ dateKey })
        .populate("userId", "name email role")
        .populate("morningDrinkItemId eveningDrinkItemId eveningSnackItemId", "type name")
        .sort({ "userId.name": 1 })
        .limit(2000);

      console.log(`Found ${selections.length} selections for ${dateKey}`);

      // Prepare CSV data
      const csvData = selections.map(s => ({
        Name: s.userId?.name || "",
        Email: s.userId?.email || "",
        "Morning Drink": s.morningDrinkItemId?.name || "",
        "Evening Drink": s.eveningDrinkItemId?.name || "",
        "Evening Snack": s.eveningSnackItemId?.name || ""
      }));

      // Calculate counts for summary
      const morningCounts = {};
      const eveningDrinkCounts = {};
      const eveningSnackCounts = {};

      selections.forEach(s => {
        if (s.morningDrinkItemId?.name) {
          morningCounts[s.morningDrinkItemId.name] = (morningCounts[s.morningDrinkItemId.name] || 0) + 1;
        }
        if (s.eveningDrinkItemId?.name) {
          eveningDrinkCounts[s.eveningDrinkItemId.name] = (eveningDrinkCounts[s.eveningDrinkItemId.name] || 0) + 1;
        }
        if (s.eveningSnackItemId?.name) {
          eveningSnackCounts[s.eveningSnackItemId.name] = (eveningSnackCounts[s.eveningSnackItemId.name] || 0) + 1;
        }
      });

      // Convert to CSV format
      const headers = ["Name", "Email", "Morning Drink", "Evening Drink", "Evening Snack"];
      const csvRows = [];

      // Add date and day header at the top
      const dateParts = dateKey.split('-');
      const date = new Date(parseInt(dateParts[0]), parseInt(dateParts[1]) - 1, parseInt(dateParts[2]));
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
      const formattedDate = date.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      csvRows.push(`Report Date: ${formattedDate}`);
      csvRows.push(`Day: ${dayName}`);
      csvRows.push(`Session: ${session || 'All'}`);
      csvRows.push(""); // Blank row

      // Add column headers
      csvRows.push(headers.join(","));

      // Add employee selections
      for (const row of csvData) {
        const values = headers.map(header => {
          const value = row[header] || "";
          const escaped = value.replace(/"/g, '""');
          return escaped.includes(',') ? `"${escaped}"` : escaped;
        });
        csvRows.push(values.join(","));
      }

      // Add summary section
      csvRows.push(""); // Blank row
      csvRows.push(""); // Blank row

      // Morning drinks summary
      csvRows.push("SUMMARY - MORNING DRINKS");
      csvRows.push("Item,Count");
      Object.entries(morningCounts)
        .sort((a, b) => b[1] - a[1]) // Sort by count descending
        .forEach(([item, count]) => {
          const escapedItem = item.replace(/"/g, '""');
          const itemStr = escapedItem.includes(',') ? `"${escapedItem}"` : escapedItem;
          csvRows.push(`${itemStr},${count}`);
        });
      if (Object.keys(morningCounts).length === 0) {
        csvRows.push("No selections,0");
      }

      csvRows.push(""); // Blank row

      // Evening drinks summary
      csvRows.push("SUMMARY - EVENING DRINKS");
      csvRows.push("Item,Count");
      Object.entries(eveningDrinkCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([item, count]) => {
          const escapedItem = item.replace(/"/g, '""');
          const itemStr = escapedItem.includes(',') ? `"${escapedItem}"` : escapedItem;
          csvRows.push(`${itemStr},${count}`);
        });
      if (Object.keys(eveningDrinkCounts).length === 0) {
        csvRows.push("No selections,0");
      }

      csvRows.push(""); // Blank row

      // Evening snacks summary
      csvRows.push("SUMMARY - EVENING SNACKS");
      csvRows.push("Item,Count");
      Object.entries(eveningSnackCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([item, count]) => {
          const escapedItem = item.replace(/"/g, '""');
          const itemStr = escapedItem.includes(',') ? `"${escapedItem}"` : escapedItem;
          csvRows.push(`${itemStr},${count}`);
        });
      if (Object.keys(eveningSnackCounts).length === 0) {
        csvRows.push("No selections,0");
      }

      const csv = csvRows.join("\n");

      console.log("Sending CSV with", csv.split("\n").length, "lines");

      // Set headers for file download
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="selections-${dateKey}-${session || 'all'}.csv"`);
      res.status(200).send(csv);
    } catch (e) {
      console.error("CSV Export error:", e);
      next(e);
    }
  });

  return router;
}

