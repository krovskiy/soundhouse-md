import "dotenv/config";
import pg from "pg";

export const pool =
  globalThis.__TEST_POOL__ ??
  new pg.Pool({ connectionString: process.env.DATABASE_URL });
