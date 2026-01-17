'use client';

import { useState, useRef } from 'react';

// TODO: Camera component responsibilities:
// 1. Access device camera (navigator.mediaDevices.getUserMedia)
// 2. Show live preview in a <video> element
// 3. Capture photo on button click (draw video frame to canvas, export as blob)
// 4. Also support file upload as fallback (for desktop or camera permission denied)
// 5. Pass captured image to parent via onCapture callback

interface CameraProps {
  onCapture: (imageBlob: Blob) => void;
}

export default function Camera({ onCapture }: CameraProps) {
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // TODO: Implement camera initialization
  // - Request camera permission
  // - Set video stream as source
  // - Handle errors (permission denied, no camera)

  // TODO: Implement photo capture
  // - Create canvas at video dimensions
  // - Draw current video frame
  // - Convert to blob (JPEG for smaller size)
  // - Call onCapture with blob

  // TODO: Implement file upload fallback
  // - Accept image/* files
  // - Convert to blob
  // - Call onCapture

  return (
    <div className="flex flex-col items-center gap-4">
      {/* TODO: Add mode toggle (camera vs upload) */}

      {mode === 'camera' ? (
        <div className="relative w-full max-w-md aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden">
          {/* TODO: Add video preview element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full h-full object-cover"
          />

          {/* TODO: Add capture button overlay */}
          <button
            className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-300"
            aria-label="Take photo"
          >
            {/* Shutter button */}
          </button>
        </div>
      ) : (
        <div className="w-full max-w-md">
          {/* TODO: Add file upload dropzone */}
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50">
            <span className="text-gray-500">Tap to upload a bookshelf photo</span>
            <input type="file" accept="image/*" className="hidden" />
          </label>
        </div>
      )}

      {error && (
        <p className="text-red-500 text-sm">{error}</p>
      )}
    </div>
  );
}
