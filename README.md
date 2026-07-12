# GateFlow — GATE CS Preparation System

A focused study platform for GATE Computer Science aspirants: syllabus tracker,
XP/streaks, study heatmap, subject ROI analysis, PYQ viewer, a full mock-test
engine, CMS-driven resources, community, and an admin console.

## Stack

- **Next.js 14** (App Router) — UI + API in one deploy
- **MongoDB** — persistence
- **Cloudinary** — media uploads (admin)
- **Google Identity** — sign-in
- Tailwind CSS + shadcn/ui + Recharts + Framer Motion

## Getting started

    cp .env.example .env      # then fill in real values
    npm install
    npm run dev               # http://localhost:3000

Generate signing secrets with `openssl rand -hex 32` and set `USER_SECRET` and
`ADMIN_SECRET`. They are **required in production** — the API refuses to run
without them.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm test` | Run unit tests (`node --test`) |

## Authentication model

- Users authenticate via Google (or email/password) and receive a signed Bearer
  token. **Every user API request must send `Authorization: Bearer <token>`**;
  the server derives the caller's identity from the token and never trusts a
  `userId` supplied in the body/query.
- Admins sign in at **`/admin`** and receive a separate admin token. On first
  boot a `admin@gateplus.local` account is seeded with either
  `ADMIN_INITIAL_PASSWORD` or a random password printed once to the server log.
  Change it immediately.

## Project structure

    app/
      api/[[...path]]/route.js   # all API endpoints
      page.js                    # the user-facing SPA
      admin/page.js              # admin console
    components/AdminCMS.js        # admin dashboard + CMS widgets
    lib/security.js               # hashing, tokens, sanitization (tested)
    lib/domain.js                 # XP/streak/rank logic (tested)
    tests/                        # node:test unit tests

## Security notes

- Never commit `.env`. Rotate any secret that has been shared.
- CORS: set `CORS_ORIGINS` to exact production origins.
- Content is uploaded via signed Cloudinary requests; only admins can obtain a signature.
