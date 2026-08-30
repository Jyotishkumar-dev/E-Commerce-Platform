import { useEffect } from 'react';

export const BRAND_NAME = 'Shopvibe.store';
export const DEFAULT_TAGLINE = 'Shop Better. Live Better.';

export const PAGE_TITLES = {
  HOME: `${BRAND_NAME} — ${DEFAULT_TAGLINE}`,
  PRODUCTS: `Collection — ${BRAND_NAME}`,
  PRODUCT: (name: string) => `${name} — ${BRAND_NAME}`,
  CART: `Your Bag — ${BRAND_NAME}`,
  ORDERS: `My Orders — ${BRAND_NAME}`,
  ACCOUNT: `My Account — ${BRAND_NAME}`,
  ADMIN: `Admin Dashboard — ${BRAND_NAME}`,
  NOT_FOUND: `Page Not Found — ${BRAND_NAME}`,
} as const;

export function formatTitle(title?: string): string {
  if (!title) {
    return PAGE_TITLES.HOME;
  }
  return `${title} — ${BRAND_NAME}`;
}

export function setDocumentTitle(title?: string): void {
  if (typeof document !== 'undefined') {
    document.title = title ? formatTitle(title) : PAGE_TITLES.HOME;
  }
}

export function useDocumentTitle(title?: string): void {
  useEffect(() => {
    setDocumentTitle(title);
  }, [title]);
}
