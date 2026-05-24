# LocalLore

Turn geographical searches into historical and cultural discoveries.

## Milestone 1

Landing page with debounced location search via the [Photon](https://photon.komoot.io/) API (OpenStreetMap). Selecting a location opens a full-screen Mapbox GL map centered on that place, with pan and zoom.

## Milestone 3 (Lore Agent)

When you select a location, the app calls a server-side AI agent that fetches nearby Wikipedia articles and streams synthesized lore (headlines and hooks) into a results panel. No database cache yet.

## Prerequisites

- Node.js 20+
- A [Mapbox](https://account.mapbox.com/) account with a public access token (map display only)
- A [Google AI](https://aistudio.google.com/apikey) API key for the lore agent (Gemini 3.5 Flash)

## Local development

1. Install dependencies:

   ```bash
   npm install
   ```

2. Copy the environment template and add your Mapbox token:

   ```bash
   cp .env.example .env.local
   ```

   Set `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` and `GOOGLE_GENERATIVE_AI_API_KEY` in `.env.local`.

3. In the Mapbox dashboard, restrict your token URLs to:

   - `http://localhost:3000/*`

4. Start the dev server:

   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000) and search for a location.

## Deploy on Vercel

1. Push this repository to GitHub.
2. Import the project in [Vercel](https://vercel.com/new).
3. Add environment variables:
   - `NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN` — your Mapbox public token
   - `GOOGLE_GENERATIVE_AI_API_KEY` — your Google AI API key (server-only)
4. Deploy. After the first deploy, add your production URL (e.g. `https://your-app.vercel.app/*`) to the Mapbox token URL restrictions.
5. Verify autocomplete and location selection work on the live URL.

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
  app/           # Next.js App Router pages
  components/    # UI components
  hooks/         # Shared React hooks
  lib/
    lore/        # Lore agent schema, tools, and orchestration
    mapbox/      # Mapbox GL access token and map constants
    photon/      # Photon geocoding API client (autocomplete)
    types/       # Shared TypeScript types
    wikipedia/   # Wikipedia geosearch client
```

## What's next

- Supabase PostGIS cache (Milestone 2)
- Interactive pins and lore cards (Milestone 4)
