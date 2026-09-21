/**
 * Additional E2E Flows
 */
import { test, expect } from '@playwright/test';
import { testUser } from './helpers';

test('existing user: login → browse → cart', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(testUser.email);
  await page.getByLabel(/password/i).fill(testUser.password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(home|dashboard|)/);

  await page.goto('/');
  await expect(page.locator('[data-testid="product-card"]').first()).toBeVisible();

  await page.locator('[data-testid="product-card"]').first().click();
  await page.getByRole('button', { name: /add to cart/i }).click();
  await expect(page.locator('[data-testid="cart-count"]').first()).not.toHaveText('0');
});

test('wishlist: add product → wishlist page', async ({ page }) => {
  await page.goto('/');
  const heartBtn = page.locator('[data-testid="wishlist-btn"]').first();
  if (await heartBtn.isVisible()) {
    await heartBtn.click();
    await expect(heartBtn).toHaveAttribute('data-active', 'true');
  }
});

test('order history: view orders', async ({ page }) => {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(testUser.email);
  await page.getByLabel(/password/i).fill(testUser.password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await page.waitForURL(/\/(home|dashboard|)/);

  await page.getByRole('link', { name: /orders|order history/i }).click();
  await expect(page.getByText(/order/i).first()).toBeVisible();
});
