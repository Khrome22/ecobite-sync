# EcoBite

Real-time kitchen companion for a dorm floor. Scan what is about to turn, cook it with a hands-free voice coach, and put the rest on a live neighborhood board before it hits the trash.

The demo is set in Bursley, floor 3 — North Campus, a short walk from the MHacks venue. You are Kavitha. The shelf is already in trouble.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

Booth mode needs no API keys. Copy `.env.example` to `.env.local` and fill in keys when you want a hosted service. Anything left blank stays on the local path.

| Variable | What it turns on |
| --- | --- |
| `GEMINI_API_KEY` | Sees food in a photo even when nothing is printed. Printed receipts are read without this key. Model defaults to `gemini-3.8-flash`. |
| `ELEVENLABS_API_KEY` | The voice chef speaks with ElevenLabs Flash. Without a key, the server makes a sound file and the page plays that, so Chrome does not have to use its own voice. |
| `ELEVENLABS_VOICE_ID` | Optional. Defaults to Rachel (`21m00Tcm4TlvDq8ikWAM`). |
| `NEXT_PUBLIC_SPACETIMEDB_URI` | Live room. Offer, claim, host, and the shelf are SpacetimeDB reducers. Both this and the database name are required. |
| `NEXT_PUBLIC_SPACETIMEDB_DATABASE` | The published module name, for example `ecobite-bursley`. |
| `NEON_DATABASE_URL` | Profiles, shelf, rescue history, and recipe history in Neon. |
| `TIGER_DATABASE_URL` | `waste_events` hypertable. The Impact page reads the `impact_daily` continuous aggregate. |

The sidebar says which path is live: Gemini, ElevenLabs, Spacetime, Neon, and Tiger, each against its booth fallback. **Dark** in the sidebar (and in the phone header) switches to the night palette. The choice stays in this browser.

## Add API keys

Create `.env.local` next to `package.json`. It stays on your machine and is not committed.

```bash
GEMINI_API_KEY=your_gemini_key
GEMINI_MODEL=gemini-3.8-flash
ELEVENLABS_API_KEY=your_elevenlabs_key
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
```

