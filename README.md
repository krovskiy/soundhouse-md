# NEXUS

A music/label site with a VST-style interface, backed by an admin panel.
Everything shown on the site — members, tracks, services, merch, banners —
is stored in Postgres and edited through the admin panel. No hardcoded content.

## Stack

- **server/** — Node + Fastify + Postgres API
- **frontend/** — Vite site (`/`) + admin panel (`/admin.html`)

## Requirements

- Node 18+
- A running Postgres instance

## Setup

### 1. Database

Create a database and a user, e.g.:

```sql
CREATE DATABASE nexus;
CREATE USER nexus WITH PASSWORD 'nexus';
GRANT ALL PRIVILEGES ON DATABASE nexus TO nexus;
```

### 2. Server

```bash
cd server
cp .env.example .env      # then edit values (see below)
npm install
npm run migrate           # creates tables + first admin from .env
npm run seed              # optional: sample content
npm start                 # api on http://localhost:3000
```

Edit `.env` before running migrate:

- `DATABASE_URL` — your Postgres connection string
- `COOKIE_SECRET` — any long random string
- `ADMIN_USER` / `ADMIN_PASS` — the first admin login (created on first migrate)
- `FRONTEND_ORIGIN` — the Vite dev URL (`http://localhost:5173` by default)

### 3. Frontend

```bash
cd frontend
cp .env.example .env      # VITE_API_URL should point at the server
npm install
npm run dev               # site on http://localhost:5173
```

- Public site: <http://localhost:5173/>
- Admin panel: <http://localhost:5173/admin.html>

Log in with the `ADMIN_USER` / `ADMIN_PASS` you set.

## Admin panel

Manage all content: members (with their tracks), services, merch, and the
scrolling banner. Image and audio uploads go through the panel and are stored
under `server/media/`, served back at `/media/...`.

## Production build

```bash
cd frontend
npm run build             # outputs dist/ (index.html + admin.html)
```

Serve `dist/` behind any static host, set `VITE_API_URL` to your live API,
and run the server with `NODE_ENV=production` (enables secure cookies).

## Security notes

- Passwords hashed with bcrypt; login is rate-limited.
- Sessions are opaque server-side tokens in an httpOnly, sameSite cookie —
  revocable from the DB, wiped on logout.
- All admin write routes sit behind an auth guard.
- CORS is locked to `FRONTEND_ORIGIN` with credentials.
- All queries are parameterized; inputs are trimmed and length-capped.
- Uploads are extension-whitelisted, size-capped, and randomly renamed.
- Security headers via Helmet; global rate limit on the whole API.
- User text is escaped before rendering on the site and in the panel.
