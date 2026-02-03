import bcrypt from "bcryptjs";
import { User } from "../users/user.model.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../../shared/auth/jwt.js";

const ADMIN_SIGNUP_CODE = process.env.ADMIN_SIGNUP_CODE || "admin";

export async function registerWithPassword({ role, name, email, password, securityCode }) {
  if (role === "admin") {
    if (!securityCode || securityCode.trim() !== ADMIN_SIGNUP_CODE) {
      const err = new Error("Invalid admin security code");
      err.statusCode = 400;
      throw err;
    }
  }

  const existing = await User.findOne({ email: email.toLowerCase().trim() });
  if (existing) {
    const err = new Error("Email already in use");
    err.statusCode = 409;
    throw err;
  }
  const passwordHash = await bcrypt.hash(password, 12);
  const approvalStatus = role === "employee" ? "pending" : "approved";
  const user = await User.create({
    role,
    name,
    email: email.toLowerCase().trim(),
    passwordHash,
    approvalStatus,
    ...(approvalStatus === "pending" ? { approvalRequestedAt: new Date() } : {})
  });
  return issueTokensForUser(user);
}

export async function loginWithPassword({ email, password }) {
  const user = await User.findOne({ email: email.toLowerCase().trim() });
  if (!user) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }
  if (user.approvalStatus === "rejected") {
    const err = new Error("Account request rejected");
    err.statusCode = 403;
    throw err;
  }
  if (user.isDisabled) {
    const err = new Error("User disabled");
    err.statusCode = 403;
    throw err;
  }
  if (!user.passwordHash) {
    const err = new Error("This account must sign in with Google");
    err.statusCode = 400;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) {
    const err = new Error("Invalid credentials");
    err.statusCode = 401;
    throw err;
  }
  return issueTokensForUser(user);
}

export async function issueTokensForUser(userDoc) {
  const payload = {
    sub: String(userDoc._id),
    role: userDoc.role
  };
  const accessToken = signAccessToken(payload);
  const refreshToken = signRefreshToken(payload);
  return { accessToken, refreshToken };
}

export async function refreshAccessToken(refreshToken) {
  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    const err = new Error("Invalid/expired refresh token");
    err.statusCode = 401;
    throw err;
  }
  const user = await User.findById(decoded.sub);
  if (!user) {
    const err = new Error("User not found");
    err.statusCode = 401;
    throw err;
  }
  if (user.approvalStatus === "rejected") {
    const err = new Error("Account request rejected");
    err.statusCode = 403;
    throw err;
  }
  if (user.isDisabled) {
    const err = new Error("User disabled");
    err.statusCode = 403;
    throw err;
  }
  return issueTokensForUser(user);
}

