import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import Fastify from "fastify";
import cookie from "@fastify/cookie";
import rateLimit from "@fastify/rate-limit";
import multipart from "@fastify/multipart";
import bcrypt from "bcryptjs";
import { pool } from "../db.js";
import publicRoutes from "../routes/public.js";
import adminRoutes from "../routes/admin.js";

let app;
let cookieHdr;

// build schema + one admin, then boot the real routes
before(async () => {
  await pool.query(`
    drop table if exists sessions, tracks, members, services, merch, banners, admins cascade;
    create table admins (id serial primary key, username text unique not null, pass_hash text not null, created_at timestamptz default now());
    create table members (id serial primary key, name text not null, img_path text, sort int default 0, created_at timestamptz default now());
    create table tracks (id serial primary key, member_id integer not null references members(id) on delete cascade, position integer not null, title text not null, file_path text not null, cover_path text);
    create table services (id serial primary key, title text not null, description text default '', price text default '', sort int default 0);
    create table merch (id serial primary key, name text not null, price text default '', img_path text, sort int default 0);
    create table banners (id serial primary key, text text not null, sort int default 0, active boolean not null default true);
    create table sessions (token text primary key, admin_id integer not null references admins(id) on delete cascade, expires_at timestamptz not null);
  `);
  await pool.query("insert into admins (username, pass_hash) values ($1,$2)", [
    "admin",
    await bcrypt.hash("secret", 12),
  ]);

  app = Fastify();
  await app.register(cookie, { secret: "test" });
  await app.register(rateLimit, { max: 1000, timeWindow: "1 minute" });
  await app.register(multipart);
  await app.register(publicRoutes);
  await app.register(adminRoutes, { mediaRoot: "/tmp" });
});

after(async () => {
  await app.close();
  await pool.end();
});

test("guard blocks anonymous access", async () => {
  const r = await app.inject({ method: "GET", url: "/api/admin/members" });
  assert.equal(r.statusCode, 401);
});

test("rejects bad password", async () => {
  const r = await app.inject({
    method: "POST",
    url: "/api/admin/login",
    payload: { username: "admin", password: "wrong" },
  });
  assert.equal(r.statusCode, 401);
});

test("login sets an httpOnly session cookie", async () => {
  const r = await app.inject({
    method: "POST",
    url: "/api/admin/login",
    payload: { username: "admin", password: "secret" },
  });
  assert.equal(r.statusCode, 200);
  const sid = r.cookies.find((c) => c.name === "sid");
  assert.ok(sid && sid.httpOnly);
  cookieHdr = `sid=${sid.value}`;
});

test("creates a member and lists it publicly", async () => {
  const c = await app.inject({
    method: "POST",
    url: "/api/admin/members",
    headers: { cookie: cookieHdr },
    payload: { name: "TEST MEMBER", sort: 0 },
  });
  assert.equal(c.statusCode, 200);
  const list = await app.inject({ method: "GET", url: "/api/members" });
  assert.ok(list.json().some((m) => m.name === "TEST MEMBER"));
});

test("truncates over-long input", async () => {
  const r = await app.inject({
    method: "POST",
    url: "/api/admin/members",
    headers: { cookie: cookieHdr },
    payload: { name: "x".repeat(9999) },
  });
  assert.equal(r.json().name.length, 200);
});

test("logout revokes the session", async () => {
  await app.inject({
    method: "POST",
    url: "/api/admin/logout",
    headers: { cookie: cookieHdr },
  });
  const r = await app.inject({
    method: "GET",
    url: "/api/admin/members",
    headers: { cookie: cookieHdr },
  });
  assert.equal(r.statusCode, 401);
});
