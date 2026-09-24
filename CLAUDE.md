# CLAUDE.md

## Project Overview

**crookies** is a digital-product store for short-form video creators and editors. It is a one-page, animated landing site. The product catalog is a section on that page, and every product has a Payhip "Buy" button that opens Payhip's checkout overlay. Payhip handles payment, tax and file delivery; this repo is only the storefront.

Products at launch:
- **MOGRTs**: Premiere Pro motion graphics templates for short-form video (captions, text and transitions packs).
- **Templates**: Client Onboarding & Revision Tracker (Notion or Google Sheets), Brand-Deal Tracker (pitch emails, deliverables and payment tracker, rate card), and the Editor Invoice & Contract Kit.
- **Later**: AI tools for short-form video. This is a separate subproject with its own plan; for now it is only a "coming soon" card and a waitlist signup.

Primary users are short-form video editors and creators who want to buy a ready-made asset and use it the same day. Some are freelancers who need business templates, some are creators who need motion graphics.

The product optimizes for:
- **A look that sells the product.** The site should feel like editing software or a motion-design brand: dark, animated, dynamic. The site itself shows off what the MOGRTs can do.
- **Fast pages.** It is a static site. Lighthouse Performance and Accessibility must both be 90 or higher. Animation must never block content from rendering.
- **Low-friction checkout.** Buying takes one click and happens on the page, in Payhip's overlay. If the Payhip script fails to load, the button's `href` still goes to the Payhip product page.
- **Honest listings.** Show real previews of the actual product. Never invent reviews, sales counts, testimonials or "X people bought this" figures. If a product isn't on Payhip yet, it says "Coming soon".
- **Legal clarity.** Contract templates are not legal advice. This is stated on the product card, in the FAQ and in the footer.

Key constraints:
- **The storefront is fully static.** The only server-side code is the Keystatic admin panel (`/keystatic` and its API routes), which runs in a Cloudflare Worker.
- **Payhip is the source of truth** for prices, checkout and delivery.
- **Products are added through the admin panel.** The owner is not a developer, so adding a product must only ever mean going to `/keystatic` → "New product" → fill in the form → Save. Each product is stored as one YAML file in `src/content/products/`.
- **Payhip can't sync products to the site.** Its API has no product endpoints or product webhooks as of 2026-09. Every product is added in both places: first in Payhip, then in `/keystatic`.

## Tech Stack

- Astro (static output) with TypeScript in strict mode (`strict: true`) and no implicit `any`
- `.astro` components with scoped CSS. Design tokens are CSS custom properties in `src/styles/tokens.css`. No CSS framework and no CSS-in-JS.
- Animation: CSS keyframes and transitions, plus a small IntersectionObserver script for scroll reveals. GSAP is used only for the hero timeline. All motion respects `prefers-reduced-motion`.
- Client-side JS: small vanilla TypeScript modules in `src/scripts/`. No UI framework (React, Vue, Svelte) until a feature actually needs one.
- Payhip embed script (`https://payhip.com/payhip.js`) with `payhip-buy-button` anchors
- Keystatic (`@keystatic/core` + `@keystatic/astro`) as the admin panel, in GitHub mode. It requires the `@astrojs/react` and `@astrojs/markdoc` integrations, which are used by the admin panel only.
- Astro content collections (`src/content.config.ts`, glob loader and Zod schema) to read the product files at build time
- `@astrojs/cloudflare` adapter (Cloudflare Workers with static assets). Every storefront page is prerendered; only Keystatic's routes run on demand.
- Vitest for unit tests (data validation and filter logic) and Playwright for the end-to-end smoke tests
- npm. Hosted on Cloudflare (Workers Builds, deployed from GitHub). Local runtime check: `npm run build && npx wrangler dev -c dist/server/wrangler.json`.

Do NOT use:
- Tailwind or other CSS frameworks; tokens and scoped CSS are enough
- jQuery
- A UI framework for storefront sections. React is installed only because Keystatic needs it; never use it in storefront components.
- Heavy animation libraries beyond GSAP (no Three.js or Lottie without discussion)
- `any` outside justified escape hatches
- A Payhip integration other than the official embed script
- Hardcoded product data in components (it belongs in `src/content/products/`)
- Inline styles that duplicate values already in `tokens.css`
- Autoplaying video with sound

