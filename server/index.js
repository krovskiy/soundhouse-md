import "dotenv/config";
import path from "node:path";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import cors from "@fastify/cors";
import fastifyStatic from "@fastify/static";
import { pool } from "./db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = Fastify({ logger: true });

await app.register(cors, { origin: true });

await app.register(fastifyStatic, {
  root: path.join(__dirname, "..", "media"),
  prefix: "/media/",
});

app.get("/api/members", async () => {
  const { rows } = await pool.query("SELECT id, name FROM members ORDER BY id");
  return rows;
});

app.get("/api/members/:id/tracks", async (req, reply) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return reply.code(400).send({ error: "bad id" });
  }
  const { rows } = await pool.query(
    `SELECT id, position, title, file_path, cover_path
     FROM tracks
     WHERE member_id = $1
     ORDER BY position`,
    [id],
  );
  return rows;
});

const port = Number(process.env.PORT) || 3000;
app.listen({ port }).then(() => {
  console.log(`api on http://localhost:${port}`);
});
