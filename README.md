# EcoBite

Real-time kitchen companion for a dorm floor. Scan what is about to turn, cook it with a hands-free voice coach, and put the rest on a live neighborhood board before it hits the trash.

The demo is set in Bursley, floor 3 — North Campus, a short walk from the MHacks venue. You are Kavitha. The shelf is already in trouble.

## Run it

```bash
npm install
npm run dev
```

Open [http://127.0.0.1:4317](http://127.0.0.1:4317).

Booth mode needs no API keys. Copy `.env.example` to `.env.local` and fill in keys when you want live Gemini vision and ElevenLabs speech.

| Variable | What it turns on |
| --- | --- |
| `GEMINI_API_KEY` | Sees food in a photo even when nothing is printed. Printed receipts are read without this key. Model defaults to `gemini-2.5-flash`. |
| `ELEVENLABS_API_KEY` | The voice chef speaks with ElevenLabs Flash instead of the browser voice. |
| `ELEVENLABS_VOICE_ID` | Optional. Defaults to Rachel (`21m00Tcm4TlvDq8ikWAM`). |

The sidebar says which path is live.

## Ninety-second demo

1. **Scan.** List what’s left (or read the receipt / fridge sample, or upload a photo if Gemini is keyed). Each line gets an expiration estimate. Log it. Cooked rice is under 24 hours, so it shows up on the floor by itself.
2. **Kitchen.** The shelf clocks are live. Tonight’s cook is already picked from whatever dies first.
3. **Start hands-free** on the shakshuka. Tap Start so the browser is allowed to talk. Say “next”, or press Space. Ask “what if I don’t have feta?” ElevenLabs speaks when `ELEVENLABS_API_KEY` is set.
4. **Rescue.** Your under-24-hour food is already broadcast. Claim Sam’s bananas — a second screen on the same server sees the claim immediately. Within about a minute, Jordan, Mina, Alex, and Sam post on their own. Host the 9:15 skillet.
5. **Impact.** Postgres rolls `waste_events` into logged versus wasted, carbon avoided, water saved, and money preserved. Today’s bar fills when you log, cook, claim, or toss.

Reset the demo kitchen from the sidebar between rehearsals. If you leave and come back after the clocks have died, they shift forward so the opening scene is still urgent. Cooked meals stay cooked.

## What the numbers mean

The Impact page reads Postgres. Every log, cook, claim, and toss is a `waste_events` row, and the chart is the daily `GROUP BY`.

- **Logged versus wasted** is grams that entered the kitchen against grams that were tossed.
- **Carbon emissions avoided** uses 0.58 kg CO2e per kg of food that was cooked or claimed instead of landfilled, in the range of EPA WARM.
- **Water saved** is the water footprint of that same food, following Mekonnen & Hoekstra (2011).
- **Money preserved** is the grocery price of food that was cooked or claimed instead of tossed.

`schema.sql` is the Tiger Data shape: a `waste_events` hypertable and an `impact_daily` continuous aggregate. The booth runs the same tables in local Postgres so the page works with no hosted database.

## Where the sponsors sit

| Piece | In this build |
| --- | --- |
| Sustainability | The impact page. Household food kept, landfill CO2e, money. The caveat is part of the product. |
| Actually Intelligent | Meal rank updates from clocks and claims. The coach answers substitutions, heat, and amounts for the step you are on. |
| Gemini | `POST /api/vision` sends a receipt or fridge photo and expects structured JSON. Samples and pasted receipt text run with no key. |
| ElevenLabs | `POST /api/speech` uses Flash (`eleven_flash_v2_5`) for the coach. The browser voice is the fallback, and the lines are written to be spoken. |
| Spacetime | Offer, claim, and host are the room reducers for `bursley-floor-3`. The booth hosts that room in the server and pushes it over a live stream, so a claim updates every open screen at once. Items under 24 hours are broadcast when they are logged. Neighbor posts arrive on a timer. |
| Tiger Data | `waste_events` is a real Postgres table the Impact page queries. `schema.sql` is the Tiger Data hypertable and continuous aggregate for the same rollup. |
| Neon | `users`, `ingredients`, and `rescue_posts` in the same file. Profiles, shelf, recipe history. |
| Voice and plating | The coach is the voice surface (Grok Voice or ElevenLabs can speak the same lines). Each meal has a plating note and a graphic plate, the slot an image model fills. |

## Tracks this is aimed at

Sustainability, Actually Intelligent, Spacetime, ElevenLabs, Gemini, Tiger Data, Neon, and the dark dashboard for the design prize. One kitchen, not nine separate demos.

## Scripts

- `npm run dev` — dev server on port 4317
- `npm run lint` — eslint
- `npm run build` — production build
