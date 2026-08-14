# Aksora — Design Direction

## Identity

Aksora is a QA / test-management tool for teams: friendly and approachable, not a cold enterprise product and not a bare-bones developer tool. It should feel professional enough to trust with real project data, while staying warm enough that people don't dread opening it every day.

## Color

- Primary accent stays blue `#2563eb`, already established across the app.
- The accent is disciplined: used at key moments only (primary actions, active states, one focal highlight per screen), not spread across every button, icon, and border.
- Neutral base (white / gray scale) carries most of the surface; blue marks what matters.

## Typography

- Inter (already wired in `app/layout.tsx`). Kept because it is highly legible on data-dense dashboard screens and stays neutral rather than pulling attention from the content.

## Dials

- **ENERGY: 2 (Balanced-bold)** — reference: Stripe, Vercel, leaning toward the bolder end of that range. The design should have real visual presence: confident type scale, a clear focal point per screen, deliberate use of the accent color, not just a quiet grid of gray boxes.
- **RHYTHM: 3 (Varied)** — section compositions should visibly differ from each other (a hero-style stat block, a chart-led section, a list-led section, an asymmetric split) rather than repeating the same centered-title-plus-grid pattern everywhere.
- **MOTION: 2 (Balanced)** — purposeful transitions and entrance motion (e.g. content fading/sliding in once on load, smooth state transitions) are welcome. Still no perpetual loops or decoration-only animation; motion should guide attention, not run forever.

## What this means in practice

- This is a deliberately bigger visual step up from a bare-minimum "remove the slop" pass: distinct visual hierarchy per section, confident type sizing for key numbers/headlines, and the blue accent used more expressively at genuine focal points (not spread everywhere, but bolder where it does appear).
- Section compositions must be visibly different from one another (per RHYTHM 3) — no repeating the same card-grid treatment for every section.
- Motion is allowed and encouraged for entrances/transitions (per MOTION 2), as long as it resolves (nothing loops forever) and serves a real hierarchy/attention purpose.
- Still governed by antislop's Hard Gate: no fabricated stats/testimonials, no fake urgency, no dead links or non-functional controls, real accessibility (contrast, keyboard, focus) regardless of how bold the visual gets.
