import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import fastifyStatic from "@fastify/static";
import publicRoutes from "./routes/public.js";
import adminRoutes from "./routes/admin.js";
import { pool } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mediaRoot = path.join(__dirname, "..", "media");

const app = Fastify({ logger: true, bodyLimit: 1_000_000 });

await app.register(helmet, {
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

const origin = process.env.FRONTEND_ORIGIN || "http://localhost:5173";
await app.register(cors, {
  origin,
  credentials: true,
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
});

await app.register(cookie, {
  secret: process.env.COOKIE_SECRET || "change-me",
});

await app.register(rateLimit, { max: 300, timeWindow: "1 minute" });

await app.register(multipart, {
  limits: { fileSize: 20 * 1024 * 1024, files: 1 },
});

await app.register(fastifyStatic, {
  root: mediaRoot,
  prefix: "/media/",
});

await app.register(publicRoutes);
await app.register(adminRoutes, { mediaRoot });

const port = Number(process.env.PORT) || 3000;
try {
  await app.listen({ port });
  console.log(`api on http://localhost:${port}`);
} catch (e) {
  app.log.error(e);
  await pool.end();
  process.exit(1);
}
