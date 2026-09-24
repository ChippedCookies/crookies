import { getCollection } from 'astro:content';
import { prepareCatalog, type Product } from './catalog';

export { formatPrice, parsePayhipId, type Product } from './catalog';

export async function getProducts(): Promise<Product[]> {
  return prepareCatalog(await getCollection('products'));
}
