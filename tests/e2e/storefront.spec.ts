import { expect, test } from '@playwright/test';

test.describe('storefront', () => {
  test('loads with the headline and every live product', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('scroll', { ignoreCase: true });
    await expect(page.locator('[data-category]')).toHaveCount(6);
    expect(errors).toEqual([]);
  });

  test('filters products by category and keeps the filter in the URL', async ({ page }) => {
    await page.goto('/');
    const items = page.locator('[data-category]');

    await page.getByRole('button', { name: /^MOGRTs/ }).click();
    await expect(items.filter({ visible: true })).toHaveCount(2);
    await expect(page).toHaveURL(/#shop=mogrt$/);
    await expect(page.getByRole('button', { name: /^MOGRTs/ })).toHaveAttribute('aria-pressed', 'true');

    await page.getByRole('button', { name: /^All/ }).click();
    await expect(items.filter({ visible: true })).toHaveCount(6);
    await expect(page).toHaveURL(/#shop$/);
  });

  test('restores the filter from a shared link', async ({ page }) => {
    await page.goto('/#shop=template');
    await expect(page.locator('[data-category]').filter({ visible: true })).toHaveCount(3);
    await expect(page.getByRole('button', { name: /^Templates/ })).toHaveAttribute('aria-pressed', 'true');
  });

  test('every buy control is either a Payhip link or a disabled "Coming soon"', async ({ page }) => {
    await page.goto('/');
    const buttons = page.locator('[data-buy-button]');
    await expect(buttons).toHaveCount(6);

    for (const button of await buttons.all()) {
      const tag = await button.evaluate((element) => element.tagName);
      if (tag === 'A') {
        await expect(button).toHaveAttribute('href', /^https:\/\/payhip\.com\/b\/[A-Za-z0-9]+$/);
      } else {
        await expect(button).toBeDisabled();
        await expect(button).toHaveText('Coming soon');
      }
    }
  });

  test('shows the legal note on the contract kit', async ({ page }) => {
    await page.goto('/');
    const card = page.locator('[data-category]').filter({ hasText: 'Contract Kit' });
    await expect(card).toContainText('not legal advice');
  });

  test('has no horizontal scroll', async ({ page }) => {
    await page.goto('/');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe('reduced motion', () => {
  test.use({ reducedMotion: 'reduce' });

  test('shows all content without scrolling it into view', async ({ page }) => {
    await page.goto('/');
    const hidden = await page.locator('[data-reveal]').evaluateAll((elements) =>
      elements.filter((element) => getComputedStyle(element).opacity !== '1').length,
    );
    expect(hidden).toBe(0);
  });
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });

  test('still shows every product and hides the filter tabs', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('[data-category]').filter({ visible: true })).toHaveCount(6);
    await expect(page.getByRole('group', { name: 'Filter products by category' })).toBeHidden();
  });
});
