import { Router } from "express";
import { z } from "zod";
import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import jwt from "jsonwebtoken";

import { User } from "../users/user.model.js";
import { issueTokensForUser, loginWithPassword, refreshAccessToken, registerWithPassword } from "./auth.service.js";
import { requireAuth } from "../../shared/auth/middleware.js";

const ADMIN_SIGNUP_CODE = process.env.ADMIN_SIGNUP_CODE || "admin";

function signOAuthState(payload) {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret) return null;
  return jwt.sign(payload, secret, { expiresIn: "10m" });
}

function verifyOAuthState(state) {
  const secret = process.env.JWT_ACCESS_SECRET;
  if (!secret || !state) return null;
  try {
    return jwt.verify(state, secret);
  } catch {
    return null;
  }
}

function initPassportGoogle() {
  const clientID = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const callbackURL = process.env.GOOGLE_CALLBACK_URL;
  if (!clientID || !clientSecret || !callbackURL) return;

  passport.use(
    new GoogleStrategy(
      {
        clientID,
        clientSecret,
        callbackURL,
        passReqToCallback: true
      },
      async (req, _accessToken, _refreshToken, profile, done) => {
        try {
          const googleId = profile.id;
          const email = (profile.emails?.[0]?.value || "").toLowerCase().trim();
          const name = profile.displayName;
          if (!email) return done(new Error("Google account has no email"));

          let desiredRole = "employee";
          const state = verifyOAuthState(req?.query?.state);
          if (state?.role === "admin") desiredRole = "admin";

          let user = await User.findOne({ $or: [{ "google.id": googleId }, { email }] });
          if (!user) {
            // Default new Google accounts to employee. Admins can be created via email/password or promoted by an admin later.
            const approvalStatus = desiredRole === "employee" ? "pending" : "approved";
            user = await User.create({
              role: desiredRole,
              name,
              email,
              google: { id: googleId, email },
              approvalStatus,
              ...(approvalStatus === "pending" ? { approvalRequestedAt: new Date() } : {})
            });
          } else {
            user.google = { id: googleId, email };
            if (!user.name && name) user.name = name;
            await user.save();
          }
          if (user.approvalStatus === "rejected") return done(new Error("Account request rejected"));
          if (user.isDisabled) return done(new Error("User disabled"));

          const tokens = await issueTokensForUser(user);
          return done(null, { user, tokens });
        } catch (e) {
          return done(e);
        }
      }
    )
  );
}

export function buildAuthRouter() {
  initPassportGoogle();

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

  // Google OAuth
  router.get("/google", (req, res, next) => {
    const role = req.query.role === "admin" ? "admin" : "employee";
    if (role === "admin") {
      const securityCode = String(req.query.securityCode || "").trim();
      if (!securityCode || securityCode !== ADMIN_SIGNUP_CODE) {
        return res.status(400).json({ error: "Invalid admin security code" });
      }
    }
    const state = signOAuthState({ role });
    return passport.authenticate("google", {
      scope: ["profile", "email"],
      session: false,
      ...(state ? { state } : {})
    })(req, res, next);
  });

  router.get("/google/callback", (req, res, next) => {
    passport.authenticate("google", { session: false }, async (err, payload) => {
      const redirectBase = process.env.CLIENT_ORIGIN || "http://localhost:5173";
      if (err || !payload) {
        const reason = err?.message === "Account request rejected" ? "account_rejected" : "oauth_failed";
        const failUrl = new URL("/login", redirectBase);
        failUrl.searchParams.set("error", reason);
        return res.redirect(failUrl.toString());
      }
      const { tokens } = payload;
      const url = new URL("/oauth/callback", redirectBase);
      url.searchParams.set("accessToken", tokens.accessToken);
      url.searchParams.set("refreshToken", tokens.refreshToken);
      return res.redirect(url.toString());
    })(req, res, next);
  });

  router.get("/google/failure", (req, res) => {
    const redirectBase = process.env.CLIENT_ORIGIN || "http://localhost:5173";
    const reason = req.query.reason ? String(req.query.reason) : "oauth_failed";
    const failUrl = new URL("/login", redirectBase);
    failUrl.searchParams.set("error", reason);
    res.redirect(failUrl.toString());
  });

  return router;
}

