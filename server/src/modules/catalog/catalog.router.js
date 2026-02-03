import { Router } from "express";
import { z } from "zod";
import { CatalogItem } from "./catalog.model.js";
import { requireAuth, requireApproved, requireRole } from "../../shared/auth/middleware.js";

export function buildCatalogRouter() {
  const router = Router();

  // Public (authenticated) catalog for UI drop-downs
  router.get("/", requireAuth, requireApproved, async (req, res, next) => {
    try {
      const type = req.query.type ? z.enum(["drink", "snack"]).parse(req.query.type) : undefined;
      const include = req.query.include === "all";
      const isAdmin = req.user?.role === "admin";
      const q = {
        ...(type ? { type } : {}),
        ...(include && isAdmin ? {} : { isActive: true })
      };
      const items = await CatalogItem.find(q).sort({ type: 1, name: 1 });
      res.json({ items });
    } catch (e) {
      next(e);
    }
  });

  // Admin: manage catalog
  router.post("/", requireAuth, requireApproved, requireRole("admin"), async (req, res, next) => {
    try {
      const body = z
        .object({
          type: z.enum(["drink", "snack"]),
          name: z.string().min(1).max(60),
          cost: z.coerce.number().min(0).optional()
        })
        .parse(req.body);

      const item = await CatalogItem.create({
        type: body.type,
        name: body.name.trim(),
        ...(body.cost != null ? { cost: body.cost } : {})
      });
      res.status(201).json({ item });
    } catch (e) {
      next(e);
    }
  });

  router.patch("/:id", requireAuth, requireApproved, requireRole("admin"), async (req, res, next) => {
    try {
      const body = z
        .object({
          name: z.string().min(1).max(60).optional(),
          isActive: z.boolean().optional(),
          cost: z.coerce.number().min(0).nullable().optional()
        })
        .parse(req.body);
      const update = {};
      if (body.name) update.name = body.name.trim();
      if (body.isActive !== undefined) update.isActive = body.isActive;
      if (body.cost !== undefined) update.cost = body.cost;
      const item = await CatalogItem.findByIdAndUpdate(req.params.id, update, { new: true });
      if (!item) return res.status(404).json({ error: "Catalog item not found" });
      res.json({ item });
    } catch (e) {
      next(e);
    }
  });

  router.delete("/:id", requireAuth, requireApproved, requireRole("admin"), async (req, res, next) => {
    try {
      const item = await CatalogItem.findById(req.params.id);
      if (!item) return res.status(404).json({ error: "Catalog item not found" });
      await CatalogItem.deleteOne({ _id: item._id });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  return router;
}

