import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { productSchema } from './lib/product-schema';

export const collections = {
  products: defineCollection({
    loader: glob({ pattern: '*.yaml', base: './src/content/products' }),
    schema: productSchema,
  }),
};
