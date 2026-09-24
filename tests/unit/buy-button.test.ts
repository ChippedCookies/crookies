import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import BuyButton from '../../src/components/BuyButton.astro';
import type { Product } from '../../src/lib/catalog';

const base: Product = {
  slug: 'caption-pack',
  name: 'Caption Pack',
  status: 'live',
  category: 'mogrt',
  payhipUrl: '',
  payhipId: null,
  price: null,
  tagline: 'Tagline',
  bullets: ['One'],
  formats: [],
  previewVideo: null,
  previewImage: '/previews/caption-pack/previewImage.svg',
  previewAlt: 'Alt',
  badge: 'none',
  legalDisclaimer: false,
  order: 1,
};

let container: AstroContainer;

beforeAll(async () => {
  container = await AstroContainer.create();
});

describe('BuyButton', () => {
  it('renders a Payhip checkout link when the product has a Payhip ID', async () => {
    const html = await container.renderToString(BuyButton, {
      props: { product: { ...base, payhipUrl: 'https://payhip.com/b/AbC12', payhipId: 'AbC12', price: 19 } },
    });
    expect(html).toContain('href="https://payhip.com/b/AbC12"');
    expect(html).toContain('data-product="AbC12"');
    expect(html).toContain('payhip-buy-button');
    expect(html).toContain('Buy · $19');
    expect(html).toContain('aria-label="Buy Caption Pack for $19"');
  });

  it('renders a disabled "Coming soon" button when there is no Payhip ID', async () => {
    const html = await container.renderToString(BuyButton, { props: { product: base } });
    expect(html).toMatch(/<button[^>]*disabled/);
    expect(html).toContain('Coming soon');
    expect(html).not.toContain('payhip.com');
  });
});
