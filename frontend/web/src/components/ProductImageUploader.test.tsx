import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProductImageUploader } from './ProductImageUploader';

vi.mock('../lib/mediaConfig', () => ({
  PRODUCT_MEDIA_CONFIG: {
    maxImages: 5,
    maxFileSizeBytes: 5 * 1024 * 1024,
    allowedFileTypes: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  },
}));

beforeEach(() => {
  vi.stubGlobal('URL', {
    ...(globalThis as any).URL,
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn(),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

const createFile = (name: string, type: string) =>
  new File(['content'], name, { type });

describe('ProductImageUploader', () => {
  it('renders upload zone by default', () => {
    render(<ProductImageUploader />);
    expect(screen.getByText(/Drag & drop or click to upload/)).toBeInTheDocument();
  });

  it('renders previews after file selection', () => {
    render(<ProductImageUploader />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createFile('test.jpg', 'image/jpeg');
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByAltText('Preview 1')).toBeInTheDocument();
  });

  it('removes a preview', () => {
    render(<ProductImageUploader />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createFile('test.jpg', 'image/jpeg');
    fireEvent.change(input, { target: { files: [file] } });
    expect(screen.getByLabelText('Remove image 1')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText('Remove image 1'));
    expect(screen.queryByAltText('Preview 1')).not.toBeInTheDocument();
  });

  it('calls onFilesSelect', () => {
    const onFilesSelect = vi.fn();
    render(<ProductImageUploader onFilesSelect={onFilesSelect} />);
    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = createFile('test.jpg', 'image/jpeg');
    fireEvent.change(input, { target: { files: [file] } });
    expect(onFilesSelect).toHaveBeenCalledWith([expect.any(File)]);
  });

  it('rejects files exceeding max size', () => {
    render(<ProductImageUploader />);
    const input = screen.getByLabelText('Upload product images') as HTMLInputElement;
    const largeContent = 'x'.repeat(10 * 1024 * 1024 + 1);
    const largeFile = new File([largeContent], 'large.jpg', { type: 'image/jpeg' });
    fireEvent.change(input, { target: { files: [largeFile] } });
    expect(screen.queryByAltText('Preview 1')).not.toBeInTheDocument();
  });

  it('rejects disallowed file types', () => {
    render(<ProductImageUploader />);
    const input = screen.getByLabelText('Upload product images') as HTMLInputElement;
    const pdfFile = createFile('test.pdf', 'application/pdf');
    fireEvent.change(input, { target: { files: [pdfFile] } });
    expect(screen.queryByAltText('Preview 1')).not.toBeInTheDocument();
  });
});
