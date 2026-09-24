# Architecture

How the crookies storefront is built and how its parts fit together. For working rules (commands, conventions, what not to touch), see [CLAUDE.md](CLAUDE.md).

## 1. System overview

crookies is a **one-page Astro site** with three parts:

- **Storefront.** Prerendered static HTML: the landing page with the catalog on it.
- **Admin panel.** Keystatic at `/keystatic`, where the owner adds and edits products through a form. It is the only part of the site that runs server code.
- **Payhip.** A hosted third-party service that handles everything involving money: payment, tax, file delivery, receipts and refunds.

There is no database. Products are YAML files in the git repo.

```
  OWNER                                                        BUYER
    │ 1. create product + upload files                           │
    ▼                                                             │
 ┌─────────┐                                                      │
 │ Payhip  │◀──────────────── 6. checkout overlay ────────────────┤
 └─────────┘                                                      │
    │ 2. copy product link                                        │
    ▼                                                             │
 ┌──────────────────────┐ 3. Save  ┌──────────┐ 4. push  ┌──────────────────┐
 │ /keystatic (admin)   │─commit──▶│  GitHub  │─deploy──▶│ Cloudflare build  │
 │ form: link, name,    │          │  repo    │          │ astro build       │
 │ price, preview…      │          └──────────┘          │ → static site     │
 └──────────────────────┘                                └────────┬─────────┘
                                                                  │ 5. live in ~1 min
                                                                  ▼
                                                        crookies site (static) ─┘
```

**Design principles**
- **Adding a product needs no code.** The owner only ever uses the `/keystatic` form.
- **One source of truth for the catalog.** Products exist only in `src/content/products/*.yaml`, and components render whatever is there.
- **Payhip owns the money.** The site never handles payment data or computes the final price. The price shown on the site is for display; Payhip's price is what the buyer pays.
- **HTML first.** Every product and buy link is in the prerendered HTML. JavaScript adds filtering, animation and the checkout overlay on top.
- **Graceful degradation.** If a script, video or the Payhip embed fails, the page still works (see §8).

**Why products aren't synced from Payhip automatically.** As of 2026-09, Payhip's API only covers coupons and license keys. It has no product endpoints and no product webhooks, and its public pages sit behind Cloudflare bot protection, so reading them automatically isn't reliable. Every product is therefore entered twice: once in Payhip, once in the admin panel. See §13 for how to add syncing if Payhip ships a products API.

## 2. Directory layout

```
onlinestore/
├─ astro.config.mjs          integrations: react, markdoc, keystatic; adapter: cloudflare
├─ keystatic.config.ts       admin panel: product fields, validation, media paths, GitHub storage
├─ package.json              npm scripts (dev, build, typecheck, lint, test, verify)
├─ tsconfig.json             extends astro/tsconfigs/strict
├─ public/
│  ├─ favicon.svg, og-image.png
│  └─ previews/<slug>/       preview video + poster, uploaded by Keystatic
├─ src/
│  ├─ content.config.ts      "products" collection: glob loader + Zod schema
│  ├─ content/products/      <slug>.yaml, one per product (written by Keystatic)
│  ├─ lib/product-schema.ts  Zod schema + shared constants (categories, formats, Payhip link pattern)
│  ├─ lib/catalog.ts         pure logic: parsePayhipId(), prepareCatalog(), formatPrice()
│  ├─ lib/products.ts        getProducts(): loads the collection and runs prepareCatalog()
│  ├─ site.ts                site settings: URL, Payhip store link, waitlist form endpoint
│  ├─ pages/index.astro      assembles sections in order
│  ├─ layouts/Base.astro     <head>, meta/OG, JSON-LD, fonts, payhip.js, global CSS
│  ├─ components/
│  │  ├─ Nav.astro  Hero.astro  Marquee.astro  Catalog.astro
│  │  ├─ ProductCard.astro  BuyButton.astro
│  │  └─ HowItWorks.astro  FAQ.astro  EmailSignup.astro  Footer.astro
│  ├─ scripts/               reveal.ts  filter.ts (+ filter-logic.ts)  hero.ts  preview-video.ts  signup.ts
│  └─ styles/                tokens.css  global.css
└─ tests/
   ├─ unit/                  Vitest: content integrity, schema sync, catalog logic, filter logic, BuyButton
   └─ e2e/                   Playwright: smoke flows
```

The `/keystatic` routes are added by the `@keystatic/astro` integration, so the repo has no page files for them.

## 3. Page composition

`index.astro` renders these sections from top to bottom inside `Base.astro`. Each section is its own component with an `id` that the nav links to.

