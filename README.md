# TAKK

A responsive static landing for a two-minute competitive keep-away game.

## Preview

From this directory, run `python3 -m http.server 4173 --directory dist`, then open http://localhost:4173. The checked-in `dist/` is ready to serve without installing dependencies. Keep the entire folder, including its generated GPU chunk and local assets, together.

To edit effects: run `npm ci`, `npm run check`, then `npm run build`. The pinned lockfile installs `vgpu` 0.5.0 and esbuild. The build bundles `src/motion.js`, `src/gpu.js` and both `src/energy.wgsl` / `src/rush.wgsl` into local ES modules; no CDN runtime is used.

## Behavior

Play buttons open an accessible native dialog for nickname and color selection. Identity is stored on the current device when browser storage is available. The next screen offers **OPEN GAME**, opening https://tekk-1.onrender.com/ in a new tab. It labels the endpoint as the current race prototype and explains that Core Rush is in development. Nickname and color remain local; the game assigns its own identity. No query parameters, shared authentication or lobby membership are implied. The landing supports keyboard navigation, mobile layouts and reduced-motion preferences.

## Integration boundaries

- `dist/index.html`: landing sections and player-entry views; links for game rules and the future Passport.
- `dist/styles.css`: responsive identity, controls, focus states and motion preferences.
- `dist/app.js`: entry controller and guarded `playerStore` adapter. Replace the local adapter with session-backed identity while keeping validation and honest connection states.
- Lobby: call a real lobby service after entry, show join progress and errors, and transition only after the server confirms membership.
- Gameplay: the `#open-game` anchor is the current external launch point. Agree an identity/session contract with the game team before sending nickname/color, joining a room or embedding the client; keep arena state out of the landing controller.
- Leaderboard and Passport: use dedicated read adapters for verified results; add loading, empty and unavailable states instead of mock competitive history.
- Monad: add a settlement adapter for signed match results after the gameplay backend exists. No wallet, transaction or onchain claim is implemented here.

## Verification

JavaScript syntax can be checked with `node --check dist/app.js`. Functional checks should cover empty/invalid nicknames, keyboard dialog close and focus return, storage restrictions, mobile overflow and reduced motion. No project test runner or configured TDD mode was supplied.

Verified locally: 320/390/768/1440px layouts without horizontal overflow; loaded Core; invalid nickname rejection; saved identity restoration; edit; Escape and focus return; reduced-motion; restricted-storage fallback; no browser JavaScript errors. The external game launch is connected. Shared identity/lobby, Passport data, ranking and Monad are not connected.

Visual revision: panoramic arena hero, asymmetric Core Rush explanation, original Buenos Aires arena concept and contrasting Passport. Arena art illustrates a direction; it is not a screenshot of developed multiplayer. Other named cities are concepts to imagine, not playable maps. Assets are local under `dist/assets/`.

## Core Rush and neon motion

Section 01 is a cinematic interactive concept: an editorial title, a faceted rotating Core, projected tactical grid, four animated chase routes and a brief steal shockwave. The accessible **STEAL THE CORE** button cycles cyan, pink, lime and violet carriers and updates a real-text status using `aria-live`. This illustrates the keep-away mechanic; it is not a live game, countdown or ranking. Controls and copy stay stationary. Without motion or WebGPU, original arena/Core art remains complete and the same button still changes the carrier and explanatory status.

The hero has a stronger localized reactor/ripple field, with pointer response restricted to the arena side. Passport hover tilt and Core float, arena scan and CTA light sweep enhance existing elements. One GPU context, two prewarmed surfaces and one shared 30 fps loop render only the visible active scenes. Hero width is capped at 1280 physical pixels and Core Rush at 960. A 3.9 kB entry module defers the roughly 153 kB GPU chunk until a scene is visible on a fine-pointer desktop with WebGPU. Build removes stale generated GPU chunks only.

Motion on/off remembers the choice where storage is available. System reduced-motion takes precedence and updates live. Mobile/coarse pointers retain static art. Page hiding and offscreen visibility suspend the appropriate passes. GPU initialization, rendering failure or device loss leave the complete fallback. No GPU profiling claim is made: these are explicit rendering bounds for a visual prototype.

For browser QA inspect `data-motion-state` on the root; `data-gpu-state`, `data-render-state` and `data-frame-count` on both canvases; and `data-carrier`, `data-steals`, `data-render-state` on `.rush-stage`. Check separate scene visibility, persisted pause, keyboard steal, no-GPU/static steal, and the existing nickname dialog. `npm run check` validates JavaScript and both WGSL modules; `npm run build` regenerates the deferred bundles. TDD remains unconfigured; ordinary functional checks apply. Device loss and live system preference changes need browser verification before being claimed as exercised.

## Vercel deployment

Use **the repository root** as the Vercel project root, or run the Vercel CLI from this directory. `vercel.json` selects the Other preset, installs the lockfile with `npm ci`, runs `npm run build` and serves `dist`. HTML, CSS, app controller and assets are already in `dist`; the build regenerates only the motion bundles. Do not configure the workspace root as the deploy root.

`.vercelignore` excludes local dependencies, linkage and scratch/archive files; `.gitignore` keeps `.vercel/` account/project linkage out of Git. Source, lockfile and `dist/assets` must remain included. No environment variables are required for the external game link.

Production is published at [takk-landing.vercel.app](https://takk-landing.vercel.app/), project `jehp23s-projects/takk-landing`, using the explicitly authorized local Vercel CLI session. Deployment `dpl_ErUadfMA8hbriozVgcxJNFAMcYph` reached READY. Public HTML, scripts, CSS, shader bundle and images return HTTP 200 and match local dist. Browser verified GPU rendering and PLAY → READY UP → OPEN GAME opening the Render prototype. The next integration is a verified game-side contract for shared nickname/color and lobby state; this deployment passes no identity parameters.

Configuration references: [Vercel static configuration](https://vercel.com/docs/project-configuration/vercel-json), [build configuration](https://vercel.com/docs/builds/configure-a-build), [deployment exclusions](https://vercel.com/docs/deployments/vercel-ignore).
