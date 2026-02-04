import { Router } from "express";
import { z } from "zod";
import { loginWithPassword, refreshAccessToken, registerWithPassword } from "./auth.service.js";
import { requireAuth } from "../../shared/auth/middleware.js";

export function buildAuthRouter() {
  const router = Router();

  router.post("/register", async (req, res, next) => {
    try {
      const body = z
        .object({
          role: z.enum(["admin", "employee"]),
          name: z.string().min(1).max(120).optional(),
          email: z.string().email(),
          password: z.string().min(8).max(200),
          securityCode: z.string().trim().optional()
        })
        .parse(req.body);
      const tokens = await registerWithPassword(body);
      res.json(tokens);
    } catch (e) {
      next(e);
    }
  });

  router.post("/login", async (req, res, next) => {
    try {
      const body = z
        .object({
          email: z.string().email(),
          password: z.string().min(1)
        })
        .parse(req.body);
      const tokens = await loginWithPassword(body);
      res.json(tokens);
    } catch (e) {
      next(e);
    }
  });

  router.post("/refresh", async (req, res, next) => {
    try {
      const body = z.object({ refreshToken: z.string().min(1) }).parse(req.body);
      const tokens = await refreshAccessToken(body.refreshToken);
      res.json(tokens);
    } catch (e) {
      next(e);
    }
  });

  router.get("/me", requireAuth, async (req, res) => {
    res.json({ user: req.user });
  });

  return router;
}

