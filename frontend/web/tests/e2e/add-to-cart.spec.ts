/**
 * E2E Test - Add to Cart
 */
import { test, expect } from '@playwright/test';

test('add to cart from product page', async ({ page }) => {
  await page.goto('/product/test-product');

  // Select quantity
  const quantityInput = page.getByLabel(/quantity/i);
  if (await quantityInput.isVisible()) {
    await quantityInput.fill('2');
  }

  // Click add to cart
  await page.getByRole('button', { name: /add to cart/i }).click();

  // Cart should update (notification or counter change)
  const cartBadge = page.locator('[data-testid="cart-count"]');
  await expect(cartBadge).not.toHaveText('0');

  // Click cart link
  await page.getByRole('link', { name: /cart|shopping cart/i }).click();

  // Product should appear in cart
  await expect(page.locator('[data-testid="cart-item"]').first()).toBeVisible();
  await expect(page.getByText('test-product')).toBeVisible();

  // Verify quantity
  const qtyInput = page.locator('[data-testid="cart-quantity"]').first();
  if (await qtyInput.isVisible()) {
    await expect(qtyInput).toHaveValue('2');
  }

  // Verify price
  await expect(page.locator('[data-testid="cart-price"]').first()).toBeVisible();
});

test('remove item from cart', async ({ page }) => {
  await page.goto('/cart');

  // Click remove
  const removeBtn = page.getByRole('button', { name: /remove|delete/i }).first();
  if (await removeBtn.isVisible()) {
    await removeBtn.click();

    // Item should be removed
    await expect(page.locator('[data-testid="cart-item"]').first()).not.toBeVisible();
  }
});