Restart `npm run dev` after saving. Gemini keys come from [Google AI Studio](https://aistudio.google.com/apikey). ElevenLabs keys come from the ElevenLabs dashboard, under Developers / API keys. Those two are the MLH Gemini and ElevenLabs prize paths. Printed receipts still parse without them. A Gemini key is what reads a crumpled receipt or a fridge photo. An ElevenLabs key is what speaks the chef.

## Turn on Spacetime, Neon, and Tiger

Each one is independent. Booth mode keeps working for any you leave blank. Restart `npm run dev` after you change `.env.local`.

### SpacetimeDB

The rescue board's shared state lives in the module at `spacetimedb/`. Tables: `floor`, `ingredient`, `rescue_post`, `room_note`, `waste_event`, `recipe_run`. Reducers: `offer`, `claim`, `host`, `addIngredients`, `mark`, `logMeal`, `reset`, `tick`, `keepAlive`. `init` seeds the Bursley opening scene the first time the module is published.

1. Install the [SpacetimeDB CLI](https://spacetimedb.com/install) (2.10.x, same major as the `spacetimedb` npm package). `curl -sSf https://install.spacetimedb.com | sh` on macOS or Linux.
2. Log in once: `spacetime login`.
3. From the repo root, publish the module. The name you pick is the database name:

```bash
spacetime publish ecobite-bursley --module-path spacetimedb -s maincloud -y
```

To wipe the room and seed it again, add `--delete-data=always`. Maincloud's URI is `wss://maincloud.spacetimedb.com`. A local `spacetime start` uses `ws://127.0.0.1:3000` instead, and you drop `-s maincloud`. If `maincloud` is not the server nickname on your machine, `spacetime server list` shows the one to pass to `-s`.

4. Put both in `.env.local` and restart the dev server:

```bash
NEXT_PUBLIC_SPACETIMEDB_URI=wss://maincloud.spacetimedb.com
NEXT_PUBLIC_SPACETIMEDB_DATABASE=ecobite-bursley
```

Open the app on two screens. Claim Sam's bananas on one. The other screen updates from the SpacetimeDB subscription, not from the booth stream. The sidebar should say **Spacetime live**. If the cluster cannot be reached, the app falls back to the booth room and the sidebar says **Spacetime unreachable**.

Regenerate client bindings after you change a table or a reducer signature:

```bash
spacetime generate --lang typescript --out-dir src/module_bindings --module-path spacetimedb -y
```

The module directory needs its own `npm install` (it depends on `spacetimedb` and `typescript`) before `spacetime generate` or `spacetime publish`.

### Neon

App rows, not the live room and not the impact chart. `users`, `ingredients`, `rescue_posts`, and `recipe_history`.

1. Create a project at [console.neon.tech](https://console.neon.tech).
2. Copy the **pooled** connection string (`postgresql://…@….neon.tech/…`).
3. Put it in `.env.local` as `NEON_DATABASE_URL`.
4. Apply the schema:

```bash
npm run db:neon
```

That runs `schema/neon.sql`. Every kitchen change upserts the floor profiles and replaces the shelf, rescue history, and recipe log. Cook a meal with **We ate it** and `recipe_history` gets the recipe name. There is no Neon Auth wall: the demo is already Kavitha in Bursley 3B, and a sign-in screen would break booth mode and the ninety-second path. The `users` table is the profile.

### Tiger Data

Time-series only. `waste_events` is a hypertable. `impact_daily` is a continuous aggregate with a one-minute refresh policy and `timescaledb.materialized_only = false`, so the Impact page can query the rollup and still see a row you just logged.

1. Create a service in the [Tiger Cloud console](https://console.cloud.timescale.com/).
2. Download the config and copy the service connection string. You only see the password once.
3. Put it in `.env.local` as `TIGER_DATABASE_URL`.
4. Apply the schema:

```bash
npm run db:tiger
```

That runs `schema/tiger.sql` (`create_hypertable`, the continuous aggregate, the real-time flag, and the refresh policy). Reload Impact. The sidebar should say **Tiger live**, and the page should say it is reading `impact_daily`.

Neon and Tiger are both Postgres. They stay separate on purpose: Neon holds the kitchen records, Tiger holds the event clock.

## Ninety-second demo

1. **Scan.** List what’s left (or read the receipt / fridge sample, or upload a photo if Gemini is keyed). Each line gets an expiration estimate. Log it. Cooked rice is under 24 hours, so it shows up on the floor by itself.
2. **Kitchen.** The shelf clocks are live. Tonight’s cook is already picked from whatever dies first.
3. **Cook this** on the kitchen page, then press Start. The step is read out loud in a natural voice. Press Next step, or the space bar. Ask “what if I don’t have feta?”
4. **Rescue.** Your under-24-hour food is already broadcast. Claim Sam’s bananas — a second screen on the same server sees the claim immediately. Within about a minute, Jordan, Mina, Alex, and Sam post on their own. Host the 9:15 skillet.
5. **Impact.** Postgres rolls `waste_events` into logged versus wasted, carbon avoided, water saved, and money preserved. Today’s bar fills when you log, cook, claim, or toss.

Reset the demo kitchen from the sidebar between rehearsals. If you leave and come back after the clocks have died, they shift forward so the opening scene is still urgent. Cooked meals stay cooked.

## What the numbers mean

The Impact page reads Postgres. Every log, cook, claim, and toss is a `waste_events` row. In booth mode the chart is a daily `GROUP BY` on local Postgres. With `TIGER_DATABASE_URL` set, the same numbers come from the `impact_daily` continuous aggregate.

- **Logged versus wasted** is grams that entered the kitchen against grams that were tossed.
- **Carbon emissions avoided** uses 0.58 kg CO2e per kg of food that was cooked or claimed instead of landfilled, in the range of EPA WARM.
- **Water saved** is the water footprint of that same food, following Mekonnen & Hoekstra (2011).
- **Money preserved** is the grocery price of food that was cooked or claimed instead of tossed.

`schema/tiger.sql` is the hypertable and continuous aggregate. `schema/neon.sql` is the app tables. The booth runs the impact rollup in local Postgres so the page works with no hosted database. `schema.sql` points at the two files.

## Where the sponsors sit

| Piece | In this build |
| --- | --- |
| Sustainability | The impact page. Household food kept, landfill CO2e, money. The caveat is part of the product. |
| Actually Intelligent | Meal rank updates from clocks and claims. The coach answers substitutions, heat, and amounts for the step you are on. |
| Gemini | `POST /api/vision` sends a receipt or fridge photo and expects structured JSON. Samples and pasted receipt text run with no key. |
| ElevenLabs | `POST /api/speech` uses Turbo when the key can speak. If it cannot, the same route speaks with Jenny, a neural voice installed by `npm install`, so localhost matches this preview. The Mac `say` voice is only a backup. |
| Spacetime | The live room. `spacetimedb/` is the module: offer, claim, and host (plus the shelf, the script, and recipe runs) are reducers on `bursley-floor-3`. Open screens subscribe, so a claim lands everywhere when the reducer commits. With no URI, the booth hosts that same room in the server and pushes it over a live stream. Items under 24 hours are broadcast when they are logged. Neighbor posts arrive on a timer. |
| Tiger Data | With `TIGER_DATABASE_URL`, `waste_events` is a hypertable and the Impact page queries `impact_daily`, a real-time continuous aggregate. `npm run db:tiger` applies `schema/tiger.sql`. With no URL, the same rollup runs in local Postgres. |
| Neon | With `NEON_DATABASE_URL`, `users`, `ingredients`, `rescue_posts`, and `recipe_history` are written through `@neondatabase/serverless`. `npm run db:neon` applies `schema/neon.sql`. With no URL, the shelf stays in the local snapshot. |
| Voice and plating | The coach is the voice surface (Grok Voice or ElevenLabs can speak the same lines). Each meal has a plating note and a graphic plate, the slot an image model fills. |

## Tracks this is aimed at

Sustainability, Actually Intelligent, Spacetime, ElevenLabs, Gemini, Tiger Data, Neon, and a quiet cream-and-teal kitchen for the design prize. One kitchen, not nine separate demos.

## Scripts

- `npm run dev` — dev server on port 4317
- `npm run lint` — eslint
- `npm run build` — production build
- `npm run db:neon` — apply `schema/neon.sql` using `NEON_DATABASE_URL`
- `npm run db:tiger` — apply `schema/tiger.sql` using `TIGER_DATABASE_URL`
