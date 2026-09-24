import { collection, config, fields } from '@keystatic/core';
import {
  BADGE_LABELS,
  CATEGORIES,
  CATEGORY_LABELS,
  FORMATS,
  FORMAT_LABELS,
  PAYHIP_URL_PATTERN,
} from './src/lib/product-schema';

// Set these to the GitHub repo that holds this project before deploying.
const GITHUB_OWNER = 'ChippedCookies';
const GITHUB_REPO = 'crookies';

// Keystatic applies the pattern even when the field is empty, so an empty link has to match too.
const payhipUrlOrEmpty = new RegExp(`^$|${PAYHIP_URL_PATTERN.source}`);

export default config({
  storage: import.meta.env.PROD
    ? { kind: 'github', repo: { owner: GITHUB_OWNER, name: GITHUB_REPO } }
    : { kind: 'local' },
  ui: {
    brand: { name: 'crookies' },
  },
  collections: {
    products: collection({
      label: 'Products',
      slugField: 'name',
      path: 'src/content/products/*',
      format: { data: 'yaml' },
      columns: ['category', 'status', 'order'],
      schema: {
        name: fields.slug({
          name: { label: 'Name', validation: { length: { min: 1 } } },
          slug: { label: 'File name', description: 'Used for the product file and preview folder. Set once; avoid changing it later.' },
        }),
        status: fields.select({
          label: 'Status',
          description: 'Drafts are saved but not shown on the site.',
          options: [
            { label: 'Draft', value: 'draft' },
            { label: 'Live', value: 'live' },
          ],
          defaultValue: 'draft',
        }),
        category: fields.select({
          label: 'Category',
          options: CATEGORIES.map((value) => ({ label: CATEGORY_LABELS[value], value })),
          defaultValue: 'mogrt',
        }),
        payhipUrl: fields.text({
          label: 'Payhip link',
          description: 'In Payhip, open the product and copy its link. Leave empty to show "Coming soon".',
          validation: {
            pattern: {
              regex: payhipUrlOrEmpty,
              message: 'Paste the product link from Payhip, like https://payhip.com/b/AbC12',
            },
          },
        }),
        price: fields.number({
          label: 'Price (USD)',
          description: 'Shown on the card only. Keep it the same as the price in Payhip.',
          validation: { min: 0 },
        }),
        tagline: fields.text({
          label: 'Tagline',
          description: 'One short line about what the buyer gets.',
          validation: { length: { min: 1, max: 90 } },
        }),
        bullets: fields.array(fields.text({ label: 'Point', validation: { length: { min: 1 } } }), {
          label: "What's included",
          itemLabel: (props) => props.value || 'New point',
          validation: { length: { min: 1, max: 6 } },
        }),
        formats: fields.multiselect({
          label: 'Works with',
          options: FORMATS.map((value) => ({ label: FORMAT_LABELS[value], value })),
        }),
        previewVideo: fields.file({
          label: 'Preview video',
          description: 'Optional. MP4 or WebM, 8 MB max, a short muted loop.',
          directory: 'public/previews',
          publicPath: '/previews/',
        }),
        previewImage: fields.image({
          label: 'Preview image',
          description: 'Required. Shown on the card, and before the video loads.',
          directory: 'public/previews',
          publicPath: '/previews/',
          validation: { isRequired: true },
        }),
        previewAlt: fields.text({
          label: 'Preview description',
          description: 'Describe the preview for people using screen readers.',
          validation: { length: { min: 1 } },
        }),
        badge: fields.select({
          label: 'Badge',
          options: [
            { label: 'None', value: 'none' },
            ...Object.entries(BADGE_LABELS).map(([value, label]) => ({ label, value })),
          ],
          defaultValue: 'none',
        }),
        legalDisclaimer: fields.checkbox({
          label: 'Show "not legal advice" note',
          description: 'Required for contract templates.',
        }),
        order: fields.integer({
          label: 'Sort order',
          description: 'Lower numbers show first.',
          defaultValue: 100,
          validation: { isRequired: true },
        }),
      },
    }),
  },
});
