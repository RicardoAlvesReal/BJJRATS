import 'dotenv/config';
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cors from "cors";

import authRouter          from "./routes/auth.js";
import usersRouter         from "./routes/users.js";
import trainingsRouter     from "./routes/trainings.js";
import extraRouter         from "./routes/extra-trainings.js";
import goalsRouter         from "./routes/goals.js";
import postsRouter         from "./routes/posts.js";
import eventsRouter        from "./routes/events.js";
import challengesRouter    from "./routes/challenges.js";
import notificationsRouter from "./routes/notifications.js";
import paymentsRouter      from "./routes/payments.js";
import enrollmentsRouter   from "./routes/enrollments.js";
import academyReqRouter    from "./routes/academy-requests.js";
import classesRouter       from "./routes/classes.js";
import promotionsRouter    from "./routes/promotions.js";
import achievementsRouter  from "./routes/achievements.js";
import uploadRouter        from "./routes/upload.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.resolve(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.use(cors({ origin: process.env.CORS_ORIGIN || "*" }));
  app.use(express.json({ limit: "2mb" }));
  app.use("/uploads", express.static(UPLOADS_DIR));

  // API routes
  app.use("/api/auth",             authRouter);
  app.use("/api/users",            usersRouter);
  app.use("/api/trainings",        trainingsRouter);
  app.use("/api/extra-trainings",  extraRouter);
  app.use("/api/goals",            goalsRouter);
  app.use("/api/posts",            postsRouter);
  app.use("/api/events",           eventsRouter);
  app.use("/api/challenges",       challengesRouter);
  app.use("/api/notifications",    notificationsRouter);
  app.use("/api/payments",         paymentsRouter);
  app.use("/api/enrollments",      enrollmentsRouter);
  app.use("/api/academy-requests", academyReqRouter);
  app.use("/api/classes",          classesRouter);
  app.use("/api/promotions",       promotionsRouter);
  app.use("/api/achievements",     achievementsRouter);
  app.use("/api/upload",           uploadRouter);

  // SPA static files
  const staticPath =
    process.env.NODE_ENV === "production"
      ? path.resolve(__dirname, "public")
      : path.resolve(__dirname, "..", "dist", "public");

  app.use(express.static(staticPath));

  // Handle client-side routing - serve index.html for all routes
  app.get("*", (_req, res) => {
    res.sendFile(path.join(staticPath, "index.html"));
  });

  const port = process.env.PORT || 3000;

  server.listen(port, () => {
    console.log(`Server running on http://localhost:${port}/`);
  });
}

startServer().catch(console.error);
