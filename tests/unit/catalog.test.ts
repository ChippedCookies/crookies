import { describe, expect, it } from 'vitest';
import { formatPrice, parsePayhipId, prepareCatalog, type ProductEntry } from '../../src/lib/catalog';
import type { ProductData } from '../../src/lib/product-schema';

describe('parsePayhipId', () => {
  it.each([
    ['https://payhip.com/b/AbC12', 'AbC12'],
    ['http://payhip.com/b/AbC12', 'AbC12'],
    ['https://www.payhip.com/b/AbC12', 'AbC12'],
    ['payhip.com/b/AbC12', 'AbC12'],
    ['https://payhip.com/b/AbC12/', 'AbC12'],
    ['https://payhip.com/b/AbC12?utm_source=x', 'AbC12'],
    ['  https://payhip.com/b/AbC12  ', 'AbC12'],
  ])('accepts %s', (url, id) => {
    expect(parsePayhipId(url)).toBe(id);
  });

  it.each([
    [''],
    ['https://payhip.com/crookies'],
    ['https://payhip.com/b/'],
    ['https://evil.com/b/AbC12'],
    ['https://payhip.com.evil.com/b/AbC12'],
    ['https://payhip.com/b/AbC12/extra'],
    ['https://payhip.com/b/Ab-C12'],
  ])('rejects %s', (url) => {
    expect(parsePayhipId(url)).toBeNull();
  });

  it('treats missing values as no link', () => {
    expect(parsePayhipId(null)).toBeNull();
    expect(parsePayhipId(undefined)).toBeNull();
  });
});

function entry(id: string, overrides: Partial<ProductData> = {}): ProductEntry {
  return {
    id,
    data: {
      name: id,
      status: 'live',
      category: 'mogrt',
      payhipUrl: '',
      price: null,
      tagline: 'Tagline',
      bullets: ['One'],
      formats: [],
      previewVideo: null,
      previewImage: '/previews/x/previewImage.svg',
      previewAlt: 'Alt',
      badge: 'none',
      legalDisclaimer: false,
      order: 100,
      ...overrides,
    },
  };
}

describe('prepareCatalog', () => {
  it('drops drafts', () => {
    const result = prepareCatalog([entry('live-one'), entry('draft-one', { status: 'draft' })]);
    expect(result.map((p) => p.slug)).toEqual(['live-one']);
  });

  it('sorts by order, then name', () => {
    const result = prepareCatalog([
      entry('c', { order: 20, name: 'Charlie' }),
      entry('b', { order: 10, name: 'Bravo' }),
      entry('a', { order: 20, name: 'Alpha' }),
    ]);
    expect(result.map((p) => p.slug)).toEqual(['b', 'a', 'c']);
  });

  it('derives payhipId from the link, or null when there is none', () => {
    const [withLink, without] = prepareCatalog([
      entry('with', { payhipUrl: 'https://payhip.com/b/AbC12', order: 1 }),
      entry('without', { order: 2 }),
    ]);
    expect(withLink?.payhipId).toBe('AbC12');
    expect(without?.payhipId).toBeNull();
  });
});

describe('formatPrice', () => {
  it('drops cents for whole dollars', () => {
    expect(formatPrice(19)).toBe('$19');
  });

  it('keeps cents otherwise', () => {
    expect(formatPrice(19.5)).toBe('$19.50');
  });
});
