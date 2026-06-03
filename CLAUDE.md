@AGENTS.md

# Castlewave App — Project Intelligence

## What This Is
A guest-facing web app for an upcoming Miami event. Out-of-town guests use it to discover and navigate curated hotels, restaurants, and experiences — all tied to the event schedule and location. The map is the core UI.

## Tech Stack
- **Framework:** Next.js (React)
- **Map:** Mapbox GL JS
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
- **Phase 1:** Configure all tools and verify end-to-end data flow (Airtable → Next.js → Mapbox → Vercel)
- **Phase 2:** Branding, content, and visual refinement
- **Phase 3:** Richer experience features (schedule integration, notifications, etc.)

## Conventions
- Use TypeScript
- Components in `/components`, page routes in `/app`
- Airtable API calls server-side only (Next.js API routes or server components)
- Mapbox token via `NEXT_PUBLIC_MAPBOX_TOKEN` env var
- Airtable credentials via `AIRTABLE_API_KEY` and `AIRTABLE_BASE_ID` env vars (never client-side)
- Keep `.env.local` out of git

## UI / UX Principles
These are directional and will be refined in Phase 2. Build to support them structurally now, don't over-invest in visual polish yet.

**Layout**
- Single page experience — users never feel like they've left the main view
- Map is the primary surface; everything else is contextual on top of it
- Components expand to fill the screen when interacted with; they don't navigate away

**Interactions**
- All forms trigger as lightbox popovers (fast fade in)
- On form completion: brief confirmation message → fade out → return to main page
- Hover states: fast fade in only, no elaborate transitions
- Animations: minimal and intentional — if it doesn't serve the user, remove it

**Visual Direction** *(placeholder — final decisions in Phase 2)*
- Clean, elegant, premium-but-warm aesthetic
- Serif + sans-serif font pairing
- Earthy, muted color palette
- Lightly rounded corners, minimal shadows
- Tailwind utility classes are a good baseline; expect overrides on colors, fonts, and heading scale

**Mobile First**
- Most guests will be on phones
- Every interaction completable in 1–2 taps
- Touch targets sized appropriately

## Tone
Guests are being taken care of. The UI should feel effortless, warm, and considered — like a great concierge, not a booking engine.

## Current Status
- Phase 1 in progress
- Vercel not yet configured
- Venue TBD — use Wynwood as placeholder coordinates until confirmed
