const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const fs = require("fs");
const path = require("path");

function parseInitArray(src, name) {
  const re = new RegExp(`const ${name} = (\\[[\\s\\S]*?\\]);`);
  const m = src.match(re);
  if (!m) throw new Error(`Could not find ${name} in netflix_history.jsx`);
  return Function(`"use strict"; return (${m[1]})`)();
}

async function main() {
  const root = path.join(__dirname, "..");
  const jsxPath = path.join(root, "netflix_history.jsx");

  const prisma = new PrismaClient();
  try {
    const email = process.env.SEED_DEMO_EMAIL || "demo@demo.local";
    const plain = process.env.SEED_DEMO_PASSWORD || "demo-demo";

    await prisma.user.deleteMany({ where: { email } });

    const passwordHash = await bcrypt.hash(plain, 12);
    const user = await prisma.user.create({
      data: { email, passwordHash, name: "Demo" },
    });

    let movies = [];
    let series = [];
    if (fs.existsSync(jsxPath)) {
      const src = fs.readFileSync(jsxPath, "utf8");
      movies = parseInitArray(src, "INIT_MOVIES");
      series = parseInitArray(src, "INIT_SERIES");
    } else {
      console.warn("netflix_history.jsx not found; demo user will have no titles.");
    }

    for (const m of movies) {
      await prisma.movieEntry.create({
        data: { userId: user.id, title: m.title, year: m.year },
      });
    }
    for (const s of series) {
      await prisma.seriesEntry.create({
        data: {
          userId: user.id,
          title: s.title,
          years: s.years,
          eps: s.eps != null ? s.eps : null,
        },
      });
    }

    console.log(`Seeded user ${email} / ${plain} with ${movies.length} movies and ${series.length} series.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
