import "dotenv/config";
import { pool } from "./db.js";

async function seed() {
  await pool.query("delete from tracks");
  await pool.query("delete from members");
  await pool.query("delete from services");
  await pool.query("delete from merch");
  await pool.query("delete from banners");
  await pool.query("delete from releases");

  const members = ["MEMBER 01", "MEMBER 02", "MEMBER 03", "MEMBER 04"];
  let ms = 0;
  for (const name of members) {
    const { rows } = await pool.query(
      "insert into members (name, sort) values ($1, $2) returning id",
      [name, ms++],
    );
    const id = rows[0].id;
    let pos = 1;
    for (const title of ["TRACK ONE", "TRACK TWO"]) {
      await pool.query(
        `insert into tracks (member_id, position, title, file_path, cover_path)
         values ($1, $2, $3, $4, $5)`,
        [id, pos++, title, "/media/audio/track01.mp3", "/media/img/cover.jpg"],
      );
    }
  }

  const services = [
    ["MIXING", "Placeholder description for mixing services.", "$--"],
    ["MASTERING", "Placeholder description for mastering services.", "$--"],
    ["PRODUCTION", "Placeholder description for production services.", "$--"],
  ];
  let ss = 0;
  for (const [t, d, p] of services) {
    await pool.query(
      "insert into services (title, description, price, sort) values ($1,$2,$3,$4)",
      [t, d, p, ss++],
    );
  }

  let xs = 0;
  for (let i = 0; i < 4; i++) {
    await pool.query(
      "insert into merch (name, price, sort) values ($1,$2,$3)",
      ["ITEM NAME", "$--", xs++],
    );
  }

  let rs = 0;
  for (let i = 1; i <= 3; i++) {
    await pool.query(
      `insert into releases (title, img_path, soundcloud, spotify, apple, youtube, sort)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [
        `RELEASE 0${i}`,
        "/media/img/cover.jpg",
        "https://soundcloud.com/",
        "https://open.spotify.com/",
        "https://music.apple.com/",
        "https://youtube.com/",
        rs++,
      ],
    );
  }

  await pool.query("insert into banners (text, sort) values ($1, 0)", [
    "NEW MEMBER: TEST",
  ]);

  console.log("seeded");
  await pool.end();
}

seed().catch((e) => {
  console.error(e);
  process.exit(1);
});
