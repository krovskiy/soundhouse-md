import "dotenv/config";
import bcrypt from "bcryptjs";
import { pool } from "./db.js";

// creates every table the site needs. safe to run repeatedly.
async function migrate() {
  await pool.query(`
    create table if not exists admins (
      id serial primary key,
      username text unique not null,
      pass_hash text not null,
      created_at timestamptz not null default now()
    );

    create table if not exists members (
      id serial primary key,
      name text not null,
      img_path text,
      sort int not null default 0,
      created_at timestamptz not null default now()
    );

    create table if not exists tracks (
      id serial primary key,
      member_id integer not null references members(id) on delete cascade,
      position integer not null,
      title text not null,
      file_path text not null,
      cover_path text
    );

    create table if not exists services (
      id serial primary key,
      title text not null,
      description text not null default '',
      price text not null default '',
      sort int not null default 0
    );

    create table if not exists merch (
      id serial primary key,
      name text not null,
      price text not null default '',
      img_path text,
      sort int not null default 0
    );

    create table if not exists banners (
      id serial primary key,
      text text not null,
      sort int not null default 0,
      active boolean not null default true
    );

    -- server-side sessions, so a stolen token can be revoked
    create table if not exists sessions (
      token text primary key,
      admin_id integer not null references admins(id) on delete cascade,
      expires_at timestamptz not null
    );
  `);

  // create first admin from env if none exists yet
  const { rows } = await pool.query("select count(*)::int as n from admins");
  if (rows[0].n === 0) {
    const user = process.env.ADMIN_USER;
    const pass = process.env.ADMIN_PASS;
    if (user && pass) {
      const hash = await bcrypt.hash(pass, 12);
      await pool.query(
        "insert into admins (username, pass_hash) values ($1, $2)",
        [user, hash],
      );
      console.log(`admin '${user}' created`);
    } else {
      console.log("no admin yet — set ADMIN_USER and ADMIN_PASS in .env");
    }
  }

  console.log("migrated");
  await pool.end();
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
