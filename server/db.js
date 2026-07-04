import "dotenv/config";
import pg from "pg";

// single shared pool. tests may inject one via globalThis.__TEST_POOL__.
export const pool =
  globalThis.__TEST_POOL__ ??
  new pg.Pool({ connectionString: process.env.DATABASE_URL });