| Order | Component | Anchor | Purpose | Client JS |
|---|---|---|---|---|
| 1 | `Nav` | — | Logo and anchor links (Shop, How it works, FAQ) | none |
| 2 | `Hero` | `#top` | Kinetic headline, animated background, CTA to `#shop` | `hero.ts` (GSAP, lazy) |
| 3 | `Marquee` | — | Infinite scrolling strip of product types | CSS only |
| 4 | `Catalog` | `#shop` | Filter tabs, product grid, "See everything on Payhip" link | `filter.ts` |
| 5 | `HowItWorks` | `#how` | Pick → pay on Payhip → instant download | `reveal.ts` |
| 6 | `FAQ` | `#faq` | Licensing, formats, refunds, legal disclaimer | native `<details>` |
| 7 | `EmailSignup` | `#waitlist` | Waitlist for the AI tools | inline form handler |
| 8 | `Footer` | — | Links, disclaimer, © | none |

`Catalog` calls `getProducts()` and renders one `ProductCard` per product. Each card renders a `BuyButton`.

The "See everything on Payhip" link goes to the Payhip storefront, so a product that's on Payhip but not yet added to the site can still be found.

## 4. Product content model

The same field list is defined in two places, and the schema-sync unit test keeps them identical:

- **`keystatic.config.ts`**: what the admin form shows and validates.
- **`src/content.config.ts`**: what the build accepts, as a Zod schema.

| Field | Form control | Required | Notes |
|---|---|---|---|
| `name` | text (slug field) | yes | The file name / `slug` is generated from it (kebab-case) |
| `status` | select: Draft / Live | yes, default Draft | Drafts are saved but never shown on the site |
| `category` | select: MOGRT / Template / AI tool | yes | |
| `payhipUrl` | text with a pattern check | no | Paste the Payhip product link, e.g. `https://payhip.com/b/AbC12`. Empty means "Coming soon". |
| `price` | number | no | Display only; must match Payhip. Empty means no price shown. |
| `tagline` | text | yes | One line, outcome-focused |
| `bullets` | list of text | yes, 1–6 | What's included |
| `formats` | multiselect | no | Premiere Pro .mogrt, Notion, Google Sheets, PDF, … |
| `previewVideo` | file upload (mp4/webm) | no | Saved to `public/previews/<slug>/`. 8 MB or smaller. |
| `previewImage` | image upload | yes | The poster for the video, or the main image. Saved to `public/previews/<slug>/`. |
| `previewAlt` | text | yes | Alt text for the preview |
| `badge` | select: none / New / Bestseller / Bundle | no | |
| `legalDisclaimer` | checkbox | no | Must be on for contract templates |
| `order` | integer | yes, default 100 | Lower numbers show first |

A saved product file looks like this:

```yaml
# src/content/products/caption-pack-vol-1.yaml
name: Caption Pack Vol. 1
status: live
category: mogrt
payhipUrl: https://payhip.com/b/AbC12
price: 19
tagline: Captions that keep people watching
bullets:
  - 40 animated caption styles
  - Drag-and-drop in Premiere Pro
formats: [Premiere Pro .mogrt]
previewVideo: /previews/caption-pack-vol-1/preview.mp4
previewImage: /previews/caption-pack-vol-1/poster.webp
previewAlt: Animated captions popping word by word over a talking-head clip
badge: New
legalDisclaimer: false
order: 10
```

**`src/lib/products.ts`** is the only way pages access product data:
- `getProducts()` loads the collection and passes it to `prepareCatalog()`.

The logic itself lives in **`src/lib/catalog.ts`**, which doesn't depend on Astro so it can be unit tested:
- `prepareCatalog()` drops drafts, sorts by `order` then `name`, and adds `slug` and `payhipId`.
- `parsePayhipId(url)` pulls `<id>` out of `payhip.com/b/<id>` links (with or without `https://`, `www.` or query strings). It returns `null` for anything else.

**`src/lib/product-schema.ts`** holds the Zod schema plus the constants the admin form and the site share: categories, badges, formats, the Payhip link pattern and the 8 MB video limit.

**Invariants.** The unit tests and the build enforce these:
- Every product file passes the Zod schema. A bad file fails the build, so it can never be deployed.
- Every slug is unique.
- Every preview path exists under `public/`, and every video is 8 MB or smaller.
- Every `payhipUrl` that is set parses to an ID.
- Every contract template has `legalDisclaimer: true`.
- No `ai` product has a `payhipUrl` in v1.

## 5. Admin panel (Keystatic)