## Architecture

Single Astro project. See [ARCHITECTURE.md](ARCHITECTURE.md) for data flow, the Payhip integration, the admin panel and failure modes.

- `src/pages/index.astro`: the landing page, which assembles the sections in order.
- `src/layouts/Base.astro`: `<head>`, fonts, meta and Open Graph tags, JSON-LD, the Payhip script and the global token import.
- `src/components/`: page sections and UI:
  - Sections: `Nav`, `Hero`, `Marquee`, `Catalog`, `HowItWorks`, `FAQ`, `EmailSignup`, `Footer`
  - Catalog pieces: `ProductCard`, `BuyButton`
- `src/content/products/<slug>.yaml`: the catalog, the single source of truth. There is one file per product, written by Keystatic.
- `keystatic.config.ts`: the admin form, meaning the product fields, their validation and where uploaded media goes. It must stay in sync with the content schema.
- `src/content.config.ts`: the Astro content collection and Zod schema that load and validate the product files at build time. Drafts are filtered out here.
- `src/lib/products.ts`: `getProducts()` (sorted, drafts excluded). Pages get product data only through it and pass it to components as props.
- `src/lib/catalog.ts`: the pure logic behind it (`prepareCatalog`, `parsePayhipId`, `formatPrice`), with no Astro imports so it can be unit tested.
- `src/lib/product-schema.ts`: the Zod schema plus the constants shared with `keystatic.config.ts` (categories, formats, badges, Payhip link pattern, video size limit).
- `src/site.ts`: site settings (URL, Payhip store link, waitlist form endpoint).
- `src/scripts/`: client behavior:
  - `reveal.ts`: scroll reveals
  - `filter.ts`: category filter DOM wiring; the pure logic is in `filter-logic.ts`
  - `hero.ts`: GSAP scroll effect on the hero. The intro animation is CSS only.
  - `preview-video.ts`: plays product previews while they're in view
  - `signup.ts`: waitlist form states
- `src/styles/tokens.css`: colors, type scale, spacing, radii, glows and motion durations. `global.css` holds the reset and base styles.
- `public/`: favicon, OG image and product preview media. Keystatic uploads previews to `public/previews/<slug>/`.
- `tests/`: Vitest unit tests (`tests/unit/`) and Playwright end-to-end tests (`tests/e2e/`).

## Model Selection
- Evaluate task complexity before writing code.
- If a task is a large architectural change or complex planning, explicitly ask the user to switch to a reasoning model (e.g. opus for higher quality, or sonnet).
- If a task is a simple bug fix, routine refactor, or test writing, explicitly suggest switching to a faster model (e.g. sonnet for relatively simple tasks and haiku for very simple ones).


Rules:

* NEVER commit `.env` files or secrets under any circumstances. See the `.env.local` note under Commands.
* All PRs must pass `npm run verify` (typecheck, lint and test) before being marked ready.
* IMPORTANT: run `npm run typecheck` after every code change, not just once before finishing the task.
* Any async call that can fail (network requests, form submissions, dynamic imports) must use try/catch with typed error handling. See Error handling under Coding Conventions.
* Components are `.astro` components or plain TypeScript functions. No class-based components.
* Prefix commit messages with `feat:`, `fix:`, `docs:`, `refactor:`, or `chore:`.

Where new things go:

* New page section → `src/components/<SectionName>.astro`, added to `src/pages/index.astro`
* New reusable UI piece (button, badge, card) → `src/components/`
* New product, or connecting a product to Payhip → through `/keystatic` (paste the Payhip link into the product form). When Claude adds one on request, write the YAML file in `src/content/products/` in exactly the shape Keystatic produces. Never hardcode products in markup.
* New product field → `keystatic.config.ts` **and** `src/content.config.ts` in the same change. The schema-sync test fails if they drift apart.
* New product category → the category select in `keystatic.config.ts`, the enum in `src/content.config.ts`, and a filter tab in `Catalog.astro`
* New client-side behavior → `src/scripts/<name>.ts`, imported by the component that needs it
* New design token (color, spacing, type size, motion duration) → `src/styles/tokens.css`
* New preview media → `public/previews/<product-slug>.<ext>`
* New page (e.g. `/shop`, product pages, legal pages) → `src/pages/`. Discuss first, because v1 is intentionally one page.
* AI tools code → not in this repo yet. It gets its own design and plan first.

