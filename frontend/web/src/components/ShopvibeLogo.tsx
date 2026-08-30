import type { HTMLAttributes } from 'react';

export interface ShopvibeLogoProps extends HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'full' | 'icon' | 'wordmark';
  showTagline?: boolean;
}

const sizeStyles = {
  sm: {
    iconSize: 22,
    fontSize: 'text-sm font-semibold tracking-tight',
    dotSize: 3,
    gap: 'gap-1.5',
  },
  md: {
    iconSize: 28,
    fontSize: 'text-base font-bold tracking-tight',
    dotSize: 4,
    gap: 'gap-2',
  },
  lg: {
    iconSize: 36,
    fontSize: 'text-xl font-bold tracking-tight',
    dotSize: 5,
    gap: 'gap-2.5',
  },
  xl: {
    iconSize: 48,
    fontSize: 'text-2xl font-extrabold tracking-tight',
    dotSize: 6,
    gap: 'gap-3',
  },
};

export function ShopvibeLogo({
  size = 'md',
  variant = 'full',
  showTagline = false,
  className = '',
  ...props
}: ShopvibeLogoProps) {
  const currentSize = sizeStyles[size];

  const iconElement = (
    <svg
      width={currentSize.iconSize}
      height={currentSize.iconSize}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="shrink-0 transition-transform duration-200"
      aria-hidden="true"
    >
      <rect width="48" height="48" rx="12" fill="#111114" />
      <path
        d="M14 17C14 14.7909 15.7909 13 18 13H30C32.2091 13 34 14.7909 34 17V20C34 22.2091 32.2091 24 30 24H18C15.7909 24 14 25.7909 14 28V31C14 33.2091 15.7909 35 18 35H30C32.2091 35 34 33.2091 34 31"
        stroke="#F4F4F5"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="34" cy="14" r="2.5" fill="#3B82F6" />
    </svg>
  );

  return (
    <div
      className={`inline-flex items-center select-none ${currentSize.gap} ${className}`}
      role="img"
      aria-label="Shopvibe.store logo"
      {...props}
    >
      {variant !== 'wordmark' && iconElement}
      {variant !== 'icon' && (
        <div className="flex flex-col leading-none">
          <span className={`brand-text text-neutral-900 dark:text-neutral-50 ${currentSize.fontSize}`}>
            <span className="font-bold tracking-tight">Shopvibe</span>
            <span className="font-normal text-neutral-500">.store</span>
          </span>
          {showTagline && (
            <span className="text-[10px] tracking-widest uppercase text-neutral-400 font-medium mt-0.5">
              Shop Better. Live Better.
            </span>
          )}
        </div>
      )}
    </div>
  );
}
