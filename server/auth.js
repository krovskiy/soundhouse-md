import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";

const COOKIE = "sid";
const TTL_MS = 1000 * 60 * 60 * 8;

function newToken() {
  return crypto.randomBytes(32).toString("hex");
}

export async function login(username, password) {
  const { rows } = await pool.query(
    "select id, pass_hash from admins where username = $1",
    [username],
  );

  const hash = rows[0]?.pass_hash ?? "$2b$12$" + "x".repeat(53);
  const ok = await bcrypt.compare(password, hash);
  if (!rows[0] || !ok) return null;

  const token = newToken();
  await pool.query(
    "insert into sessions (token, admin_id, expires_at) values ($1,$2,$3)",
    [token, rows[0].id, new Date(Date.now() + TTL_MS)],
  );
  return token;
}

export async function logout(token) {
  if (token) await pool.query("delete from sessions where token = $1", [token]);
}

async function sessionFromReq(req) {
  const token = req.cookies?.[COOKIE];
  if (!token) return null;
  const { rows } = await pool.query(
    "select admin_id, expires_at from sessions where token = $1",
    [token],
  );
  const s = rows[0];
  if (!s) return null;
  if (new Date(s.expires_at) < new Date()) {
    await pool.query("delete from sessions where token = $1", [token]);
    return null;
  }
  return { adminId: s.admin_id, token };
}

export async function requireAuth(req, reply) {
  const s = await sessionFromReq(req);
  if (!s) return reply.code(401).send({ error: "unauthorized" });
  req.admin = s;
}

export function setSessionCookie(reply, token) {
  reply.setCookie(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TTL_MS / 1000,
  });
}

export function clearSessionCookie(reply) {
  reply.clearCookie(COOKIE, { path: "/" });
}

export { COOKIE };
