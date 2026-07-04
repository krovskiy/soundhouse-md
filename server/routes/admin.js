import path from "node:path";
import crypto from "node:crypto";
import fs from "node:fs/promises";
import { pipeline } from "node:stream/promises";
import { createWriteStream } from "node:fs";
import { pool } from "../db.js";
import {
  login,
  logout,
  requireAuth,
  setSessionCookie,
  clearSessionCookie,
  COOKIE,
} from "../auth.js";

const AUDIO_EXT = new Set([".mp3", ".wav", ".ogg", ".m4a", ".flac"]);
const IMG_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);

function str(v, max = 500) {
  if (typeof v !== "string") return "";
  return v.trim().slice(0, max);
}

function intOr(v, fallback) {
  const n = Number(v);
  return Number.isInteger(n) ? n : fallback;
}

function bool(v) {
  return v === true || v === "true" || v === 1 || v === "1";
}

async function saveUpload(part, mediaRoot) {
  const ext = path.extname(part.filename || "").toLowerCase();
  const isAudio = AUDIO_EXT.has(ext);
  const isImg = IMG_EXT.has(ext);
  if (!isAudio && !isImg) throw new Error("unsupported file type");

  const sub = isAudio ? "audio" : "img";

  const name = crypto.randomBytes(16).toString("hex") + ext;
  const dest = path.join(mediaRoot, sub, name);
  await pipeline(part.file, createWriteStream(dest));
  if (part.file.truncated) throw new Error("file too large");
  return `/media/${sub}/${name}`;
}

