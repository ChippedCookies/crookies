# crookies

The storefront for crookies: a one-page, animated shop for short-form video editors and creators. Products are sold through Payhip; this site shows the catalog and opens Payhip's checkout when someone clicks **Buy**.

- How it's built: [ARCHITECTURE.md](ARCHITECTURE.md)
- Rules for working on the code: [CLAUDE.md](CLAUDE.md)

## Adding a product

You do this in two places: Payhip (where the product is sold) and the admin panel (where it's shown on the site).

1. **In Payhip:** create the product, upload the files, set the price and publish it. Then copy the product's link (it looks like `https://payhip.com/b/AbC12`).
2. **Open the admin panel:** go to `https://<your-site>/keystatic` and sign in with GitHub.
3. Click **Products → Add** and fill in the form:
   - **Name** and **Category**
   - **Payhip link:** paste the link from step 1. Leave it empty to show "Coming soon".
   - **Price:** the same price as in Payhip. It's only for display; Payhip charges its own price.
   - **Tagline**, **What's included**, and **Works with**
   - **Preview image** (required) and **Preview video** (optional: MP4 or WebM, 8 MB max, short and muted)
   - **Preview description:** a sentence describing the preview for screen readers
   - **Status:** set it to **Live** to show the product, or keep it on **Draft** to hide it
4. Click **Create**. The site updates in about a minute.

**To edit or hide a product:** open it in the admin panel, change it (or set Status to **Draft**), and click **Save**.

**If a product doesn't show up:** the site checks every product before publishing. If something is wrong (for example a missing image or a video over 8 MB), the update is stopped and the live site stays as it was. Cloudflare shows the reason in the build log.

## First-time setup

You only do this once.

1. **Put the project on GitHub.** Create a private repository (for example `crookies`) and push this folder to it.
2. **Point the admin panel at that repository.** In `keystatic.config.ts`, set `GITHUB_OWNER` to your GitHub username and `GITHUB_REPO` to the repository name.
3. **Deploy to Cloudflare.** In the Cloudflare dashboard, go to **Workers & Pages → Create → Import a repository** and pick the repository. Use:
   - Build command: `npm run build`
   - Deploy command: `npx wrangler deploy`
4. **Connect the admin panel to GitHub.** Keystatic's app-creation setup only runs on your computer:
   - Run `PUBLIC_KEYSTATIC_STORAGE=github npm run dev` and open `http://127.0.0.1:4321/keystatic/setup`.
   - Enter your live site URL as **Deployed App URL**, click **Create GitHub App**, finish on GitHub, and install the app on the repository.
   - Keystatic writes four values to `.env`. Rename that file to `.env.local`, and never commit it.
   - In Cloudflare, open the Worker's **Settings**:
     - Under **Variables and Secrets**, add `KEYSTATIC_GITHUB_CLIENT_ID`, `KEYSTATIC_GITHUB_CLIENT_SECRET` and `KEYSTATIC_SECRET` as **Secrets**.
     - Under **Build → Variables and secrets**, add `PUBLIC_KEYSTATIC_GITHUB_APP_SLUG`. It must be a build variable because it's baked in at build time.
     - Redeploy.
5. **Turn on build-failure emails.** In Cloudflare, go to **Notifications** so you hear about a failed update.
6. **Fill in the site settings** in `src/site.ts`:
   - `url`: your real domain
   - `payhipStoreUrl`: your Payhip store link. This shows a "See everything on Payhip" button.
   - `waitlistFormAction`: the form link from your email tool. This turns on the AI waitlist form.

   Also set `site` in `astro.config.mjs` to your real domain.

## Working on the code

Requires Node.js 22.12 or newer.

```sh
npm install
npm run dev          # site at http://localhost:4321, admin at http://localhost:4321/keystatic
```

When you run it on your computer, the admin panel saves straight to the files in `src/content/products/`, with no login.

| Command | What it does |
|---|---|
| `npm run build` | Builds the site for Cloudflare |
| `npm run preview` | Serves the built site locally |
| `npm run typecheck` | Type-checks everything |
| `npm run lint` | Lints everything |
| `npm test` | Unit tests (product data, Payhip links, filter, buy button) |
| `npm run test:e2e` | Browser tests on desktop and mobile (first run: `npx playwright install chromium`) |
| `npm run verify` | Typecheck, lint and unit tests; must pass before merging |
