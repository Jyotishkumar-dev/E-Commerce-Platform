import type { CSSProperties } from 'react';

interface ImagePlaceholderProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
  style?: CSSProperties;
  className?: string;
}

export function ImagePlaceholder({ size = 'md', label, style, className }: ImagePlaceholderProps) {
  const dimensions: Record<string, { width: number; height: number; fontSize: number }> = {
    sm: { width: 40, height: 40, fontSize: 16 },
    md: { width: 120, height: 120, fontSize: 28 },
    lg: { width: 400, height: 400, fontSize: 48 },
  };
  const d = dimensions[size];

  return (
    <div
      className={`image-placeholder ${className ?? ''}`}
      style={{
        width: d.width,
        height: d.height,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-muted)',
        borderRadius: 'var(--radius-md)',
        color: 'var(--text-tertiary)',
        gap: '6px',
        ...style,
      }}
      aria-hidden="true"
    >
      <span style={{ fontSize: d.fontSize }}>📷</span>
      {label && (
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>{label}</span>
      )}
    </div>
  );
}
