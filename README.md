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
| `GEMINI_API_KEY` | Camera and photo upload on Scan. Model defaults to `gemini-2.5-flash`. |
| `ELEVENLABS_API_KEY` | The voice chef speaks with ElevenLabs Flash instead of the browser voice. |
| `ELEVENLABS_VOICE_ID` | Optional. Defaults to Rachel (`21m00Tcm4TlvDq8ikWAM`). |

The sidebar says which path is live.

## Ninety-second demo

1. **Kitchen.** Three or more clocks are under 24 hours. Tonight’s cook is already picked from whatever dies first.
2. **Start hands-free** on the shakshuka. Tap Start so the browser is allowed to talk. Say “next”, or press Space. Ask “what if I don’t have feta?”
3. **Rescue.** Claim Sam’s bananas. Within about a minute, Jordan, Mina, Alex, and Sam post on their own. Host the 9:15 skillet.
4. **Impact.** Today’s bar starts empty. After a claim or a logged meal, it grows. The three headlines are food kept, landfill methane avoided, and money kept.
5. **Scan.** Read the Lucky Market receipt (or paste the text). Add it. The chicken thighs show up on the shelf with a 36-hour clock, and Cook re-ranks.

Reset the demo kitchen from the sidebar between rehearsals. If you leave and come back after the clocks have died, they shift forward so the opening scene is still urgent. Cooked meals stay cooked.

## What the numbers mean

Eating groceries you already bought does not undo the farm. EcoBite does not take credit for that.

- **Food kept** and **money kept** are the groceries that were cooked or claimed instead of tossed.
- **Landfill methane avoided** uses 0.58 kg CO2e per kg of food, in the range of EPA WARM for landfilled food.
- Farm CO2e and water are shown underneath as footprint you put to use, following the order of magnitude in Poore & Nemecek (2018) and Mekonnen & Hoekstra (2011). They are not “saved.”

`schema.sql` is the Neon + Tiger Data shape: users and ingredients in Postgres, a `waste_events` hypertable, and a continuous aggregate that matches the chart query on the Impact page. The booth computes that rollup in the browser so the demo does not depend on a database.

## Where the sponsors sit

| Piece | In this build |
| --- | --- |
| Sustainability | The impact page. Household food kept, landfill CO2e, money. The caveat is part of the product. |
| Actually Intelligent | Meal rank updates from clocks and claims. The coach answers substitutions, heat, and amounts for the step you are on. |
| Gemini | `POST /api/vision` sends a receipt or fridge photo and expects structured JSON. Samples and pasted receipt text run with no key. |
| ElevenLabs | `POST /api/speech` uses Flash (`eleven_flash_v2_5`) for the coach. The browser voice is the fallback, and the lines are written to be spoken. |
| Spacetime | Offer, claim, and host are the room reducers for `bursley-floor-3`. The booth runs them locally so a claim is instant with nothing to provision. Neighbor posts arrive on a timer so the room feels live. |
| Tiger Data | `waste_events` hypertable and `impact_daily` continuous aggregate in `schema.sql`. The chart is that query. |
| Neon | `users`, `ingredients`, and `rescue_posts` in the same file. Profiles, shelf, recipe history. |
| Voice and plating | The coach is the voice surface (Grok Voice or ElevenLabs can speak the same lines). Each meal has a plating note and a graphic plate, the slot an image model fills. |

## Tracks this is aimed at

Sustainability, Actually Intelligent, Spacetime, ElevenLabs, Gemini, Tiger Data, Neon, and the dark dashboard for the design prize. One kitchen, not nine separate demos.

## Scripts

- `npm run dev` — dev server on port 4317
- `npm run lint` — eslint
- `npm run build` — production build