**Setup**
- **Storage:** GitHub mode. `storage: { kind: 'github', repo: { owner, name } }` in `keystatic.config.ts`.
- **Login:** GitHub, through a Keystatic GitHub App. Only GitHub accounts with write access to the repo can edit.
- **Creating the GitHub App (one-time):** Keystatic only runs its app-creation flow in dev, and it writes the results to `.env`. Run `PUBLIC_KEYSTATIC_STORAGE=github npm run dev`, then open `/keystatic/setup` and enter the deployed URL so it's registered as an OAuth callback.
- **Secrets:** `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET` and `KEYSTATIC_SECRET` are read at runtime through `astro:env/server`'s `getSecret`, so in production they are Cloudflare Worker secrets. `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG` is inlined into the admin UI at build time, so it is a Cloudflare **build variable**. Locally, all four live in `.env.local`. None of them are ever committed.
- **Runtime:** `/keystatic` and `/api/keystatic/*` run on demand in a Cloudflare Worker through `@astrojs/cloudflare`. Every other page is prerendered and served as static assets. This setup was tested on 2026-09-24 in Cloudflare's local runtime: the admin UI loads, the GitHub login redirects correctly, and the OAuth callback reaches GitHub.
- **Local editing:** with `npm run dev`, `/keystatic` edits files on disk directly, with no login and no commit. Storage switches on `import.meta.env.PROD`: local in dev, GitHub in builds.
- **Dev runs without the Cloudflare adapter.** `astro.config.mjs` only adds the adapter for builds. In dev the adapter would run server code inside workerd, where Keystatic's local mode can't write to disk (it fails with `exports is not defined`). Builds and production use the adapter as normal.

