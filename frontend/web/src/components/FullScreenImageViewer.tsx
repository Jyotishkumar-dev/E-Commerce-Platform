import { useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';

interface FullScreenImageViewerProps {
  images: Array<{ id: string; url: string; altText: string | null }>;
  currentIndex: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}

export function FullScreenImageViewer({
  images,
  currentIndex,
  onClose,
  onNavigate,
}: FullScreenImageViewerProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onNavigate(Math.max(0, currentIndex - 1));
      if (e.key === 'ArrowRight')
        onNavigate(Math.min(images.length - 1, currentIndex + 1));
    },
    [currentIndex, images.length, onClose, onNavigate],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [handleKeyDown]);

  if (images.length === 0) return null;

  const image = images[currentIndex];

  return (
    <div
      className="image-viewer"
      role="dialog"
      aria-modal="true"
      aria-label="Image viewer"
      onClick={onClose}
    >
      <button
        type="button"
        className="image-viewer-close"
        onClick={onClose}
        aria-label="Close image viewer"
      >
        <X size={24} />
      </button>

      <button
        type="button"
        className="image-viewer-nav image-viewer-nav-prev"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(Math.max(0, currentIndex - 1));
        }}
        aria-label="Previous image"
        disabled={currentIndex === 0}
      >
        <ChevronLeft size={28} />
      </button>

      <div className="image-viewer-content" onClick={(e) => e.stopPropagation()}>
        <img
          src={image.url}
          alt={image.altText ?? 'Product image'}
          className="image-viewer-image"
        />
        <div className="image-viewer-counter">
          {currentIndex + 1} / {images.length}
        </div>
      </div>

      <button
        type="button"
        className="image-viewer-nav image-viewer-nav-next"
        onClick={(e) => {
          e.stopPropagation();
          onNavigate(Math.min(images.length - 1, currentIndex + 1));
        }}
        aria-label="Next image"
        disabled={currentIndex === images.length - 1}
      >
        <ChevronRight size={28} />
      </button>
    </div>
  );
}
