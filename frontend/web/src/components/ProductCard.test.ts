import { describe, expect, it } from 'vitest';
import { formatMoney } from './ProductCard';

describe('formatMoney', () => {
  it('formats amount in paise/cents to INR currency format', () => {
    const formatted = formatMoney(1299900);
    // en-IN currency format outputs ₹12,999 or contains 12,999
    expect(formatted.replace(/\s+/g, '')).toContain('12,999');
  });

  it('formats smaller amounts correctly', () => {
    const formatted = formatMoney(49900);
    expect(formatted.replace(/\s+/g, '')).toContain('499');
  });
});
