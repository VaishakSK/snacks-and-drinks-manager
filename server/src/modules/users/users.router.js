import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";

import { User } from "./user.model.js";
import { requireAuth, requireApproved, requireRole } from "../../shared/auth/middleware.js";

export function buildUsersRouter() {
  const router = Router();

  // Admin: list users
  router.get("/", requireAuth, requireApproved, requireRole("admin"), async (_req, res, next) => {
    try {
      const users = await User.find().select("-passwordHash").sort({ createdAt: -1 });
      res.json({ users });
    } catch (e) {
      next(e);
    }
  });

  // Admin: create employee/admin
  router.post("/", requireAuth, requireApproved, requireRole("admin"), async (req, res, next) => {
    try {
      const body = z
        .object({
          role: z.enum(["admin", "employee"]).default("employee"),
          name: z.string().min(1).max(120).optional(),
          email: z.string().email(),
          password: z.string().min(8).max(200).optional()
        })
        .parse(req.body);

      const email = body.email.toLowerCase().trim();
      const existing = await User.findOne({ email });
      if (existing) return res.status(409).json({ error: "Email already in use" });

      const passwordHash = body.password ? await bcrypt.hash(body.password, 12) : undefined;
      const now = new Date();
      const user = await User.create({
        role: body.role,
        name: body.name,
        email,
        passwordHash,
        approvalStatus: "approved",
        approvalRequestedAt: now,
        approvalDecidedAt: now,
        approvalDecidedBy: req.user._id
      });
      res.status(201).json({ user: await User.findById(user._id).select("-passwordHash") });
    } catch (e) {
      next(e);
    }
  });

  // Admin: update user (name/role/disabled/reset password)
  router.patch("/:id", requireAuth, requireApproved, requireRole("admin"), async (req, res, next) => {
    try {
      const body = z
        .object({
          role: z.enum(["admin", "employee"]).optional(),
          name: z.string().min(1).max(120).nullable().optional(),
          isDisabled: z.boolean().optional(),
          password: z.string().min(8).max(200).optional()
        })
        .parse(req.body);

      const update = {};
      if (body.role) update.role = body.role;
      if (body.name !== undefined) update.name = body.name ?? undefined;
      if (body.isDisabled !== undefined) update.isDisabled = body.isDisabled;
      if (body.password) update.passwordHash = await bcrypt.hash(body.password, 12);

      const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).select(
        "-passwordHash"
      );
      if (!user) return res.status(404).json({ error: "User not found" });
      res.json({ user });
    } catch (e) {
      next(e);
    }
  });

  // Admin: delete employee
  router.delete("/:id", requireAuth, requireApproved, requireRole("admin"), async (req, res, next) => {
    try {
      if (String(req.user._id) === String(req.params.id)) {
        return res.status(400).json({ error: "Cannot delete your own account" });
      }

      const user = await User.findById(req.params.id);
      if (!user) return res.status(404).json({ error: "User not found" });
      if (user.role === "admin") return res.status(400).json({ error: "Cannot delete admin account" });

      await User.deleteOne({ _id: user._id });
      res.json({ ok: true });
    } catch (e) {
      next(e);
    }
  });

  return router;
}

