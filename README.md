# वंश वृक्ष — Vansh Vriksh

**Find the relatives your family never wrote down.** A privacy-first family tree for Indian families: write the people you know, and वंश वृक्ष finds the same people in other families' trees — across spellings and scripts — and tells you exactly how you are related (मामा, चचेरा भाई, नानी…). Sign in with an **email OTP** or a **magic link**. The canvas shows **names only**; dates of birth stay private and are used only to recognise the same person across families.

## Finding relatives

| Way | What happens |
| --- | --- |
| **Automatic matching** | Every person you save is compared with every other family — names in any script and spelling, private dates, village, gotra, the names around them. Both families see the proposal. |
| **Find relatives** (`/find`) | Search all families by name, surname, village or gotra, in English or हिन्दी. "This is my relative" either links them to someone already in your tree or adds them to it (names and places copied, never dates) — their family is told and decides. |
| **Public teaser** | Signed-out visitors can type a surname or village on the landing page and see *counts only* — "3 remembered people in one family, mostly from Ajmer". |
| **Invite as a person** | Invite someone *as* a person in your tree. Their onboarding starts from what you wrote, and the two trees link the moment they join. |
| **Linked families** | Once a match is confirmed by both sides, their people appear on your tree (dashed cards), with every relation named from your point of view. |
| **How you're related** | Each match says what the other tree's writer is to you — "whoever wrote their tree is your मामा" before confirmation (term only), "Mahesh Tiwari is your मामा" after. |

### Search privacy rules

- Only trees that allow discovery are searched (Settings → *Let relatives find you*, on by default).
- **Remembered (departed)** people can be found by name, place and gotra.
- **Living** people appear only when the searcher already knows their birth year (±1). The year is checked against the private record and never echoed back. Searches are rate-limited.
- Around a result, remembered relatives are named; living ones are only counted.
- No search result, teaser or linked-family view ever carries a date or private note.

## What it does

- Sign up / sign in by email code or emailed link — no password
- Build your tree: parents, spouse, children, siblings, Hindi names, village, gotra
- **Whole-family canvas** — uncles, aunts, cousins, in-laws, second marriages and every generation are laid out together (couples side by side, children hanging from the marriage line, no overlaps). Pan, pinch/wheel zoom, fit, search, and "view the tree from here"
- **रिश्ता on every card** — the kinship term of each person from your point of view, in proper Hindi: दादा / नाना, चाचा / ताऊ / मामा / बुआ / मौसी, चचेरा / ममेरा / फुफेरा / मौसेरा भाई-बहन, ससुर / सास / जेठ / देवर / ननद / साला, पोता / नाती … elder / younger is read from the private dates and shown as "चाचा / ताऊ" when unknown
- Tree view never renders dates of birth
- Matching engine scores name variants, private dates, village, gotra, and shared relatives
- Match cards show names and overlapping kin — never the date
- Either family confirms or dismisses; both sides must agree before a link is marked confirmed
- **Linked family** — once both sides agree, each family sees the names written around that person in the other tree (parents, spouse, children — names only)
- **"Possible kin found" letter** to the other family when a new proposal appears (at most one a day per family, never with a date in it)
- **Your data is yours** — download the tree as GEDCOM 5.5.1 (opens in any genealogy program) or JSON; delete your account and tree in one step
- **Names in any script** — Devanagari is transliterated (with Hindi schwa deletion: कमला → kamlaa) and every spelling reduced to a phonetic key, so हरिशंकर, Harishankar and "Hari Shankar", or Laxmi and Lakshmi, meet in search and matching
- **Grow your tree** checklist (parents and all four grandparents — where most matches come from), a **list view** grouped by पितृ पक्ष / मातृ पक्ष / ससुराल, and one-tap invites for any living relative
- English + हिन्दी (with `<html lang>` following the chosen language), installable as a PWA
- Local letterbox so the app is fully usable without SMTP

## Quick start

```bash
npm install
npx prisma db push
npm run db:seed
npm run dev
```

Upgrading an existing database: `npx prisma db push && npm run db:backfill` (recomputes the phonetic search keys).

