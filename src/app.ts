import fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import multipart from "@fastify/multipart";
import fastifyRateLimit from "@fastify/rate-limit";
import fastifyStatic from "@fastify/static";
import pinoPretty from "pino-pretty";
import path from "path";
import { createRequire } from "module";
import globalErrorHandler from "./app/middlewares/globalErrorHandler.js";
import notFound from "./app/middlewares/notFound.js";
import registerRoutes from "./app/routes/index.js";
import { checkGroqConnection } from "./app/shared/grokConnection.js";


const require = createRequire(import.meta.url);

const isDev = process.env.NODE_ENV === "development";

const buildApp = async () => {
  const app = fastify({
    logger: isDev
      ? {
        level: "debug",
        stream: pinoPretty({
          colorize: true,
          translateTime: "SYS:standard",
          ignore: "pid,hostname",
        }),
      }
      : { level: "info" },
    trustProxy: true,
  });

  // ── Security ───────────────────────────────────────────────
  await app.register(helmet, {
    contentSecurityPolicy: !isDev,
  });

  await app.register(cors, {
    origin: (origin, cb) => {
      const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(",").map((o) => o.trim()) ?? [];

      // Allow non-browser requests (curl, server-to-server, health checks) with no Origin header
      if (!origin) {
        return cb(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return cb(null, true);
      }

      cb(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  });

  await app.register(fastifyRateLimit, {
    global: true,
    max: 2000,
    timeWindow: 60 * 1000,
    errorResponseBuilder: () => ({
      success: false,
      message: "Too many requests, please try again later.",
    }),
  });

  // ── Cookies ────────────────────────────────────────────────
  await app.register(cookie, {
    secret: process.env.COOKIE_SECRET,
  });

  // ── File uploads ───────────────────────────────────────────
  await app.register(multipart, {
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
      files: 5,
    },
  });

  // ── Static files (admit card PDFs, etc.) ──────────────────
  await app.register(fastifyStatic, {
    root: path.join(process.cwd(), "public"),
    prefix: "/",
  });

  app.addHook("onReady", async () => {
    app.log.info("✅ Server is ready and accepting connections");

    // Fire-and-forget Groq ping at boot so a bad/missing key shows up in
    // logs immediately instead of surfacing as a confusing 500 on first upload.
    const groqStatus = await checkGroqConnection(true);
    if (groqStatus.ok) {
      app.log.info("✅ Groq AI connection verified");
    } else {
      app.log.warn(`⚠️  Groq AI connection failed: ${groqStatus.error}`);
    }
  });

  app.addHook("onClose", (_instance, done) => {
    app.log.info("🛑 Server is shutting down  ...");
    done();
  });

  // ── Health check ───────────────────────────────────────────
  app.get("/health", async (_request, reply) => {
    const groqStatus = await checkGroqConnection();

    reply.send({
      success: true,
      message: "Server is healthy 🚀",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV,
      ai: {
        provider: "groq",
        connected: groqStatus.ok,
        error: groqStatus.error,
      },
    });
  });

  // ── Routes ─────────────────────────────────────────────────
  await app.register(async (instance) => {
    await registerRoutes(instance);
  }, { prefix: "/api/v1" });

  // ── Error handlers ─────────────────────────────────────────
  globalErrorHandler(app);
  app.setNotFoundHandler(notFound);

  return app;
};

export default buildApp;