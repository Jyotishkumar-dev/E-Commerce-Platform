import { useState, useRef, type ChangeEvent, type MouseEvent } from 'react';
import { PRODUCT_MEDIA_CONFIG } from '../lib/mediaConfig';
import { ImagePlaceholder } from './ImagePlaceholder';

interface ProductImageUploaderProps {
  onFilesSelect?: (files: File[]) => void;
  onRemove?: (index: number) => void;
  maxFiles?: number;
  accept?: string[];
}

export function ProductImageUploader({
  onFilesSelect,
  onRemove,
  maxFiles = PRODUCT_MEDIA_CONFIG.maxImages,
  accept = PRODUCT_MEDIA_CONFIG.allowedFileTypes,
}: ProductImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const processFiles = (files: FileList | null) => {
    if (!files) return;
    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      if (!accept.includes(file.type)) continue;
      if (file.size > PRODUCT_MEDIA_CONFIG.maxFileSizeBytes) continue;
      validFiles.push(file);
    }

    const remaining = maxFiles - previewUrls.length;
    const toAdd = validFiles.slice(0, Math.max(0, remaining));

    const newUrls = toAdd.map((f) => URL.createObjectURL(f));
    setPreviewUrls((prev) => [...prev, ...newUrls]);

    if (onFilesSelect) {
      onFilesSelect(toAdd);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = (e: MouseEvent, index: number) => {
    e.stopPropagation();
    if (previewUrls[index]) {
      URL.revokeObjectURL(previewUrls[index]);
    }
    const newUrls = previewUrls.filter((_, i) => i !== index);
    setPreviewUrls(newUrls);
    if (onRemove) onRemove(index);
  };

  return (
    <div className="product-image-uploader">
      {previewUrls.length === 0 ? (
        <div
          className={`upload-zone ${isDragOver ? 'drag-over' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          role="button"
          tabIndex={0}
          aria-label="Upload product images"
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') inputRef.current?.click();
          }}
        >
          <span className="upload-zone-icon">📷</span>
          <span className="upload-zone-text">Drag & drop or click to upload</span>
          <span className="upload-zone-hint">
            {accept.map((t) => t.split('/')[1].toUpperCase()).join(', ')} · Max {PRODUCT_MEDIA_CONFIG.maxFileSizeBytes / 1024 / 1024}MB · Up to {maxFiles} images
          </span>
        </div>
      ) : (
        <div className="upload-previews">
          {previewUrls.map((url, index) => (
            <div key={url} className="upload-preview-item">
              <img src={url} alt={`Preview ${index + 1}`} className="upload-preview-image" />
              <button
                type="button"
                className="upload-preview-remove"
                onClick={(e) => handleRemove(e, index)}
                aria-label={`Remove image ${index + 1}`}
              >
                ×
              </button>
            </div>
          ))}
          {previewUrls.length < maxFiles && (
            <div
              className="upload-zone upload-zone-small"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onClick={() => inputRef.current?.click()}
              role="button"
              tabIndex={0}
              aria-label="Add more images"
            >
              <span className="upload-zone-icon">+</span>
            </div>
          )}
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={accept.join(',')}
        multiple
        onChange={handleFileInput}
        style={{ display: 'none' }}
        aria-hidden="true"
      />
    </div>
  );
}
