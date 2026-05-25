# LocalLore

Turn geographical searches into historical and cultural discoveries.

## Milestone 1

Landing page with debounced location search via the [Photon](https://photon.komoot.io/) API (OpenStreetMap). Selecting a location opens a full-screen Mapbox GL map centered on that place, with pan and zoom.

## Async lore queue (QStash)

When you select a location, the app **enqueues** a background job instead of calling Gemini on the request thread:

1. `POST /api/lore` stores a short-lived job in **Upstash Redis** and publishes to **Upstash QStash**.
2. QStash delivers work to `/api/cron/process-lore` with flow control (**15 requests/minute**, **5 parallel** max) to protect the Gemini free tier.
3. The worker fetches Wikipedia articles and runs **one** `generateText` call per job.
4. The map polls `GET /api/lore?jobId=…` every 2s until pins are ready.

There is **no geographic cache** yet (Supabase PostGIS is planned for a later milestone).

**API quota:** Each location search uses **one** Gemini `generateText` call (Wikipedia is fetched separately, no AI). Default model is `gemini-3.1-flash-lite`. Override with `LORE_MODEL_ID` in `.env.local` if needed.

## Prerequisites

- Node.js 20+
- A [Mapbox](https://account.mapbox.com/) account with a public access token (map display only)
- A [Google AI](https://aistudio.google.com/apikey) API key for the lore agent
- [Upstash QStash](https://console.upstash.com/qstash) and [Upstash Redis](https://console.upstash.com/redis) (free tiers)

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and fill in values:

   ```bash
   cp .env.example .env.local
   ```

   Required in `.env.local`:

   - `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN`
   - `GOOGLE_GENERATIVE_AI_API_KEY`
   - `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
   - `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
   - `LORE_APP_URL` — your deployed app URL (e.g. `https://your-app.vercel.app`)
   - Optional `LORE_APP_URL_LOCAL` — only if you need a non-default local callback port

3. **QStash local dev:** In a second terminal, run the [QStash CLI](https://upstash.com/docs/qstash/howto/local-development):

   ```bash
   npx @upstash/qstash-cli dev
   ```

   Copy its `QSTASH_URL`, `QSTASH_TOKEN`, and signing keys into `.env.local`. When `QSTASH_URL` points at `127.0.0.1:8080`, the app automatically callbacks to `http://127.0.0.1:3000` during `npm run dev` (even if `LORE_APP_URL` is your Vercel URL). View messages at the [local QStash console](https://console.upstash.com/qstash/local-mode-user?port=8080), not the cloud dashboard.

4. In the Mapbox dashboard, restrict your token URLs to:

   - `http://localhost:3000/*`

5. Start the dev server:

   ```bash
   npm run dev
   ```

6. Open [http://localhost:3000](http://localhost:3000) and search for a location.

## Deploy on Vercel

1. Push this repository to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Add environment variables from `.env.example` (including QStash, Redis, and `LORE_APP_URL` set to `https://your-app.vercel.app` or rely on `VERCEL_URL`).
4. Deploy. After the first deploy, add your production URL to Mapbox token URL restrictions.
5. Verify search → map → lore pins after the queue processes.

No extra `vercel.json` configuration is required; Vercel auto-detects Next.js.

## Scripts

| Command        | Description              |
| -------------- | ------------------------ |
| `npm run dev`  | Start development server |
| `npm run build`| Production build         |
| `npm run start`| Run production server    |
| `npm run lint` | Run ESLint               |

## Project structure

```
src/
  app/
    api/lore/              # Enqueue + poll lore jobs
    api/cron/process-lore/ # QStash worker (Gemini synthesis)
  components/              # UI components
  hooks/                   # Shared React hooks
  lib/
    jobs/                  # Redis job store
    lore/                  # Lore agent schema and synthesis
    mapbox/                # Mapbox GL access token and map constants
    photon/                # Photon geocoding API client
    qstash/                # QStash publish client
    types/                 # Shared TypeScript types
    wikipedia/             # Wikipedia nearcoord search + article enrichment
```

## What's next

- Supabase PostGIS geographic cache (Milestone 2)
- Supabase Realtime instead of polling (optional)