## Coding Conventions

TypeScript: strict mode everywhere. Prefer `interface` for object shapes that may be extended and `type` for unions and aliases. No `any`: use `unknown` and narrow, or a named escape-hatch type with a comment explaining why.

Component patterns:
- Keep components presentational. Product data comes in through props from `getProducts()`, not from component-level fetches or direct `getCollection` calls.
- Keep client JS out of components where possible. Put it in `src/scripts/` and hook onto `data-*` attributes rather than class names.

Naming conventions:
- `PascalCase` for components and types
- `camelCase` for functions and variables
- `kebab-case` for non-component files, folders and product slugs
- Component files are named after the component (`ProductCard.astro`).

Async patterns: use `async`/`await` rather than `.then` chains. Lazy-load heavy code (GSAP, preview videos) so it doesn't block first paint.

Error handling:
- Everything must degrade gracefully. If the Payhip script is missing, buy links still work as plain links. If a video fails, the poster image shows. If JS is disabled, all content and products are still visible and linkable.
- Never show a raw error string to the user. Use the error format in Content Guidelines below.
- Never swallow an error silently (no empty `catch` blocks).

Comments: default to none. Add a comment only when the *why* isn't obvious from the code, such as a non-obvious constraint, a workaround for a Payhip or browser quirk, or a subtle invariant. Don't restate what the code already says.

## UI and Design Rules

Component defaults: build from the internal components and `tokens.css`. Don't add one-off styling that bypasses tokens for color, spacing, type or motion.

Spacing system: a 4px base unit scale (4, 8, 12, 16, 24, 32, 48, 64...), defined once in `tokens.css`. No hardcoded pixel values in component styles.

Visual style:
- Background: near-black (`#0A0A0C`) with subtle film grain and slowly moving gradient glows.
- Accent: one loud accent color plus one cool secondary glow, both tokenized so either can be swapped in one line.
- Type: a bold display face for headlines and Inter for body text.
- Motion: kinetic typography, reveal on scroll, glowing hover states. Product previews play muted on hover or when scrolled into view.
- The motion should feel like a motion-graphics reel, never like a slow corporate fade.

Motion rules:
- Animate only `transform` and `opacity` (and `filter` sparingly) so animation stays on the GPU.
- Keep durations and easings as tokens.
- Under `prefers-reduced-motion`, disable non-essential motion and show all content in its final state.

Required interaction states:
- Every actionable control has hover, focus-visible, pressed and disabled states.
- Buy buttons have an explicit "Coming soon" disabled state when there is no `payhipId`.
- The catalog handles an empty filter result explicitly.
- Forms show inline pending, success and error feedback.

Layout: mobile-first, with a 16px side gutter at phone width and no horizontal page scroll. Test at 375px and at desktop width.

Accessibility baseline:
- WCAG 2.1 AA contrast, including accent text on the dark background
- Minimum 44×44px touch targets and visible keyboard focus
- Every interactive element has an accessible label, and every image and poster has alt text
- Videos are muted and never the only way information is conveyed

## Content Guidelines

Voice and tone: creator to creator. Confident, punchy and brief, like a friend who edits for a living. Speak to the outcome ("Captions that keep people watching") rather than the feature list. A little attitude fits the brand, but clarity always beats cleverness.

Headline style: short, concrete, sentence case (not Title Case). Lead with what the buyer gets or does ("Edit faster with drag-and-drop captions", not "Product Features").

Error message format: say what happened in plain language, then the one thing the user can do next. Never show error codes or internal terms (e.g. "Checkout didn't load. Try again, or open it on Payhip." not "payhip.js failed: undefined").

Worked examples:
- **Product not yet on Payhip**: "Coming soon". Not a fake price, not "Sold out", and not a dead button that looks active.
- **Contract template disclaimer**: "Templates only, not legal advice. Have a lawyer review contracts before you use them." It appears on the card, in the FAQ and in the footer.
- **Signup success**: "You're on the list. We'll email you when the AI tools drop." Say what happened and what comes next.

Phrases to avoid:
- "oops", "uh oh" and other faux-casual filler
- Invented social proof ("thousands of creators trust us") or fake scarcity ("only 3 left!")
- Guarantees about results ("go viral guaranteed")
- Legal assurances ("legally binding", "lawyer-approved") unless they are actually true and verified

