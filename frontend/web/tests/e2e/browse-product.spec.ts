/**
 * E2E Test - Browse Product
 */
import { test, expect } from '@playwright/test';

test('homepage shows products', async ({ page }) => {
  await page.goto('/');

  // Product listing should be visible
  const productCards = page.locator('[data-testid="product-card"]');
  await expect(productCards.first()).toBeVisible();

  // Click on first product
  await productCards.first().click();

  // Should navigate to product detail
  await expect(page).toHaveURL(/\/product\/.*/);

  // Product information should be visible
  await expect(page.getByRole('heading')).toBeVisible();
  await expect(page.getByText(/₹|INR|price/i)).toBeVisible();
});

test('product detail shows information', async ({ page }) => {
  await page.goto('/product/test-product');

  // Product image should be visible
  const image = page.locator('img').first();
  await expect(image).toBeVisible();

  // Price should be visible
  await expect(page.locator('text=/₹/')).toBeVisible();

  // Add to cart should be available
  await expect(page.getByRole('button', { name: /add to cart/i })).toBeVisible();

  // Product info
  await expect(page.getByText(/title|product name/i)).toBeVisible();
});
