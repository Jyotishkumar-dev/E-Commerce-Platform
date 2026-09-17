import { useState, type MouseEvent } from 'react';
import { ImagePlaceholder } from './ImagePlaceholder';

interface ProductImageGalleryProps {
  images: Array<{ id: string; url: string; altText: string; sortOrder: number; isPrimary: boolean }>;
  fallbackUrl?: string | null;
  onImageClick?: (image: { id: string; url: string; altText: string; sortOrder: number; isPrimary: boolean }) => void;
}

export function ProductImageGallery({ images, fallbackUrl, onImageClick }: ProductImageGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const allImages = images.length > 0
    ? images
    : fallbackUrl
      ? [{ id: 'fallback', url: fallbackUrl, altText: '', sortOrder: 0, isPrimary: true }]
      : [];

  const mainImage = allImages[selectedIndex] ?? null;

  const handleThumbnailClick = (e: MouseEvent, index: number) => {
    e.stopPropagation();
    setSelectedIndex(index);
  };

  const handleMainClick = (e: MouseEvent) => {
    if (mainImage && onImageClick) {
      onImageClick(mainImage);
    }
  };

  if (allImages.length === 0) {
    return (
      <ImagePlaceholder size="lg" label="No images" />
    );
  }

  return (
    <div className="product-image-gallery">
      <div
        className="gallery-main"
        onClick={handleMainClick}
        style={{ cursor: onImageClick ? 'pointer' : 'default' }}
      >
        {mainImage ? (
          <img
            src={mainImage.url}
            alt={mainImage.altText || 'Product image'}
            className="gallery-main-image"
          />
        ) : (
          <ImagePlaceholder size="lg" label="No image" />
        )}
      </div>
      {allImages.length > 1 && (
        <div className="gallery-thumbnails" role="tablist" aria-label="Product image thumbnails">
          {allImages.map((img, index) => (
            <button
              key={img.id}
              type="button"
              role="tab"
              aria-selected={index === selectedIndex}
              aria-label={`View image ${index + 1}`}
              className={`gallery-thumbnail ${index === selectedIndex ? 'active' : ''}`}
              onClick={(e) => handleThumbnailClick(e, index)}
            >
              <img src={img.url} alt="" className="gallery-thumb-image" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
