/**
 * E2E Test - Checkout Flow (COD)
 */
import { test, expect } from '@playwright/test';

test('checkout: complete COD order', async ({ page }) => {
  // 1. Go to cart
  await page.goto('/cart');

  // 2. Proceed to checkout
  await page.getByRole('button', { name: /checkout|proceed to checkout/i }).click();
  await expect(page).toHaveURL(/\/checkout/);

  // 3. Add or select address
  const addressSection = page.locator('[data-testid="address-section"]');
  if (await addressSection.isVisible()) {
    await page.getByRole('button', { name: /add address|select address/i }).click();
    await page.getByLabel(/full name/i).fill('Test User');
    await page.getByLabel(/phone/i).fill('+919876543210');
    await page.getByLabel(/address line 1/i).fill('123 Main Street');
    await page.getByLabel(/city/i).fill('Bangalore');
    await page.getByLabel(/state/i).fill('Karnataka');
    await page.getByLabel(/pincode|postal/i).fill('560001');
    await page.getByRole('button', { name: /save|continue/i }).click();
  }

  // 4. Review order
  await page.getByRole('button', { name: /review|continue to payment/i }).click();
  await expect(page.getByText(/order summary|subtotal|total/i)).toBeVisible();

  // 5. Select payment method (COD)
  await page.getByRole('radio', { name: /cash on delivery|cod/i }).check();

  // 6. Place order
  await page.getByRole('button', { name: /place order|confirm order/i }).click();

  // 7. Order confirmation
  await expect(page.getByText(/order placed|order confirmed|thank you/i)).toBeVisible();
  await expect(page).toHaveURL(/\/order\/.*/);
});
