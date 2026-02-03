import { verifyAccessToken } from "./jwt.js";
import { User } from "../../modules/users/user.model.js";

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7) : null;
    if (!token) return res.status(401).json({ error: "Missing access token" });

    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.sub).select("-passwordHash");
    if (!user) return res.status(401).json({ error: "User not found" });
    if (user.isDisabled) return res.status(403).json({ error: "User disabled" });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid/expired access token" });
  }
}

export function requireApproved(req, res, next) {
  if (!req.user) return res.status(401).json({ error: "Unauthenticated" });
  const status = req.user.approvalStatus;
  if (!status || status === "approved") return next();
  if (status === "rejected") {
    return res.status(403).json({ error: "Account request rejected" });
  }
  return res.status(403).json({ error: "Account pending approval" });
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: "Unauthenticated" });
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: "Forbidden" });
    next();
  };
}

