import { pool } from "./db.js";

async function seed() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      id SERIAL PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tracks (
      id SERIAL PRIMARY KEY,
      member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      position INTEGER NOT NULL,
      title TEXT NOT NULL,
      file_path TEXT NOT NULL,
      cover_path TEXT
    );
  `);

  await pool.query("DELETE FROM tracks");
  await pool.query("DELETE FROM members");

  const members = ["MEMBER 01", "MEMBER 02", "MEMBER 03", "MEMBER 04"];
  for (const name of members) {
    const { rows } = await pool.query(
      "INSERT INTO members (name) VALUES ($1) RETURNING id",
      [name],
    );
    const memberId = rows[0].id;

    const tracks = [
      {
        title: "TRACK ONE",
        file: "/media/audio/track01.mp3",
        cover: "/media/audio/track01.jpg",
      },
      {
        title: "TRACK TWO",
        file: "/media/audio/track01.mp3",
        cover: "/media/audio/track01.jpg",
      },
    ];

    let pos = 1;
    for (const t of tracks) {
      await pool.query(
        `INSERT INTO tracks (member_id, position, title, file_path, cover_path)
         VALUES ($1, $2, $3, $4, $5)`,
        [memberId, pos++, t.title, t.file, t.cover],
      );
    }
  }

  console.log("seeded");
  await pool.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
