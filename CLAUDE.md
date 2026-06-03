@AGENTS.md

# Castlewave App — Project Intelligence

## What This Is
A guest-facing web app for an upcoming Miami event. Out-of-town guests use it to discover and navigate curated hotels, restaurants, and experiences — all tied to the event schedule and location. The map is the core UI.

## Tech Stack
- **Framework:** Next.js (React)
- **Map:** Mapbox GL JS (vanilla, no react-map-gl wrapper)
- **Database:** Airtable
- **Hosting:** Vercel
- **Repo:** amadeusten/castlewave-app

## Architecture Notes
- Airtable is the CMS — venue/partner data lives there, not hardcoded
- Mapbox renders all location pins dynamically from Airtable records
- All map markers should be filterable by category (hotel, restaurant, experience, event venue)
- Event venue location is the anchor point all directions route to

## Key Features
- Interactive Mapbox map populated from Airtable
- Per-venue detail cards (category, offer, distance to event)
- "Route me to the event" CTA — triggers directions from user's current location to main venue
- "Where is this relative to the event?" — per-listing proximity view
- Schedule-aware UI (surface time-relevant CTAs based on event timing)

## Development Phases
- **Phase 1:** Configure all tools and verify end-to-end data flow (Airtable → Next.js → Mapbox → Vercel) ✓
- **Phase 2:** Branding, content, and visual refinement (current)
- **Phase 3:** Richer experience features (schedule integration, notifications, etc.)

## Conventions
- Use TypeScript
- Components in `/components`, page routes in `/app`
- Airtable API calls server-side only (Next.js API routes or server components)
- Mapbox token via `NEXT_PUBLIC_MAPBOX_TOKEN` env var
- Airtable credentials via `AIRTABLE_API_KEY` and `AIRTABLE_PERSONAL_ACCESS_TOKEN` and `AIRTABLE_BASE_ID` env vars (never client-side)
- Keep `.env.local` out of git

## Design Tokens (from Figma — V1)

### Colors
- Background dark: `#191b25`
- Background darker: `#131417`
- Hero gradient: `linear-gradient(to top, #191b25 27%, #131417 91%)`
- Button background: `#191b25`
- Button text: `#ffffff`
- Body background: `#ffffff`
- Section text (light sections): `#000000`

### Typography
- **Display / Headings:** Miedinger Bold (licensed) — used for event title, date, section headers
- **Buttons / UI Labels:** Open Sauce One Bold (Google Fonts) — uppercase, letter-spacing 1px
- Heading sizes: 48px base, responsive scale down on mobile

### Buttons
- Rounded corners: `6px`
- Height: `75px` desktop
- Min-width: `279px` desktop
- Uppercase, Bold, tracked (`letter-spacing: 1px`)
- Three primary CTAs: `WHAT TO PLAN FOR` / `RSVP` / `WHERE TO STAY`

### Layout
- Single page — no navigation away from main view
- Hero: full-width dark gradient, centered content
- Below hero: three CTA buttons centered, equal width
- Map section: "THE AREA" heading, full-width map container
- Max content width: ~1375px centered

## UI / UX Principles

**Layout**
- Single page experience — users never feel like they've left the main view
- Map is the primary surface; everything else is contextual on top of it
- Components expand to fill the screen when interacted with; they don't navigate away

**Interactions**
- All forms trigger as lightbox popovers (fast fade in)
- On form completion: brief confirmation message → fade out → return to main page
- Hover states: fast fade in only, no elaborate transitions
- Animations: minimal and intentional — if it doesn't serve the user, remove it

**Visual**
- Dark, modern, event-forward aesthetic
- Heavy use of Tailwind utilities — stay within Tailwind where possible
- Overrides: colors, fonts, and heading scale per design tokens above
- Lightly rounded corners (6px), minimal shadows
- Mobile first — most guests on phones

## Tone
Guests are being taken care of. The UI should feel effortless, warm, and considered — like a great concierge, not a booking engine.

## Current Status
- Phase 1 complete — Vercel deployed, env vars set
- Phase 2 in progress — rebuilding page.tsx against V1 Figma design
- Venue TBD — use Wynwood coordinates as placeholder (`lng: -80.1993, lat: 25.8026`)
- Event date placeholder: August 15, 2026