**Adding a product (the owner's workflow)**
1. In Payhip: create the product, upload the files, set the price and publish it.
2. Copy the Payhip product link.
3. Go to `crookies.com/keystatic`, sign in with GitHub, open Products and click Create.
4. Fill in the form: name, category, paste the link, price, tagline and bullets. Upload the preview video and poster, and set the status to **Live**.
5. Click Save. Keystatic commits the YAML file and media to `main`, Cloudflare rebuilds, and the product is live in about a minute.

Editing or hiding a product works the same way: open it, change fields or set the status to Draft, and save.

**Guardrails**
- **Bad Payhip link:** the pattern check on `payhipUrl` rejects anything that isn't a `payhip.com/b/…` link and shows "Paste the product link from Payhip, like https://payhip.com/b/AbC12".
- **Anything else invalid** (a missing preview, an oversized video, a wrong field): the Cloudflare build fails and the live site stays on the previous version. Nothing half-broken is deployed. The failed build shows in the Cloudflare dashboard, and a build-failure email goes to the owner (turn this on under Cloudflare Notifications).

## 6. Payhip integration

**Embed.** `Base.astro` loads `https://payhip.com/payhip.js` with `defer`, once for the whole page.

**BuyButton output**

| Product state | Rendered HTML |
|---|---|
| Has a `payhipId` | `<a class="payhip-buy-button" href="https://payhip.com/b/{id}" data-product="{id}" data-theme="none">Buy — $X</a>` |
| No `payhipId` | `<button disabled aria-disabled="true">Coming soon</button>` |

**Checkout flow**
1. The user clicks Buy.
2. `payhip.js` catches the click and opens the checkout overlay on top of the page.
3. The buyer pays inside Payhip.
4. Payhip emails the receipt and download link, which also appear in the overlay.
5. If `payhip.js` isn't loaded, the anchor falls back to a normal link and the buyer checks out on Payhip's own product page.

**What lives in Payhip, not here:**
- Real prices, discounts and coupons
- Product files
- Tax/VAT
- Customer list
- Refunds
- License keys, if used later

**Keeping prices in sync:** after changing a price in Payhip, update it in `/keystatic` too. The site never claims its displayed price is authoritative.

## 7. Client-side behavior

All storefront scripts are small vanilla TypeScript modules. Astro bundles each one and loads it only on the page that uses it. Scripts find their elements through `data-*` attributes, not CSS classes. React exists in the project only for the Keystatic admin and never ships to storefront pages.

| Script | Hooks | Behavior |
|---|---|---|
| `filter.ts` | `[data-filter-tab]`, `[data-category]`, `[data-empty-state]` | Shows or hides cards by category. Writes `#shop=<category>` to the URL and restores it on load. Shows the empty state when no cards match. Without JS, all cards stay visible. |
| `reveal.ts` | `[data-reveal]` | An IntersectionObserver adds `is-visible` when an element scrolls into view. The hidden starting state only applies once JS has added `html.js`, so content is never hidden without JS. |
| `hero.ts` | `[data-hero]` | Dynamically imports GSAP after first paint, then runs the kinetic headline timeline. Skipped entirely under `prefers-reduced-motion`. |
| Preview video | `[data-preview-video]` | `muted playsinline loop preload="none"`. Plays on hover or when in view, pauses when out of view, and shows the poster if it fails. |

## 8. Failure modes and degradation

| Failure | Result |
|---|---|
| JS disabled or blocked | All sections and products render. The filter tabs do nothing and every card shows. Buy links go to the Payhip product pages. |
| `payhip.js` fails to load | Buy buttons act as plain links to Payhip. |
| GSAP import fails | The error is caught and logged, and the headline shows in its final state. |
| Video fails or is slow | The poster image stays visible. |
| Signup request fails | Inline message: "That didn't go through. Try again in a moment." The form keeps what was typed. |
| `prefers-reduced-motion` | Non-essential motion is off and all content shows in its final state. |
| Invalid product saved in the admin | The build fails and the previous version stays live. Cloudflare sends a build-failure notification. |
| Keystatic or its function is down | Only editing is affected. The storefront is static and keeps serving. |
| GitHub login misconfigured | `/keystatic` shows a sign-in error. The storefront is unaffected. |

## 9. Styling and motion system

**Design tokens.** `tokens.css` holds all design values as CSS custom properties on `:root`:
- **Color:** `--bg #0A0A0C`, `--surface`, `--text`, `--muted`, `--accent` (the one loud color), `--glow` (the cool secondary)
- **Spacing:** `--space-1` to `--space-16` on a 4px base
- **Type:** fluid `clamp()` sizes; a bold display face for headlines, Inter for body
- **Radius and shadows:** radii and the glow shadows
- **Motion:** `--dur-fast`, `--dur-base`, `--dur-slow` and named easings

`global.css` holds the reset, base typography, the film-grain overlay and a `prefers-reduced-motion` block that turns durations down to 0.

Components use scoped `<style>` blocks and reference tokens only. The Keystatic admin uses its own built-in styling, and none of it applies to the storefront.

**Motion budget**
- Animate only `transform`, `opacity`, and `filter` sparingly.
- There are no layout-affecting animations.
- The background gradient blobs are CSS-animated and GPU-composited.
- GSAP is the only animation library, and it is loaded lazily for the hero.

## 10. SEO and metadata

`Base.astro` sets:
- `<title>` and meta description
- Canonical URL
- Open Graph and Twitter card tags (`og-image.png`)
- JSON-LD: an `Organization` entry, plus one `Product` entry per live product that has a price and a `payhipId`

It never emits ratings or review markup, because there are no real reviews to mark up.

`/keystatic` is excluded from indexing with `robots.txt` and a `noindex` tag.

## 11. Build, hosting and deploy

- **Host:** Cloudflare Workers with static assets, built through Workers Builds connected to the GitHub repo. A push to `main` (including an admin-panel save) deploys to production, and other branches get preview URLs.
- **Why Cloudflare over Netlify:** the free plan has no traffic limit and allows 500 builds a month, and single files can be up to 25 MiB. Netlify's free plan pauses the whole site when its monthly credits run out, and every product save costs credits.
- **Build:** `npm run build` prerenders the storefront to static files. The adapter packages the Keystatic routes into the Worker (`dist/server/`), and static files go to `dist/client/`.
- **Secrets:** only the Keystatic GitHub App variables (§5), set as Worker secrets.
- **Domain and HTTPS:** configured in Cloudflare.

## 12. Testing

| Layer | Tool | Covers |
|---|---|---|
| Types | `astro check` | All `.astro` and `.ts` files, in strict mode |
| Unit | Vitest | Content invariants (§4); Keystatic ↔ Zod schema sync; `parsePayhipId`; `prepareCatalog` draft filtering and sort; filter logic (hash parse/serialize, category matching); BuyButton branching, rendered with Astro's container API. Vitest uses `getViteConfig(…, { configFile: false })` so the Cloudflare adapter isn't loaded. |
| E2E | Playwright | Desktop and 375px mobile: page loads with no JS errors; filter tabs and hash restore; buy controls are Payhip links or a disabled "Coming soon"; legal note on the contract kit; no horizontal scroll; reduced motion shows all content; without JS every product shows and the tabs are hidden |
| Quality | Lighthouse (manual or CI) | Performance and Accessibility ≥ 90 on the storefront |

`npm run verify` runs typecheck, lint and unit tests, and must pass before any PR is marked ready.

## 13. Future extension points

These are not built in v1. They are listed so today's structure doesn't block them.

- **Payhip product sync.** If Payhip adds a products API or product webhooks, add a sync step (a Cloudflare Cron Trigger or a GitHub Action). It would create Draft product files from Payhip data, leaving the owner to add the preview and set the status to Live. The content model doesn't change.
- **Multi-page catalog.** Add `src/pages/shop.astro` and `src/pages/products/[slug].astro`, both built from `getProducts()`. A long-description field in Keystatic, using Markdoc (already installed), would feed the product pages.
- **Email provider.** `EmailSignup` posts to a provider's hosted form endpoint (e.g. ConvertKit or Payhip's mailing list). If an API key is needed, add an on-demand Astro endpoint, since the adapter is already there.
- **AI tools.** This is a separate subproject with its own design. The likely shape is a separate app, linked from the `ai` category cards.
