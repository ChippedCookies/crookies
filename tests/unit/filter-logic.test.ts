import { describe, expect, it } from 'vitest';
import { isVisible, parseShopHash, serializeShopHash } from '../../src/scripts/filter-logic';

describe('parseShopHash', () => {
  it.each([
    ['', 'all'],
    ['#shop', 'all'],
    ['#shop=mogrt', 'mogrt'],
    ['#shop=template', 'template'],
    ['#shop=ai', 'ai'],
    ['#shop=all', 'all'],
    ['#shop=nonsense', 'all'],
    ['#faq', 'all'],
  ])('%s → %s', (hash, filter) => {
    expect(parseShopHash(hash)).toBe(filter);
  });
});

describe('serializeShopHash', () => {
  it('round-trips every filter', () => {
    for (const filter of ['all', 'mogrt', 'template', 'ai'] as const) {
      expect(parseShopHash(serializeShopHash(filter))).toBe(filter);
    }
  });

  it('uses the plain #shop anchor for all', () => {
    expect(serializeShopHash('all')).toBe('#shop');
  });
});

describe('isVisible', () => {
  it('shows everything under all', () => {
    expect(isVisible('ai', 'all')).toBe(true);
  });

  it('shows only matching categories otherwise', () => {
    expect(isVisible('mogrt', 'mogrt')).toBe(true);
    expect(isVisible('template', 'mogrt')).toBe(false);
  });
});