export default async function adminRoutes(app, opts) {
  const mediaRoot = opts.mediaRoot;

  app.post(
    "/api/admin/login",
    {
      config: { rateLimit: { max: 10, timeWindow: "5 minutes" } },
    },
    async (req, reply) => {
      const user = str(req.body?.username, 100);
      const pass = str(req.body?.password, 200);
      if (!user || !pass) return reply.code(400).send({ error: "missing" });
      const token = await login(user, pass);
      if (!token) return reply.code(401).send({ error: "invalid" });
      setSessionCookie(reply, token);
      return { ok: true };
    },
  );

  app.post("/api/admin/logout", async (req, reply) => {
    await logout(req.cookies?.[COOKIE]);
    clearSessionCookie(reply);
    return { ok: true };
  });

  app.register(async (guarded) => {
    guarded.addHook("preHandler", requireAuth);

    guarded.get("/api/admin/me", async () => ({ ok: true }));

    guarded.post("/api/admin/upload", async (req, reply) => {
      const part = await req.file();
      if (!part) return reply.code(400).send({ error: "no file" });
      try {
        const url = await saveUpload(part, mediaRoot);
        return { path: url };
      } catch (e) {
        return reply.code(400).send({ error: e.message });
      }
    });

    guarded.get("/api/admin/members", async () => {
      const { rows } = await pool.query(
        "select id, name, img_path, sort from members order by sort, id",
      );
      return rows;
    });
    guarded.post("/api/admin/members", async (req) => {
      const { rows } = await pool.query(
        "insert into members (name, img_path, sort) values ($1,$2,$3) returning *",
        [
          str(req.body?.name, 200),
          str(req.body?.img_path),
          intOr(req.body?.sort, 0),
        ],
      );
      return rows[0];
    });
    guarded.put("/api/admin/members/:id", async (req, reply) => {
      const id = intOr(req.params.id);
      if (id == null) return reply.code(400).send({ error: "bad id" });
      const { rows } = await pool.query(
        "update members set name=$1, img_path=$2, sort=$3 where id=$4 returning *",
        [
          str(req.body?.name, 200),
          str(req.body?.img_path),
          intOr(req.body?.sort, 0),
          id,
        ],
      );
      if (!rows[0]) return reply.code(404).send({ error: "not found" });
      return rows[0];
    });
    guarded.delete("/api/admin/members/:id", async (req, reply) => {
      const id = intOr(req.params.id);
      if (id == null) return reply.code(400).send({ error: "bad id" });
      await pool.query("delete from members where id=$1", [id]);
      return { ok: true };
    });

    guarded.get("/api/admin/members/:id/tracks", async (req, reply) => {
      const id = intOr(req.params.id);
      if (id == null) return reply.code(400).send({ error: "bad id" });
      const { rows } = await pool.query(
        "select * from tracks where member_id=$1 order by position",
        [id],
      );
      return rows;
    });
    guarded.post("/api/admin/members/:id/tracks", async (req, reply) => {
      const mid = intOr(req.params.id);
      if (mid == null) return reply.code(400).send({ error: "bad id" });
      const file = str(req.body?.file_path);
      if (!file) return reply.code(400).send({ error: "file_path required" });
      const { rows } = await pool.query(
        `insert into tracks (member_id, position, title, file_path, cover_path)
         values ($1,$2,$3,$4,$5) returning *`,
        [
          mid,
          intOr(req.body?.position, 1),
          str(req.body?.title, 300),
          file,
          str(req.body?.cover_path) || null,
        ],
      );
      return rows[0];
    });
    guarded.put("/api/admin/tracks/:id", async (req, reply) => {
      const id = intOr(req.params.id);
      if (id == null) return reply.code(400).send({ error: "bad id" });
      const { rows } = await pool.query(
        `update tracks set position=$1, title=$2, file_path=$3, cover_path=$4
         where id=$5 returning *`,
        [
          intOr(req.body?.position, 1),
          str(req.body?.title, 300),
          str(req.body?.file_path),
          str(req.body?.cover_path) || null,
          id,
        ],
      );
      if (!rows[0]) return reply.code(404).send({ error: "not found" });
      return rows[0];
    });
    guarded.delete("/api/admin/tracks/:id", async (req, reply) => {
      const id = intOr(req.params.id);
      if (id == null) return reply.code(400).send({ error: "bad id" });
      await pool.query("delete from tracks where id=$1", [id]);
      return { ok: true };
    });

    guarded.get("/api/admin/services", async () => {
      const { rows } = await pool.query(
        "select * from services order by sort, id",
      );
      return rows;
    });
    guarded.post("/api/admin/services", async (req) => {
      const { rows } = await pool.query(
        "insert into services (title, description, price, sort) values ($1,$2,$3,$4) returning *",
        [
          str(req.body?.title, 200),
          str(req.body?.description, 2000),
          str(req.body?.price, 60),
          intOr(req.body?.sort, 0),
        ],
      );
      return rows[0];
    });
    guarded.put("/api/admin/services/:id", async (req, reply) => {
      const id = intOr(req.params.id);
      if (id == null) return reply.code(400).send({ error: "bad id" });
      const { rows } = await pool.query(
        "update services set title=$1, description=$2, price=$3, sort=$4 where id=$5 returning *",
        [
          str(req.body?.title, 200),
          str(req.body?.description, 2000),
          str(req.body?.price, 60),
          intOr(req.body?.sort, 0),
          id,
        ],
      );
      if (!rows[0]) return reply.code(404).send({ error: "not found" });
      return rows[0];
    });
    guarded.delete("/api/admin/services/:id", async (req, reply) => {
      const id = intOr(req.params.id);
      if (id == null) return reply.code(400).send({ error: "bad id" });
      await pool.query("delete from services where id=$1", [id]);
      return { ok: true };
    });

    guarded.get("/api/admin/merch", async () => {
      const { rows } = await pool.query(
        "select * from merch order by sort, id",
      );
      return rows;
    });
    guarded.post("/api/admin/merch", async (req) => {
      const { rows } = await pool.query(
        "insert into merch (name, price, sizes, img_path, sort) values ($1,$2,$3,$4,$5) returning *",
        [
          str(req.body?.name, 200),
          str(req.body?.price, 60),
          str(req.body?.sizes, 100),
          str(req.body?.img_path),
          intOr(req.body?.sort, 0),
        ],
      );
      return rows[0];
    });
    guarded.put("/api/admin/merch/:id", async (req, reply) => {
      const id = intOr(req.params.id);
      if (id == null) return reply.code(400).send({ error: "bad id" });
      const { rows } = await pool.query(
        "update merch set name=$1, price=$2, sizes=$3, img_path=$4, sort=$5 where id=$6 returning *",
        [
          str(req.body?.name, 200),
          str(req.body?.price, 60),
          str(req.body?.sizes, 100),
          str(req.body?.img_path),
          intOr(req.body?.sort, 0),
          id,
        ],
      );
      if (!rows[0]) return reply.code(404).send({ error: "not found" });
      return rows[0];
    });
    guarded.delete("/api/admin/merch/:id", async (req, reply) => {
      const id = intOr(req.params.id);
      if (id == null) return reply.code(400).send({ error: "bad id" });
      await pool.query("delete from merch where id=$1", [id]);
      return { ok: true };
    });

    guarded.get("/api/admin/banners", async () => {
      const { rows } = await pool.query(
        "select * from banners order by sort, id",
      );
      return rows;
    });
    guarded.post("/api/admin/banners", async (req) => {
      const { rows } = await pool.query(
        "insert into banners (text, sort, active) values ($1,$2,$3) returning *",
        [
          str(req.body?.text, 300),
          intOr(req.body?.sort, 0),
          bool(req.body?.active),
        ],
      );
      return rows[0];
    });
    guarded.put("/api/admin/banners/:id", async (req, reply) => {
      const id = intOr(req.params.id);
      if (id == null) return reply.code(400).send({ error: "bad id" });
      const { rows } = await pool.query(
        "update banners set text=$1, sort=$2, active=$3 where id=$4 returning *",
        [
          str(req.body?.text, 300),
          intOr(req.body?.sort, 0),
          bool(req.body?.active),
          id,
        ],
      );
      if (!rows[0]) return reply.code(404).send({ error: "not found" });
      return rows[0];
    });

    guarded.get("/api/admin/showcase", async () => {
      const { rows } = await pool.query(
        "select * from showcase order by sort, id",
      );
      return rows;
    });
    guarded.post("/api/admin/showcase", async (req) => {
      const { rows } = await pool.query(
        "insert into showcase (img_path, caption, sort) values ($1,$2,$3) returning *",
        [
          str(req.body?.img_path),
          str(req.body?.caption, 300),
          intOr(req.body?.sort, 0),
        ],
      );
      return rows[0];
    });
    guarded.put("/api/admin/showcase/:id", async (req, reply) => {
      const id = intOr(req.params.id);
      if (id == null) return reply.code(400).send({ error: "bad id" });
      const { rows } = await pool.query(
        "update showcase set img_path=$1, caption=$2, sort=$3 where id=$4 returning *",
        [
          str(req.body?.img_path),
          str(req.body?.caption, 300),
          intOr(req.body?.sort, 0),
          id,
        ],
      );
      if (!rows[0]) return reply.code(404).send({ error: "not found" });
      return rows[0];
    });
    guarded.delete("/api/admin/showcase/:id", async (req, reply) => {
      const id = intOr(req.params.id);
      if (id == null) return reply.code(400).send({ error: "bad id" });
      await pool.query("delete from showcase where id=$1", [id]);
      return { ok: true };
    });

    guarded.delete("/api/admin/media", async (req, reply) => {
      const p = str(req.body?.path);

      if (!p.startsWith("/media/")) {
        return reply.code(400).send({ error: "bad path" });
      }

      const target = path.resolve(mediaRoot, "." + p.slice("/media".length));

      if (target !== mediaRoot && !target.startsWith(mediaRoot + path.sep)) {
        return reply.code(400).send({ error: "bad path" });
      }

      try {
        await fs.unlink(target);
      } catch (e) {
        if (e.code !== "ENOENT") throw e;
      }

      return { ok: true };
    });

    guarded.get("/api/admin/releases", async () => {
      const { rows } = await pool.query(
        "select * from releases order by sort, id",
      );
      return rows;
    });
    guarded.post("/api/admin/releases", async (req) => {
      const { rows } = await pool.query(
        `insert into releases (title, img_path, soundcloud, spotify, apple, youtube, sort)
         values ($1,$2,$3,$4,$5,$6,$7) returning *`,
        [
          str(req.body?.title, 200),
          str(req.body?.img_path),
          str(req.body?.soundcloud, 500),
          str(req.body?.spotify, 500),
          str(req.body?.apple, 500),
          str(req.body?.youtube, 500),
          intOr(req.body?.sort, 0),
        ],
      );
      return rows[0];
    });
    guarded.put("/api/admin/releases/:id", async (req, reply) => {
      const id = intOr(req.params.id);
      if (id == null) return reply.code(400).send({ error: "bad id" });
      const { rows } = await pool.query(
        `update releases set title=$1, img_path=$2, soundcloud=$3, spotify=$4,
         apple=$5, youtube=$6, sort=$7 where id=$8 returning *`,
        [
          str(req.body?.title, 200),
          str(req.body?.img_path),
          str(req.body?.soundcloud, 500),
          str(req.body?.spotify, 500),
          str(req.body?.apple, 500),
          str(req.body?.youtube, 500),
          intOr(req.body?.sort, 0),
          id,
        ],
      );
      if (!rows[0]) return reply.code(404).send({ error: "not found" });
      return rows[0];
    });
    guarded.delete("/api/admin/releases/:id", async (req, reply) => {
      const id = intOr(req.params.id);
      if (id == null) return reply.code(400).send({ error: "bad id" });
      await pool.query("delete from releases where id=$1", [id]);
      return { ok: true };
    });
  });
}
