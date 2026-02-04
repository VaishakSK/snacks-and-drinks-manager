import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import mongoose from "mongoose";

import { buildAuthRouter } from "./modules/auth/auth.router.js";
import { buildUsersRouter } from "./modules/users/users.router.js";
import { buildCatalogRouter } from "./modules/catalog/catalog.router.js";
import { ensureDefaultCatalog } from "./modules/catalog/catalog.seed.js";
import { buildSelectionsRouter } from "./modules/selections/selections.router.js";
import { buildAdminRouter } from "./modules/admin/admin.router.js";
import { buildWfhRouter } from "./modules/wfh/wfh.router.js";
import { notFound, errorHandler } from "./shared/http/errors.js";

const app = express();

app.set("trust proxy", 1);

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN?.split(",").map((s) => s.trim()) ?? true,
    credentials: true
  })
);
app.use(helmet());
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === "production" ? "combined" : "dev"));
app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 500,
    standardHeaders: "draft-7",
    legacyHeaders: false
  })
);

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

app.use("/api/auth", buildAuthRouter());
app.use("/api/users", buildUsersRouter());
app.use("/api/catalog", buildCatalogRouter());
app.use("/api/selections", buildSelectionsRouter());
app.use("/api/wfh", buildWfhRouter());
app.use("/api/admin", buildAdminRouter());

app.use(notFound);
app.use(errorHandler);

async function main() {
  const mongoUri = process.env.MONGO_URI;
  if (!mongoUri) throw new Error("Missing MONGO_URI");
  await mongoose.connect(mongoUri);

  await ensureDefaultCatalog();

  const port = Number(process.env.PORT || 4052);
  app.listen(port, () => {
    console.log(`API listening on http://localhost:${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

