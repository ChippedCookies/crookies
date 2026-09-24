import { PAYHIP_URL_PATTERN, type ProductData } from './product-schema';

export interface ProductEntry {
  id: string;
  data: ProductData;
}

export interface Product extends ProductData {
  slug: string;
  payhipId: string | null;
}

export function parsePayhipId(url: string | null | undefined): string | null {
  if (!url) return null;
  return PAYHIP_URL_PATTERN.exec(url)?.[1] ?? null;
}

export function prepareCatalog(entries: ProductEntry[]): Product[] {
  return entries
    .filter((entry) => entry.data.status === 'live')
    .map((entry) => ({ ...entry.data, slug: entry.id, payhipId: parsePayhipId(entry.data.payhipUrl) }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
}

const priceFormat = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });

export function formatPrice(price: number): string {
  return Number.isInteger(price) ? priceFormat.format(price).replace(/\.00$/, '') : priceFormat.format(price);
}
