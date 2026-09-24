import { CATEGORIES } from '../lib/product-schema';

export const FILTERS = ['all', ...CATEGORIES] as const;
export type Filter = (typeof FILTERS)[number];

function isFilter(value: string): value is Filter {
  return (FILTERS as readonly string[]).includes(value);
}

export function parseShopHash(hash: string): Filter {
  const value = /^#shop=([a-z]+)$/.exec(hash)?.[1];
  return value && isFilter(value) ? value : 'all';
}

export function serializeShopHash(filter: Filter): string {
  return filter === 'all' ? '#shop' : `#shop=${filter}`;
}

export function isVisible(category: string, filter: Filter): boolean {
  return filter === 'all' || category === filter;
}
