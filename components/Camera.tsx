'use client';

import { useState } from 'react';

interface CameraProps {
  onCapture: (imageBlob: Blob) => void;
}

// Max dimension for resized images (higher = better detection, larger file)
// 3000px at 0.92 quality typically produces 2-4MB files
const MAX_IMAGE_DIMENSION = 3000;
const JPEG_QUALITY = 0.92;

/**
 * Compress an image file to fit within size limits
 * Uses canvas to resize and re-encode as JPEG
 */
function compressImage(file: File): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      // Calculate new dimensions (maintain aspect ratio)
      let { width, height } = img;
      if (width > MAX_IMAGE_DIMENSION || height > MAX_IMAGE_DIMENSION) {
        if (width > height) {
          height = (height / width) * MAX_IMAGE_DIMENSION;
          width = MAX_IMAGE_DIMENSION;
        } else {
          width = (width / height) * MAX_IMAGE_DIMENSION;
          height = MAX_IMAGE_DIMENSION;
        }
      }

      // Draw to canvas at new size
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to JPEG blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        JPEG_QUALITY
      );
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export default function Camera({ onCapture }: CameraProps) {
  // Captured photo state (for preview before submitting)
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);

  // Handle file selection (from camera or album)
  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsCompressing(true);

    try {
      // Skip compression if original is already under 5MB (preserves quality)
      const MAX_SIZE_MB = 5;
      let finalBlob: Blob;

      if (file.size < MAX_SIZE_MB * 1024 * 1024) {
        console.log(`Original ${(file.size / 1024 / 1024).toFixed(2)}MB - using as-is (under ${MAX_SIZE_MB}MB limit)`);
        finalBlob = file;
      } else {
        const compressedBlob = await compressImage(file);
        console.log(`Original: ${(file.size / 1024 / 1024).toFixed(2)}MB → Compressed: ${(compressedBlob.size / 1024 / 1024).toFixed(2)}MB`);
        finalBlob = compressedBlob;
      }

      setCapturedBlob(finalBlob);

      // Create preview URL
      const objectUrl = URL.createObjectURL(finalBlob);
      setCapturedImage(objectUrl);
    } catch (error) {
      console.error('Failed to compress image:', error);
      // Fall back to original file if compression fails
      setCapturedBlob(file);
      setCapturedImage(URL.createObjectURL(file));
    } finally {
      setIsCompressing(false);
    }
  };

  // User accepts the captured photo
  const handleAccept = () => {
    if (capturedBlob) {
      onCapture(capturedBlob);
    }
  };

  // User wants to change photo
  const handleRetake = () => {
    if (capturedImage) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setCapturedBlob(null);
  };

  // Compressing state
  if (isCompressing) {
    return (
      <div className="w-full max-w-md mx-auto flex flex-col items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full" />
        <p className="mt-3 text-sm text-gray-500">Preparing image...</p>
      </div>
    );
  }

  // Preview state - shown after selecting a photo
  if (capturedImage) {
    return (
      <div className="w-full max-w-md mx-auto">
        <div className="aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden">
          <img
            src={capturedImage}
            alt="Selected bookshelf"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="flex gap-3 mt-4">
          <button
            onClick={handleRetake}
            className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
          >
            Change
          </button>
          <button
            onClick={handleAccept}
            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Use Photo
          </button>
        </div>
      </div>
    );
  }

  // File picker - camera as primary, album as secondary option
  return (
    <div className="w-full max-w-md mx-auto flex flex-col gap-3">
      {/* Primary: Take a photo */}
      <label className="flex flex-col items-center justify-center w-full h-56 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors">
        <div className="flex flex-col items-center justify-center py-6">
          {/* Camera icon */}
          <svg
            className="w-10 h-10 mb-3 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <p className="text-sm text-gray-500 font-semibold">Take a photo</p>
        </div>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="environment"
          onChange={handleFileSelect}
          className="hidden"
        />
      </label>

      {/* Secondary: Choose from album */}
      <label className="flex items-center justify-center w-full py-3 text-sm text-gray-600 hover:text-gray-900 cursor-pointer">
        <svg
          className="w-4 h-4 mr-2"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        Choose from album
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />
      </label>
    </div>
  );
}
