# Sketch-Mon ✏️

One Pokémon. One minute. No peeking. A complete React + TypeScript + Vite single-page game with Tailwind CSS v4 and a responsive lavender-and-paper visual theme.

## Run locally

Use Node.js **22.6 or newer** (Node 24 recommended).

```sh
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173). You need internet access for PokéAPI data and official image hosts. There are no environment variables, API keys, server, or database to configure.

```sh
npm test          # 10 dependency-free Node tests
npm run build    # TypeScript check and optimized Vite build
npm run preview  # Serve the production dist/ folder
```

Deploy the generated `dist/` folder to a static host such as Netlify, Vercel, Cloudflare Pages, or GitHub Pages. Build command: `npm run build`; output directory: `dist`. Relative asset paths support subdirectory hosting. Share links retain the deployed path. Serve over HTTPS for clipboard access; a selectable text fallback is provided if clipboard access fails. Do not open index.html directly as a local file.

## Application structure

```text
sketch-mon/
├── index.html                     Document metadata and React entry point
├── package.json                   Dependencies and commands
├── tsconfig.json                  Strict TypeScript configuration
├── vite.config.ts                 React and Tailwind v4 build plugins
├── public/favicon.svg             Original pencil icon
├── src/
│   ├── main.tsx                   React root
│   ├── App.tsx                    Game lifecycle, UI, timer, results, sharing
│   ├── api.ts                     PokéAPI requests, cache, pool normalization
│   ├── game.ts                    Deterministic daily seed, selection, verdict
│   ├── styles.css                 Tailwind import, custom responsive styling
│   └── components/
│       ├── DrawingPad.tsx          Pointer-based HTML5 canvas and tools
│       └── Doodles.tsx             Decorative landing illustration
└── tests/
    ├── api.test.ts                 Mocked API success, errors and caching
    └── game.test.ts                Selection, countdown, links and verdicts
