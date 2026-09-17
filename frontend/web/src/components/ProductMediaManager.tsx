import { useState, useRef, type ChangeEvent, type MouseEvent } from 'react';
import { PRODUCT_MEDIA_CONFIG } from '../lib/mediaConfig';
import { ImagePlaceholder } from './ImagePlaceholder';
import { ProductImageUploader } from './ProductImageUploader';

interface ProductMediaManagerProps {
  images: Array<{ id: string; url: string; altText: string; sortOrder: number; isPrimary: boolean }>;
  onImagesChange: (images: Array<{ id: string; url: string; altText: string; sortOrder: number; isPrimary: boolean }>) => void;
  maxImages?: number;
  onUpload?: (files: File[]) => void;
}

export function ProductMediaManager({
  images,
  onImagesChange,
  maxImages = PRODUCT_MEDIA_CONFIG.maxImages,
  onUpload,
}: ProductMediaManagerProps) {
  const [selectedId, setSelectedId] = useState<string | null>(images.find((i) => i.isPrimary)?.id ?? images[0]?.id ?? null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedImage = images.find((i) => i.id === selectedId) ?? images[0] ?? null;

  const handleSetPrimary = (id: string) => {
    const newImages = images.map((i) => ({ ...i, isPrimary: i.id === id }));
    onImagesChange(newImages);
  };

  const handleDelete = (id: string) => {
    const newImages = images.filter((i) => i.id !== id);
    onImagesChange(newImages);
    if (selectedId === id) {
      setSelectedId(newImages.find((i) => i.isPrimary)?.id ?? newImages[0]?.id ?? null);
    }
  };

  const handleFiles = (files: File[]) => {
    const remaining = maxImages - images.length;
    const toAdd = files.slice(0, Math.max(0, remaining));
    const newImages = toAdd.map((file, index) => ({
      id: `img-${Date.now()}-${index}`,
      url: URL.createObjectURL(file),
      altText: file.name,
      sortOrder: images.length + index,
      isPrimary: images.length === 0,
    }));
    onImagesChange([...images, ...newImages]);
    if (onUpload) onUpload(toAdd);
    if (newImages.length > 0) {
      setSelectedId(newImages[0].id);
    }
  };

  return (
    <div className="product-media-manager">
      <div className="media-manager-preview">
        {selectedImage ? (
          <img
            src={selectedImage.url}
            alt={selectedImage.altText}
            className="media-manager-image"
          />
        ) : (
          <ImagePlaceholder size="lg" label="No images" />
        )}
      </div>

      <div className="media-manager-controls">
        <div className="media-manager-upload">
          <ProductImageUploader
            onFilesSelect={handleFiles}
            maxFiles={maxImages}
          />
        </div>

        {images.length > 0 && (
          <div className="media-manager-thumbnails">
            {images.map((img) => (
              <div
                key={img.id}
                className={`media-thumbnail ${img.id === selectedId ? 'active' : ''} ${img.isPrimary ? 'primary' : ''}`}
                onClick={() => setSelectedId(img.id)}
                role="button"
                tabIndex={0}
                aria-label={`${img.isPrimary ? 'Primary ' : ''}Image ${img.sortOrder + 1}`}
              >
                <img src={img.url} alt="" className="media-thumb-image" />
                {img.isPrimary && <span className="primary-badge">Primary</span>}
                <button
                  type="button"
                  className="media-thumbnail-delete"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(img.id);
                  }}
                  aria-label={`Delete image`}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {selectedImage && (
          <div className="media-manager-actions">
            <button
              type="button"
              className="plain"
              onClick={() => handleSetPrimary(selectedImage.id)}
              disabled={selectedImage.isPrimary}
            >
              {selectedImage.isPrimary ? '★ Primary' : '☆ Set as Primary'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