Open [http://localhost:3000](http://localhost:3000).

### Try it in 30 seconds

On the sign-in page, use **Walk a demo family**:

- **Priya Sharma** and **Arjun Sharma** are cousins — both trees hold the same grandparents (`Harishankar` / `Hari Shankar Sharma`, `Kamla` / `Kamala Devi`)
- **Mahesh Tiwari** is Priya's मामा — his tree holds Priya's mother Sunita and her departed parents
- As Priya: **Possible kin** shows "whoever wrote their tree is your मामा"; **Find relatives** → `Tiwari` or `रामप्रसाद` finds her नाना; confirm the Sunita match as both Priya and Mahesh, then tick **Linked families** on the tree

Or sign in with your own email. With `EMAIL_DELIVERY=local` (default), the verify screen’s **letterbox** shows the OTP and magic link.

## Auth

| Method | How |
| --- | --- |
| OTP | 6-digit code, 10 minutes, hashed at rest, attempt-limited |
| Magic link | one-time token, 20 minutes |
| Invite | 7-day magic link |

Production email: set `EMAIL_DELIVERY=resend` and `RESEND_API_KEY`.

## Privacy model

| Shown on the tree | Kept private | Used for matching |
| --- | --- | --- |
| Name, native name, gender, living/remembered, kinship term | Date of birth, date of death, notes | Date of birth, name, village, gotra, relatives |

- Exports (GEDCOM / JSON) are the owner's own copy and include their private dates; they are never sent to another family.
- The "kin found" letter names only the recipient's own person and links to the matches page.
- Account deletion removes the user, tree, people, relationships, matches, sign-in challenges and letterbox copies; the other family's tree keeps what they wrote.
- Security headers (`X-Frame-Options: DENY`, `nosniff`, referrer policy) are set on every response; sign-in requests are rate-limited per email and per IP.

## Deploy

### Docker

```bash
docker compose up --build
```

### Vercel / Node host

- Set `AUTH_SECRET` (32+ bytes)
- Run `npx prisma db push` after every pull (schema changes such as `User.kinNotifiedAt`)
- Point `DATABASE_URL` at Postgres if you move off SQLite (`provider` in `prisma/schema.prisma`)
- Set `APP_URL` to the public origin
- Set `EMAIL_DELIVERY=resend` and `RESEND_API_KEY`
- Set `ALLOW_DEMO=false` in production

```bash
npx prisma db push
npm run build
npm start
```

## Matching (short)

A pair is proposed when the score ≥ 58 after:

- Given-name similarity (Jaro–Winkler + Indian variants: Ram/Rama, Hari Shankar/Harishankar, …)
- Family name, village, gotra
- Exact or near date of birth (never displayed)
- Shared parent / spouse / child **names**
- Gender conflict or distant dates reject the pair

## Checks

```bash
npm run check      # typecheck + lint + unit tests
npm test           # matcher, names/transliteration, kinship, layout, family merge and GEDCOM fixtures
npm run test:e2e   # end-user use cases against a running server (VV_BASE, default :3010)
npm run test:layout
```

## Kinship

`src/lib/kinship.ts` walks the shortest blood-first path from you to a relative and reads the Hindi term off the path shape — father's side vs mother's side, son's line vs daughter's line, by marriage vs by blood, elder vs younger. Terms are honest about what is unknown ("चाचा / ताऊ" until a birth year says otherwise).

## Linked families

`src/lib/extended.ts` merges your tree with every tree you share a confirmed match with (one hop — their other links are theirs to share). A union-find joins the records a match says are one person, keeping your own record as the survivor so edits still work; every relationship either family wrote is re-pointed onto the merged graph and de-duplicated. Kinship and layout then run on the merged graph unchanged.

## Layout

`src/lib/tree-layout.ts` assigns generations by breadth-first search from the focus person, groups each person with their spouses into a block, orders blocks with barycenter sweeps to keep families together, then solves x-positions with a pool-adjacent-violators pass so children sit under their own parents' marriage line and nothing overlaps. Unconnected people get their own band below.

## Stack

Next.js 15 · TypeScript · Prisma · SQLite (swap to Postgres for multi-instance) · jose sessions
