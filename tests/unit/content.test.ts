import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import { describe, expect, it } from 'vitest';
import { parsePayhipId } from '../../src/lib/catalog';
import { MAX_VIDEO_BYTES, productSchema, type ProductData } from '../../src/lib/product-schema';

const CONTENT_DIR = 'src/content/products';
const PUBLIC_DIR = 'public';

const files = readdirSync(CONTENT_DIR).filter((file) => file.endsWith('.yaml'));
const products = files.map((file) => ({
  file,
  slug: file.replace(/\.yaml$/, ''),
  raw: parse(readFileSync(join(CONTENT_DIR, file), 'utf8')) as unknown,
}));

function data(raw: unknown): ProductData {
  return productSchema.parse(raw);
}

describe('product content', () => {
  it('has at least one product', () => {
    expect(files.length).toBeGreaterThan(0);
  });

  describe.each(products)('$file', ({ slug, raw }) => {
    it('matches the schema', () => {
      const result = productSchema.safeParse(raw);
      expect(result.error?.issues ?? []).toEqual([]);
    });

    it('has a kebab-case file name', () => {
      expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
    });

    it('has a preview image that exists', () => {
      expect(existsSync(join(PUBLIC_DIR, data(raw).previewImage))).toBe(true);
    });

    it('has a preview video that exists, is mp4/webm and is 8 MB or smaller', () => {
      const video = data(raw).previewVideo;
      if (!video) return;
      const path = join(PUBLIC_DIR, video);
      expect(existsSync(path)).toBe(true);
      expect(video).toMatch(/\.(mp4|webm)$/);
      expect(statSync(path).size).toBeLessThanOrEqual(MAX_VIDEO_BYTES);
    });

    it('has a Payhip link that parses, when set', () => {
      const { payhipUrl } = data(raw);
      if (payhipUrl) expect(parsePayhipId(payhipUrl)).not.toBeNull();
    });

    it('shows the legal note if it is a contract template', () => {
      const product = data(raw);
      if (/contract/i.test(product.name)) expect(product.legalDisclaimer).toBe(true);
    });

    it('is not buyable if it is an AI tool (v1)', () => {
      const product = data(raw);
      if (product.category === 'ai') expect(product.payhipUrl).toBe('');
    });
  });
});