## Testing and Quality

Before a task is complete:

* Typecheck: `npm run typecheck`
* Lint: `npm run lint`
* Test: `npm test`
* Build: `npm run build`

What to test:

* Catalog data integrity:
  - Every product file passes the content schema and has a unique slug and a valid category.
  - Every product's preview file exists and is 8 MB or smaller.
  - `payhipUrl`, when set, parses to a Payhip ID.
  - Every contract product has `legalDisclaimer: true`, and no `ai` product has a Payhip link.
* Schema sync: the field names and required flags in `keystatic.config.ts` match `src/content.config.ts`.
* `parsePayhipId`: accepts `payhip.com/b/<id>` links (with or without `https://` and query strings) and rejects anything else. `getProducts` excludes drafts and sorts by `order`.
* Filter logic: category filtering, the empty state, and URL-hash sync and restore.
* BuyButton branching: a product with a `payhipId` renders a Payhip anchor with the correct `href` and `data-product`, and a product without one renders a disabled "Coming soon".
* End-to-end smoke tests (Playwright):
  - The page loads.
  - The filter tabs work.
  - Buy links point to Payhip.
  - Reduced-motion mode shows all content.
  - The page has no horizontal scroll at 375px.

Don't test:

* Third-party internals (Payhip checkout, GSAP, Astro rendering). Trust their own test suites.
* Pure styling or animation output, or static copy text.
* Trivial pass-through code with no logic.

## File Placement Rules

Follow the "Where new things go" mapping under Architecture above. When a file doesn't obviously belong somewhere, colocate it with its primary caller rather than creating a new shared location speculatively.

Rules for creating new abstractions:
* Don't extract a component, helper or script until the same code is needed in two or more places. Duplicating it once is fine.
* Don't add a dependency when a few lines of TypeScript or CSS will do. Every new dependency needs a reason stated in the PR or commit.
* Don't add configuration or options for cases that don't exist yet. Build for the current catalog, not for hypothetical future products.

## Safety Rules

DO NOT change without explicit instruction:

* Anything outside this repo (`/Users/bj/Documents/onlinestore`). No editing global config, dotfiles, or files in other projects or directories.
* `.env.local` and any other file holding secrets or API keys. Read from them if needed; never overwrite or regenerate them.
* Real Payhip links and prices in `src/content/products/`. Don't change or remove them unless asked, because a wrong link sends buyers to the wrong product. Product files are the owner's content, so don't rewrite their copy unprompted.
* The `storage` settings in `keystatic.config.ts` (repo owner and name). Changing them disconnects the admin panel.
* Legal or disclaimer copy. Don't weaken or remove it.

## Commands

This is a single **npm + Astro** project. Never guess a command (no `pnpm ...`, `yarn ...`). Use exactly these, from the repo root:

* Install: `npm install`
* Dev server: `npm run dev`
* Build: `npm run build`
* Preview the production build: `npm run preview`
* Lint: `npm run lint`
* Lint and autofix: `npm run lint:fix`
* Typecheck: `npm run typecheck` (runs `astro check`)
* Test (unit): `npm test`
* Test (single file): `npm test -- path/to/file`
* Test (end to end): `npm run test:e2e`. It builds, serves on port 4322 and runs desktop and mobile. The first time, run `npx playwright install chromium`.
* Verify (typecheck, lint and test; required before a PR is ready): `npm run verify`

* Admin panel (local): `npm run dev`, then open `http://localhost:4321/keystatic`. Dev runs without the Cloudflare adapter on purpose; see ARCHITECTURE.md §5. Locally, changes are written straight to files; on the live site they are committed to GitHub.

A task is not complete until typecheck, lint, build and the relevant test command all pass. See Testing and Quality above.

API keys are stored in `.env.local`. This includes Keystatic's GitHub App credentials: `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET`, `KEYSTATIC_SECRET` and `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`. Keystatic's setup writes them to `.env`, so move them to `.env.local`. In Cloudflare, the first three are Worker secrets (read at runtime through `astro:env`). `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` is inlined when the site is built, so it must be a **build variable** instead. Wrangler's local runtime reads them from `.dev.vars`, which is gitignored like `.env.local`.
