# Viewing history (movies & series)

Full-stack Next.js app: sign up, keep your Netflix-style movie and series lists in a database, rate titles, and optionally pull posters, overviews, and community scores from **The Movie Database (TMDB)**.

Your original UI from `netflix_history.jsx` is implemented in `src/components/HomeTracker.jsx` (with API-backed storage and TMDB hints when adding titles).

## Local setup

1. **PostgreSQL**  
   - Easiest: `docker compose up -d` in this folder (user `movie`, password `movie`, database `movie`).  
   - Or use a free [Neon](https://neon.tech) Postgres URL as `DATABASE_URL`.

2. **Environment**  
   Copy `.env.example` to `.env` and set:
   - `DATABASE_URL`
   - `NEXTAUTH_URL` (e.g. `http://localhost:3000`)
   - `NEXTAUTH_SECRET` (e.g. run `openssl rand -base64 32` on Mac/Linux, or any long random string on Windows)
   - `TMDB_API_KEY` (optional; get a free key at [themoviedb.org/settings/api](https://www.themoviedb.org/settings/api))

3. **Install & database**

   ```bash
   npm install
   npx prisma db push
   npm run db:seed
   ```

   Seed creates **demo@demo.local** / **demo-demo** and copies lists from `netflix_history.jsx` into that account.

4. **Run**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000), sign in with the demo account or create your own on `/signup`.

## API (authenticated; session cookie from the browser)

| Method | Path | Purpose |
|--------|------|--------|
| GET / POST | `/api/movies` | List / create movie (`title`, `year`, optional `tmdbId`) |
| PATCH / DELETE | `/api/movies/[id]` | Update `userRating` (1–5 or 0 to clear) / delete |
| GET / POST | `/api/series` | List / create series (`title`, `years`, optional `eps`, optional `tmdbId`) |
| PATCH / DELETE | `/api/series/[id]` | Update rating / delete |
| GET | `/api/tmdb/search?q=&type=movie\|tv` | TMDB search (needs `TMDB_API_KEY`) |
| POST | `/api/signup` | `{ "email", "password", "name?" }` |

NextAuth routes: `/api/auth/*`.

## Free hosting (example: Vercel + Neon)

1. Create a **Neon** project, copy the Postgres connection string into Vercel project **Environment Variables** as `DATABASE_URL`.
2. Set `NEXTAUTH_URL` to your production URL (e.g. `https://your-app.vercel.app`).
3. Set `NEXTAUTH_SECRET` to a strong random value.
4. Add `TMDB_API_KEY` if you want TMDB search and metadata.
5. Connect the Git repo to **Vercel** and deploy. Build command: `npm run build` (already runs `prisma generate`).
6. After the first deploy, run migrations against Neon from your machine (or use Vercel’s shell if available):

   ```bash
   npx prisma db push
   ```

   Production users sign up via `/signup`; you do not have to run the seed on production unless you want a demo account.

## Files of note

- `src/components/HomeTracker.jsx` — main UI  
- `src/lib/tmdb.js` — TMDB helpers  
- `src/lib/auth.js` — NextAuth options  
- `prisma/schema.prisma` — `User`, `MovieEntry`, `SeriesEntry`  
- `netflix_history.jsx` — still used as the data source for `npm run db:seed`

## Legal

This project is for personal tracking. “Netflix” is a trademark of Netflix, Inc.; this app is not affiliated with Netflix. TMDB data is attributed to [The Movie Database](https://www.themoviedb.org/).
