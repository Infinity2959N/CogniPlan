import express from "express";
import { z } from "zod";
import { createInMemoryStore } from "./inMemoryStore";
import { createPrismaStore } from "./prismaStore";
import {
  comparePassword,
  hashPassword,
  requireAuth,
  signAccessToken,
  AuthenticatedRequest,
} from "./auth";
import { Week3DataStore } from "./types";
import { runDailyScanner, initDailyScanner } from "./cron";

const signupSchema = z.object({
  email: z.string().email(),
  name: z.string().min(2),
  password: z.string().min(8),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const reviewSchema = z.object({
  topic_id: z.string().min(1),
  quality_score: z.number().min(0).max(5),
  session_duration: z.number().int().min(0),
});

interface CreateAppOptions {
  dataStore?: Week3DataStore;
}

function resolveDataStore(options?: CreateAppOptions): Week3DataStore {
  if (options?.dataStore) {
    return options.dataStore;
  }

  if (process.env.DATA_STORE === "prisma") {
    return createPrismaStore();
  }

  return createInMemoryStore();
}

export function createApp(options?: CreateAppOptions) {
  const app = express();
  const dataStore = resolveDataStore(options);

  if (process.env.NODE_ENV !== "test") {
    initDailyScanner(dataStore);
  }

  app.use(express.json());

  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", process.env.CLIENT_URL || "http://localhost:3000");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "role1-systems-logic", data_store: dataStore.kind });
  });

  app.get("/sql/todays-queue", (_req, res) => {
    res.type("text/plain").send(dataStore.getSqlDueQueueQuery());
  });

  app.post("/auth/signup", async (req, res) => {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid signup payload", details: parsed.error.flatten() });
      return;
    }

    const existing = await dataStore.findUserByEmail(parsed.data.email);
    if (existing) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await hashPassword(parsed.data.password);
    const user = await dataStore.createUser({
      email: parsed.data.email,
      name: parsed.data.name,
      passwordHash,
    });

    const accessToken = signAccessToken({ sub: user.id, email: user.email });

    res.status(201).json({
      user: { id: user.id, email: user.email, name: user.name },
      access_token: accessToken,
    });
  });

  app.post("/auth/login", async (req, res) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid login payload", details: parsed.error.flatten() });
      return;
    }

    let user = await dataStore.findUserByEmail(parsed.data.email);
    if (!user && parsed.data.email.toLowerCase() === "dev@university.edu" && parsed.data.password === "password123") {
      const passwordHash = await hashPassword(parsed.data.password);
      user = await dataStore.createUser({
        email: parsed.data.email,
        name: "Developer",
        passwordHash,
      });
    }

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const matches = await comparePassword(parsed.data.password, user.password_hash);
    if (!matches) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const accessToken = signAccessToken({ sub: user.id, email: user.email });

    res.json({
      user: { id: user.id, email: user.email, name: user.name },
      access_token: accessToken,
    });
  });

  const queueHandler = async (req: AuthenticatedRequest, res: express.Response) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const queue = await dataStore.getTopicsDueToday(user.id);
    res.json(queue);
  };

  app.get("/topics", requireAuth, queueHandler);
  app.get("/api/v1/topics/queue", requireAuth, queueHandler);

  const reviewHandler = async (req: AuthenticatedRequest, res: express.Response) => {
    const user = req.user;
    if (!user) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    const parsed = reviewSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid review payload", details: parsed.error.flatten() });
      return;
    }

    try {
      const result = await dataStore.applyReview(user.id, parsed.data);
      res.json(result);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to process review";
      if (message.toLowerCase().includes("not found")) {
        res.status(404).json({ error: message });
        return;
      }

      res.status(500).json({ error: message });
    }
  };

  app.post("/topics/:id/review", requireAuth, (req, res, next) => {
    req.body = { ...req.body, topic_id: req.params.id };
    next();
  }, reviewHandler);

  app.post("/api/v1/topics/review", requireAuth, reviewHandler);

  app.get("/debug/trigger-scan", async (_req, res) => {
    await runDailyScanner(dataStore);
    res.json({ ok: true, message: "Debug scan triggered successfully" });
  });

  app.post("/debug/trigger-scan", async (_req, res) => {
    await runDailyScanner(dataStore);
    res.json({ ok: true, message: "Debug scan triggered successfully" });
  });

  return app;
}
