import { pool } from "../db.js";
export default async function publicRoutes(app) {
  app.get("/api/members", async () => {
    const { rows } = await pool.query(
      "select id, name, img_path from members order by sort, id",
    );
    return rows;
  });

  app.get("/api/members/:id/tracks", async (req, reply) => {
    const id = Number(req.params.id);
    if (!Number.isInteger(id)) return reply.code(400).send({ error: "bad id" });
    const { rows } = await pool.query(
      `select id, position, title, file_path, cover_path
       from tracks where member_id = $1 order by position`,
      [id],
    );
    return rows;
  });

  app.get("/api/services", async () => {
    const { rows } = await pool.query(
      "select id, title, description, price from services order by sort, id",
    );
    return rows;
  });

  app.get("/api/merch", async () => {
    const { rows } = await pool.query(
      "select id, name, price, sizes, img_path, sort from merch order by sort, id",
    );
    return rows;
  });

  app.get("/api/showcase", async () => {
    const { rows } = await pool.query(
      "select id, img_path, caption from showcase order by sort, id",
    );
    return rows;
  });

  app.get("/api/banners", async () => {
    const { rows } = await pool.query(
      "select id, text from banners where active order by sort, id",
    );
    return rows;
  });
  app.get("/api/releases", async () => {
    const { rows } = await pool.query(
      "select * from releases order by sort, id",
    );
    return rows;
  });
}
