# EcoBite — How It Works

**One line:** EcoBite is a real-time kitchen companion for a dorm floor. Scan the food that's about to go bad, cook it with a hands-free voice chef, and post the rest to a live floor board before it hits the trash.

**What it is:** A Next.js web app. It runs in any browser (laptop or phone), and its built-in server talks to Gemini, ElevenLabs, SpacetimeDB, Neon, and Tiger Data.

---

## The five screens

**1. Scan (`/scan`)**
Add food by typing a list, uploading a receipt or fridge photo, or using a sample. **Gemini** reads photos, even food with no label. Printed receipts can also be read on the laptop with no key. Each item gets an expiration estimate, and anything with less than 24 hours left is posted to the floor board automatically.

**2. Kitchen (home)**
Your shelf, with a live countdown on every item. EcoBite ranks meals by what expires first and picks tonight's cook for you.

**3. Cook (`/cook`)**
The recipe book plus a hands-free voice chef. Say "next" or press Space to go to the next step, and ask questions like "what if I don't have feta?" **ElevenLabs** speaks the chef's lines, and a backup voice takes over if it's unavailable.

**4. Rescue (`/rescue`)**
A live shared board for the floor (Bursley, floor 3). Post food you won't finish, claim a neighbor's, or host a shared meal. **SpacetimeDB** keeps every open screen in sync, so a claim on one phone shows up on the others right away. Scripted neighbors (Jordan, Mina, Alex, Sam) post on their own so the demo feels alive.

**5. Impact (`/impact`)**
Charts of food logged versus wasted, CO2 avoided, water saved, and money saved. **Tiger Data** stores every action as a time-series event and adds them up by day.

**Sidebar:** Shows which services are live, plus the dark mode toggle and a button that resets the demo kitchen.

---

## How the pieces connect

Every action (log, cook, claim, or toss) does three things at once:

| What happens | Where it goes |
| --- | --- |
| Your shelf, profile, and recipe history update | **Neon** (hosted Postgres) |
| Everyone on the floor sees the change live | **SpacetimeDB** (real-time shared room) |
| An event is recorded for the Impact page | **Tiger Data** (`waste_events` table, rolled up daily) |

Any service without a key falls back to a local version on the laptop, so the demo always runs.

---

## How the Impact numbers are calculated

- **Logged vs. wasted:** grams of food that entered the kitchen versus grams that were thrown out.
- **CO2 avoided:** 0.58 kg CO2e per kg of food cooked or claimed instead of landfilled, within the range of the EPA's WARM model.
- **Water saved:** the water footprint of that same food, based on Mekonnen & Hoekstra (2011).
- **Money saved:** the grocery price of food that was cooked or claimed instead of thrown out.

---

## Sponsor tracks

| Track | What it uses in EcoBite |
| --- | --- |
| Sustainability | The Impact page: food saved, CO2, water, money |
| Actually Intelligent (AI) | Meals ranked by expiration, a voice coach that knows which step you're on |
| Best Use of Spacetime | The live rescue board (offer, claim, and host) |
| Best Use of Neon | Profiles, shelf, rescue history, and recipe history |
| [MLH] Tiger Data | The `waste_events` table and its daily rollup |
| ElevenLabs (sponsor + MLH) | The voice chef |
| [MLH] Gemini API | Reading fridge and receipt photos |
| Best Design (Figma) | The cream-and-teal interface (add your mockups to Figma) |

---

## 3-minute demo script

*Setup:* Two windows side by side (laptop + phone is best). Reset the kitchen from the sidebar. Have a fridge photo ready.

**0:00–0:20 — The problem**
"On a dorm floor, food goes bad in the fridge while the person next door is hungry. EcoBite gives your floor one shared kitchen, so food gets cooked or claimed instead of thrown out." Point at the sidebar: Gemini, ElevenLabs, Spacetime, Neon, and Tiger are all live.

**0:20–0:50 — Scan (Gemini)**
Upload the fridge photo. "Gemini reads the food even when there's no label." Each item gets an expiration estimate. Log it. "The cooked rice has less than 24 hours left, so it's already on the floor board."

**0:50–1:10 — Kitchen (AI)**
Show the live countdowns. "Tonight's meal is picked from whatever expires first, and the ranking changes as clocks run down and neighbors claim things."

**1:10–1:50 — Cook hands-free (ElevenLabs)**
Start the shakshuka and tap Start. Say "next" to go to the next step. Ask "what if I don't have feta?" and let the chef answer. "Your hands are messy, so the coach is voice-first, and the ElevenLabs voice knows which step you're on."

**1:50–2:30 — Rescue (Spacetime + Neon)**
Claim Sam's bananas in window one, and it shows up in window two right away. "That's SpacetimeDB. Every phone on the floor shares one live room." Host the 9:15 skillet. Wait for a neighbor to post. "Profiles, the shelf, and rescue history are saved in Neon."

**2:30–2:50 — Impact (Tiger Data)**
Open Impact. "Every log, cook, claim, and toss is an event in Tiger Data. Here's what's been saved: food, CO2, water, and money."

**2:50–3:00 — Close**
"EcoBite turns 'this is about to go bad' into dinner or a neighbor's snack. Every claim is food that didn't hit the landfill."

*Backup:* If Wi-Fi drops, every service falls back to a local version, so the demo keeps running. Just don't point at the sidebar.

---

## Running it locally

```bash
git checkout main && git pull
npm install
npm run dev     # http://127.0.0.1:4317
```

To turn on the live services, add your keys to `.env.local` (git never commits it, so share it privately). See the README for each service's setup steps.
