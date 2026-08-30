import { describe, expect, it } from 'vitest';
import { formatTitle, PAGE_TITLES } from './title';

describe('Page Title Foundation', () => {
  it('returns default brand tagline title when no page title provided', () => {
    expect(formatTitle()).toBe('Shopvibe.store — Shop Better. Live Better.');
  });

  it('formats custom page title with Shopvibe.store suffix', () => {
    expect(formatTitle('Your Bag')).toBe('Your Bag — Shopvibe.store');
    expect(formatTitle('My Orders')).toBe('My Orders — Shopvibe.store');
  });

  it('provides standard constant titles', () => {
    expect(PAGE_TITLES.HOME).toBe('Shopvibe.store — Shop Better. Live Better.');
    expect(PAGE_TITLES.ADMIN).toBe('Admin Dashboard — Shopvibe.store');
    expect(PAGE_TITLES.PRODUCT('AeroFit Headphones')).toBe('AeroFit Headphones — Shopvibe.store');
  });
});
