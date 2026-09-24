import { z } from 'astro/zod';

export const CATEGORIES = ['mogrt', 'template', 'ai'] as const;
export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  mogrt: 'MOGRTs',
  template: 'Templates',
  ai: 'AI tools',
};

export const BADGES = ['none', 'new', 'bestseller', 'bundle'] as const;
export type Badge = (typeof BADGES)[number];

export const BADGE_LABELS: Record<Exclude<Badge, 'none'>, string> = {
  new: 'New',
  bestseller: 'Bestseller',
  bundle: 'Bundle',
};

export const FORMATS = [
  'premiere-pro',
  'after-effects',
  'notion',
  'google-sheets',
  'google-docs',
  'pdf',
  'canva',
] as const;
export type Format = (typeof FORMATS)[number];

export const FORMAT_LABELS: Record<Format, string> = {
  'premiere-pro': 'Premiere Pro .mogrt',
  'after-effects': 'After Effects',
  notion: 'Notion',
  'google-sheets': 'Google Sheets',
  'google-docs': 'Google Docs',
  pdf: 'PDF',
  canva: 'Canva',
};

// Capture group 1 is the Payhip product ID. Shared by the admin form and the build so both accept the same links.
export const PAYHIP_URL_PATTERN = /^\s*(?:https?:\/\/)?(?:www\.)?payhip\.com\/b\/([A-Za-z0-9]+)\/?(?:\?\S*)?\s*$/;

export const MAX_VIDEO_BYTES = 8 * 1024 * 1024;

export const productSchema = z.object({
  name: z.string().min(1),
  status: z.enum(['draft', 'live']),
  category: z.enum(CATEGORIES),
  payhipUrl: z.string().regex(PAYHIP_URL_PATTERN).or(z.literal('')).default(''),
  price: z.number().nonnegative().nullable().default(null),
  tagline: z.string().min(1).max(90),
  bullets: z.array(z.string().min(1)).min(1).max(6),
  formats: z.array(z.enum(FORMATS)).default([]),
  previewVideo: z.string().nullable().default(null),
  previewImage: z.string().min(1),
  previewAlt: z.string().min(1),
  badge: z.enum(BADGES).default('none'),
  legalDisclaimer: z.boolean().default(false),
  order: z.number().int().default(100),
});

export type ProductData = z.output<typeof productSchema>;
