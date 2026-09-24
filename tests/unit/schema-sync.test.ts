import { describe, expect, it } from 'vitest';
import keystaticConfig from '../../keystatic.config';
import { productSchema } from '../../src/lib/product-schema';

describe('admin form and build schema', () => {
  it('define the same product fields', () => {
    const formFields = Object.keys(keystaticConfig.collections?.products?.schema ?? {}).sort();
    const buildFields = Object.keys(productSchema.shape).sort();
    expect(formFields).toEqual(buildFields);
  });
});
