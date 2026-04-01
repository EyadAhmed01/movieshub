# Rotten Potatoes

A full-stack **movie & TV viewing tracker** with ratings, TMDB metadata, a watchlist, analytics, and an optional **LLM layer** (“**Mr Potato**”) that runs on **grounded, structured context**—not generic chat with no memory.

![Next.js](https://img.shields.io/badge/Next.js-14-black?logo=next.js)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?logo=prisma)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-database-4169E1?logo=postgresql)

---

## Features

| Area | What you get |
|------|----------------|
| **Library** | Movies and series with year(s), optional TMDB link, posters, overviews, community scores |
| **Ratings** | Per-title **1–10** scores (or unrated); drives recommendations and AI summaries |
| **Watchlist** | TMDB-backed saves for “watch later” |
| **For You** | Recommendations from **TMDB** similar/recommended graphs, blended from your highly rated titles; optional **LLM reorder** for shelf diversity |
| **What to watch** | Pick mood, genre, format, tone → **structured JSON** from the LLM → resolved to a **TMDB** title you can add |
| **Mr Potato (chat)** | Library-aware Q&A when signed in: the server injects a **compact snapshot** of your rows into the system prompt |
| **Profile / Analytics** | Stats plus **AI-generated taste copy** (cached), with rules tied to anchor titles so the model doesn’t invent your history |
| **Cast** | TMDB-first; optional **AI cast match** / enrichment paths where configured |
| **Import** | **Netflix viewing history CSV** → matched to TMDB where possible (`/api/import/netflix`) |
| **Export** | **CSV** download of your library from the app menu (`type`, `title`, `year`, `rating`, `tmdb_id`) |

---

## Stack

- **Framework:** [Next.js](https://nextjs.org/) 14 (App Router), React 18  
- **Auth:** [NextAuth.js](https://next-auth.js.org/) (credentials)  
- **Database:** [PostgreSQL](https://www.postgresql.org/) via [Prisma](https://www.prisma.io/)  
- **Metadata:** [The Movie Database (TMDB)](https://www.themoviedb.org/) API  
- **LLM (optional):** [Groq](https://console.groq.com/) (default) or local [Ollama](https://ollama.com/) — typically **Llama**-class models  

---

## Prerequisites

- **Node.js** 18+  
- **PostgreSQL** (local Docker, [Neon](https://neon.tech), or any hosted Postgres)

---

## Local setup

### 1. Clone and install

```bash
git clone https://github.com/YOUR_USERNAME/movieshub.git
cd movieshub
npm install
```

### 2. Database

**Option A — Docker** (from repo root):

```bash
docker compose up -d
```

**Option B — Neon / other host:** create a database and copy the connection string.

### 3. Environment

Copy `.env.example` to `.env` and set at least:

| Variable | Required | Notes |
|----------|----------|--------|
| `DATABASE_URL` | Yes | Postgres connection string |
| `NEXTAUTH_URL` | Yes | e.g. `http://localhost:3000` (no trailing slash) |
| `NEXTAUTH_SECRET` | Yes | Long random string |
| `TMDB_API_KEY` | Strongly recommended | Search, posters, For You, import matching |
| `GROQ_API_KEY` | For AI features on Groq | Get a key at [console.groq.com](https://console.groq.com) |
| `LLM_PROVIDER` | No | Defaults to `groq`; use `ollama` for local |
| `GROQ_MODEL` | No | e.g. `llama-3.1-8b-instant` |

### 4. Schema and seed

```bash
npx prisma db push
npm run db:seed
```

Seed creates a demo account (see `.env.example` comments for overrides) and loads sample data.

### 5. Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in with the demo user or register at `/signup`.

---

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Development server |
| `npm run build` | Production build (`prisma generate` + `next build`) |
| `npm run start` | Start production server |
| `npm run db:push` | Push Prisma schema to the database |
| `npm run db:seed` | Seed demo data |
| `npm run db:studio` | Open Prisma Studio |

---

## API overview

All routes below expect an authenticated session (cookie) unless noted.

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/signup` | Register `{ email, password, name? }` |
| GET / POST | `/api/movies` | List / create movies |
| PATCH / DELETE | `/api/movies/[id]` | Update `userRating` (1–10 or clear) / delete |
| GET / POST | `/api/series` | List / create series |
| PATCH / DELETE | `/api/series/[id]` | Update rating / delete |
| GET | `/api/tmdb/search` | TMDB search (`q`, `type=movie\|tv`) |
| GET / POST | `/api/watchlist` | List / add watchlist item |
| DELETE | `/api/watchlist/[id]` | Remove item |
| GET | `/api/recommendations` | For You picks (TMDB + optional LLM reorder) |
| POST | `/api/what-to-watch` | Structured pick from mood/genre/format/tone |
| POST | `/api/chat` | Mr Potato chat (library context when available) |
| GET | `/api/analytics` | Aggregated stats |
| GET / PATCH | `/api/profile` | Profile + preferences |
| POST | `/api/profile/insights` | Refresh AI taste / persona (uses LLM when configured) |
| POST | `/api/import/netflix` | Netflix CSV import (multipart or JSON) |
| POST | `/api/library/enrich` | Enrich library rows with TMDB |
| GET | `/api/tmdb/details` | TMDB detail for a title |
| POST | `/api/tmdb/ai-cast-match` | AI-assisted cast supplementation |

NextAuth: `/api/auth/*`.

---

## Deploying (e.g. Vercel + Neon)

1. Create a **Neon** database; set `DATABASE_URL` on the host.  
2. Set `NEXTAUTH_URL` to your production URL and `NEXTAUTH_SECRET` to a strong secret.  
3. Add `TMDB_API_KEY` and, for AI, `GROQ_API_KEY` (and optional `GROQ_MODEL`).  
4. Connect the repo and deploy; build command is already `npm run build`.  
5. After first deploy, run **`npx prisma db push`** against the **same** `DATABASE_URL` (from your machine or CI) so tables exist.  
6. Ensure **`src/app/globals.css`** is committed—root `layout.jsx` imports it (missing file breaks the build).

---

## Project layout (short)

```
prisma/              # schema + seed
src/app/             # App Router pages + API routes
src/components/      # UI (HomeTracker, AppShell, chat, etc.)
src/lib/             # auth, tmdb, llm prompts, export CSV helpers, …
public/assets/       # logos / static assets
```

---

## Design notes (AI)

- **LLM is not the source of truth** for facts about your library—the **database snapshot** is.  
- **Structured outputs** (JSON) are parsed and validated before use.  
- **TMDB IDs** ground titles for watchlist, What to watch, and enrichment.  
- **Groq** runs hosted **Llama**-family models by default; **Ollama** is supported for fully local inference.

---

## Legal

This project is for **personal tracking**. “Netflix” is a trademark of Netflix, Inc.; this app is **not** affiliated with Netflix.  
This product uses the TMDB API but is not endorsed or certified by TMDB. [themoviedb.org](https://www.themoviedb.org/)

---

## License

Private / personal use unless you add a license file.
