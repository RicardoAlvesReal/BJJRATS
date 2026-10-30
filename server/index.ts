import 'dotenv/config';
import express from "express";
import { createServer } from "http";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";
import cors from "cors";
import type { CorsOptions } from "cors";
import helmet from "helmet";
import cookieParser from "cookie-parser";

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
import professorReqRouter  from "./routes/professor-requests.js";
import bookedSlotsRouter  from "./routes/booked-slots.js";
import classesRouter       from "./routes/classes.js";
import promotionsRouter    from "./routes/promotions.js";
import achievementsRouter  from "./routes/achievements.js";
import competitionsRouter  from "./routes/competitions.js";
import uploadRouter        from "./routes/upload.js";
import adminRouter         from "./routes/admin.js";
import academyRouter       from "./routes/academy.js";
import subscriptionsRouter from "./routes/subscriptions.js";
import publicRouter        from "./routes/public.js";
import settingsRouter      from "./routes/settings.js";
import announcementsRouter from "./routes/announcements.js";
import whatsappRouter      from "./routes/whatsapp.js";
import supportRouter       from "./routes/support.js";
import passkeyRouter       from "./routes/passkeys.js";
import trainingVideosRouter from "./routes/trainingVideos.js";
import { startFinancialAutomationJobs } from "./services/financialAutomation.js";
import { ensureDatabaseSchema } from "./db/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_DIR = process.env.UPLOADS_DIR || path.resolve(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

function parseCorsOrigins(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map(o => o.trim().replace(/\/+$/, ""))
    .filter(Boolean);
}

const explicitOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);
const defaultOrigins = [
  "http://localhost:5173",
  "http://localhost:5174",
  "http://localhost:3000",
  "http://localhost:3001",
];

const allowedOrigins = Array.from(new Set([...defaultOrigins, ...explicitOrigins]));

const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Permite requisições sem origin (apps mobile Capacitor, Postman, curl, same-origin)
    if (!origin) return callback(null, true);
    const normalized = origin.replace(/\/+$/, "");
    if (
      allowedOrigins.includes(normalized) ||
      /^https:\/\/.*\.fly\.dev$/.test(normalized) ||
      /^https:\/\/.*\.bjjrats\.com$/.test(normalized) ||
      /^http:\/\/localhost:\d+$/.test(normalized) ||
      normalized === "capacitor://localhost" ||
      normalized === "ionic://localhost"
    ) {
      return callback(null, true);
    }
    callback(new Error(`Origem não permitida pelo CORS: ${origin}`));
  },
  credentials: true,
};

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Healthcheck endpoint imediato (para Fly.io / load balancers)
  app.get("/health", (_req, res) => res.status(200).send("OK"));

  app.use(helmet({
    // CSP desativado para não quebrar o SPA (Vite injeta scripts inline)
    contentSecurityPolicy: false,
  }));
  app.use(cors(corsOptions));
  app.use(cookieParser());
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
  app.use("/api/professor-requests", professorReqRouter);
  app.use("/api/booked-slots",     bookedSlotsRouter);
  app.use("/api/classes",          classesRouter);
  app.use("/api/promotions",       promotionsRouter);
  app.use("/api/achievements",     achievementsRouter);
  app.use("/api/competitions",     competitionsRouter);
  app.use("/api/upload",           uploadRouter);
  app.use("/api/admin",            adminRouter);
  app.use("/api/academy",          academyRouter);
  app.use("/api/subscriptions",    subscriptionsRouter);
  app.use("/api/public",           publicRouter);
  app.use("/api/settings",         settingsRouter);
  app.use("/api/announcements",    announcementsRouter);
  app.use("/api/whatsapp",         whatsappRouter);
  app.use("/api/support",          supportRouter);
  app.use("/api/passkeys",         passkeyRouter);
  app.use("/api/training-videos",  trainingVideosRouter);

  // SPA static files — only in production (dev uses Vite dev server)
  if (process.env.NODE_ENV === "production") {
    const staticPath = path.resolve(__dirname, "public");
    app.use(express.static(staticPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(staticPath, "index.html"));
    });
  }

  const port = Number(process.env.PORT) || 3000;

  // Garante binding explícito em 0.0.0.0 (exigência de containers Docker / Fly.io)
  server.listen(port, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${port}/`);
    startFinancialAutomationJobs();
  });

  // Executa migrações essenciais em background sem atrasar a abertura da porta 3000
  ensureDatabaseSchema().catch((err) => {
    console.error('[db] Falha na verificação do schema essencial:', err);
  });
}

startServer().catch(console.error);

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
});
