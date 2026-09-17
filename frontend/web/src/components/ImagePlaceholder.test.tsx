import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ImagePlaceholder } from './ImagePlaceholder';

describe('ImagePlaceholder', () => {
  it('renders with default size', () => {
    render(<ImagePlaceholder />);
    expect(screen.getByText('📷')).toBeInTheDocument();
  });

  it('renders with custom label', () => {
    render(<ImagePlaceholder label="No image" />);
    expect(screen.getByText('No image')).toBeInTheDocument();
    expect(screen.getByText('📷')).toBeInTheDocument();
  });

  it('renders with small size', () => {
    render(<ImagePlaceholder size="sm" />);
    expect(screen.getByText('📷')).toBeInTheDocument();
  });

  it('renders with large size', () => {
    render(<ImagePlaceholder size="lg" />);
    expect(screen.getByText('📷')).toBeInTheDocument();
  });

  it('applies custom className', () => {
    const { container } = render(<ImagePlaceholder className="custom-class" />);
    expect(container.firstChild).toHaveClass('custom-class');
  });

  it('is aria-hidden', () => {
    const { container } = render(<ImagePlaceholder />);
    expect(container.firstChild).toHaveAttribute('aria-hidden', 'true');
  });
});