```

## Game state and lifecycle

`setup → loading → drawing → reveal → setup`

- **Setup:** Random mode starts with Gen 1 selected. Select individual generations or toggle all nine; starting with an empty selection is disabled. Daily mode uses all nine generations, independent of the random selection. Shared challenges show a dedicated setup panel.
- **Loading:** Random mode fetches `GET /generation/{id}` for each selected generation, combines the returned species IDs, deduplicates them, and selects uniformly from the complete pool. It then fetches `GET /pokemon/{id}` for the name, types and artwork URLs. Errors return to setup with a retry message. The round does not begin while data is loading.
- **Drawing:** Only the name and types of the target are rendered. Artwork is not mounted or requested until the reveal. The timer uses an absolute `Date.now()` deadline, not a decrementing interval, and rechecks on tab visibility changes. The canvas independently checks the deadline before each stroke or tool mutation.
- **Reveal:** A phase ref prevents double submissions when timer expiry and the submit button coincide. The canvas exports a white-backed PNG and ink coverage statistics, then unmounts. The resulting image is immutable. Official artwork, Pokémon HOME art, and the default sprite are tried in order. If all fail, the result keeps the user's drawing and shows an artwork placeholder.

Requests are aborted on unmount; there is a 15-second request timeout. Successful API responses are cached for the browser session. Failures are not cached. No unrelated/offline Pokémon is silently substituted if the selected target cannot load.

## Drawing implementation

A fixed 1000 × 1000 transparent canvas scales visually with CSS. Pointer coordinates are mapped back to the backing resolution, so resizing does not erase or stretch stored strokes. Pointer capture lets strokes continue when the pointer moves outside the pad. `touch-action: none` prevents drawing gestures from scrolling the canvas area; the rest of the page still scrolls.

Tools include a nine-color palette, native custom color picker, 3–50 px brush, round caps and joins, an eraser using `destination-out`, clear, and up to 20 undo snapshots. Clear is undoable. Secondary pointers are ignored to avoid accidental multitouch strokes. The snapshot is composited onto white in a separate canvas, allowing a clean PNG download without incorporating remote artwork or tainting the canvas.

## Daily challenge and viral sharing

The daily seed is a stable FNV-1a hash of `sketch-mon-v1:YYYY-MM-DD`, mapped to National Pokédex IDs 1–1025 (the completed Gen 1–9 set). It uses UTC, so all players get the same target for a given date; reload or start a new challenge after midnight UTC for the new day. This intentionally pins the roster and hash version so old daily links keep working. Random pools are obtained dynamically from PokéAPI's generation endpoints.

- `?daily=2026-11-09` opens that date's shared daily challenge.
- `?pokemon=25` opens the same target as a friend's random round.
- Invalid links fall back to normal setup.
- Shared targets are not revealed until the user starts the round.
- Copy scorecard includes the Pokémon, playful stars, time taken, verdict and a challenge link.
- Save drawing downloads a PNG of the user's drawing.

The app is client-only: daily mode is an honor-system drawing challenge, not a secure competition. There is no login, leaderboard, server-side attempt enforcement, analytics, or drawing upload. Refreshing resets an in-progress round. The name and types are available in the downloaded API response; this is not an anti-cheat system.

## Verdicts are jokes, not measured accuracy

The requested mock evaluation is implemented honestly as a **just-for-fun creativity rating**. It measures non-white ink coverage only. Blank, minimal, heavily filled and ordinary drawings receive different lighthearted canned comments and 0–4 stars. It does not compare silhouettes or colors with the official image and does not call an AI service. The UI and copied scorecard explicitly identify the rating as playful.

For genuine model evaluation later, add a server endpoint that accepts the PNG and target identity, keeps API credentials on the server, rate-limits requests and clearly explains image uploads to players. Avoid placing model API keys in a Vite client bundle.

## Styling and accessibility

Tailwind v4 is integrated through `@tailwindcss/vite` and `@import "tailwindcss"`; layout utility classes are combined with custom component styles in `styles.css`. No runtime Tailwind CDN or font CDN is required. The visual design includes a hand-drawn hero, selectable generation tiles, brush palette, countdown progress bar, side-by-side reveal and Oak's verdict panel.

Native checkboxes and buttons, explicit tool labels, visible keyboard focus, phase-heading focus, error/status announcements, reduced-motion support and narrow-screen layouts are included. Drawing itself requires a pointing device; this is not a keyboard-only accessible drawing editor.

## Validation performed

**Passed: 10 Node tests**, including 5,000 deterministic daily-date bounds checks inside the daily-selection test. API tests use mocked fetch responses and do not depend on external uptime.

**Not verified in the authoring environment:** npm installation, TypeScript build and rendered browser interactions. The package registry returned HTTP 403 due to the environment's network restrictions. No production-build or visual-QA success is claimed. Run `npm install`, `npm run build` and the following browser checks before publishing. No lockfile is included because dependency installation could not complete; commit the generated `package-lock.json` after successful installation.

Browser checklist:

1. Select only Gen 2 and start a round; confirm a Johto species and no target artwork before reveal.
2. Draw with mouse and touch; change colors and size; erase, undo and clear; resize the viewport without losing ink.
3. Submit early; verify the time, unchanged drawing, official art and downloadable PNG.
4. Let the timer expire, including after backgrounding the tab for over 60 seconds; confirm no further drawing is possible.
5. Test all-generation and empty selections, daily mode and both shared-link formats.
6. Block API requests: verify the error and retry. Block image requests: verify artwork fallbacks and the placeholder.
7. Deny clipboard permission: verify the manual-copy textarea.
8. Check 375 px mobile and desktop widths, keyboard focus and reduced-motion settings.

## Data and credits

API reference: https://pokeapi.co/docs/v2

Pokémon and character names are trademarks of Nintendo, Game Freak, and Creatures. This is an unofficial fan-made project and is not affiliated with those organizations. Data and official artwork are supplied through PokéAPI. The decorative landing doodle is separate from the randomly chosen round target. Icon components come from Lucide.
