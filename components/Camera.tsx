'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface CameraProps {
  onCapture: (imageBlob: Blob) => void;
}

export default function Camera({ onCapture }: CameraProps) {
  // Mode: camera (live video) or upload (file picker)
  const [mode, setMode] = useState<'camera' | 'upload'>('camera');

  // Camera state
  const [cameraReady, setCameraReady] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);

  // Captured photo state (for preview before submitting)
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);

  // Error state
  const [error, setError] = useState<string | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);

  // Stop camera and release resources
  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraReady(false);
  }, [stream]);

  // Start camera with rear-facing preference
  const startCamera = useCallback(async () => {
    setError(null);

    // Check if getUserMedia is supported
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('Camera not supported in this browser. Try uploading a photo instead.');
      return;
    }

    try {
      // Request rear camera (environment = back camera on phones)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          // Request reasonable resolution for bookshelf photos
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        setStream(mediaStream);

        // Wait for video to be ready
        videoRef.current.onloadedmetadata = () => {
          setCameraReady(true);
        };
      }
    } catch (err) {
      // Handle specific error types with helpful messages
      if (err instanceof Error) {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Try uploading a photo instead.');
        } else if (err.name === 'NotFoundError') {
          setError('No camera found. Try uploading a photo instead.');
        } else if (err.name === 'NotSupportedError') {
          setError('Camera not supported. Try uploading a photo instead.');
        } else {
          setError(`Camera error: ${err.message}`);
        }
      } else {
        setError('Failed to access camera. Try uploading a photo instead.');
      }
    }
  }, []);

  // Start/stop camera when mode changes
  useEffect(() => {
    if (mode === 'camera') {
      startCamera();
    } else {
      stopCamera();
    }

    // Cleanup on unmount
    return () => {
      stopCamera();
    };
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Capture photo from video stream
  const capturePhoto = () => {
    if (!videoRef.current || !cameraReady) return;

    const video = videoRef.current;

    // Create canvas at video's natural size
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current frame
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);

    // Convert to blob (JPEG at 85% quality for good balance of size/quality)
    canvas.toBlob(
      (blob) => {
        if (blob) {
          setCapturedBlob(blob);
          // Also create data URL for preview display
          setCapturedImage(canvas.toDataURL('image/jpeg', 0.85));
        }
      },
      'image/jpeg',
      0.85
    );
  };

  // Handle file selection (upload mode)
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Store the file as our blob
    setCapturedBlob(file);

    // Create preview URL
    const objectUrl = URL.createObjectURL(file);
    setCapturedImage(objectUrl);
  };

  // User accepts the captured photo
  const handleAccept = () => {
    if (capturedBlob) {
      onCapture(capturedBlob);
    }
  };

  // User wants to retake/change photo
  const handleRetake = () => {
    // Clean up object URL if it was created for upload
    if (capturedImage && capturedImage.startsWith('blob:')) {
      URL.revokeObjectURL(capturedImage);
    }
    setCapturedImage(null);
    setCapturedBlob(null);
  };

  // Switch between camera and upload modes
  const handleModeChange = (newMode: 'camera' | 'upload') => {
    handleRetake(); // Clear any captured photo
    setError(null);
    setMode(newMode);
  };

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Mode toggle */}
      <div className="flex bg-gray-200 rounded-lg p-1">
        <button
          onClick={() => handleModeChange('camera')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'camera'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Camera
        </button>
        <button
          onClick={() => handleModeChange('upload')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            mode === 'upload'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          Upload
        </button>
      </div>

      {/* Error message with fallback action */}
      {error && (
        <div className="w-full max-w-md p-4 bg-red-50 rounded-lg">
          <p className="text-red-700 text-sm mb-2">{error}</p>
          {mode === 'camera' && (
            <button
              onClick={() => handleModeChange('upload')}
              className="text-sm text-blue-600 hover:underline"
            >
              Switch to upload mode
            </button>
          )}
        </div>
      )}

      {/* Preview state - shown after capture/upload */}
      {capturedImage ? (
        <div className="w-full max-w-md">
          <div className="aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden">
            <img
              src={capturedImage}
              alt="Captured bookshelf"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex gap-3 mt-4">
            <button
              onClick={handleRetake}
              className="flex-1 py-3 border border-gray-300 rounded-lg font-medium hover:bg-gray-50"
            >
              {mode === 'camera' ? 'Retake' : 'Change'}
            </button>
            <button
              onClick={handleAccept}
              className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Use Photo
            </button>
          </div>
        </div>
      ) : mode === 'camera' ? (
        /* Camera mode - live preview */
        <div className="relative w-full max-w-md aspect-[3/4] bg-gray-900 rounded-lg overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />

          {/* Loading state while camera initializes */}
          {!cameraReady && !error && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
              <p className="text-gray-400">Starting camera...</p>
            </div>
          )}

          {/* Shutter button */}
          {cameraReady && (
            <button
              onClick={capturePhoto}
              className="absolute bottom-4 left-1/2 -translate-x-1/2 w-16 h-16 bg-white rounded-full border-4 border-gray-300 hover:border-gray-400 active:scale-95 transition-transform"
              aria-label="Take photo"
            >
              {/* Inner circle for visual feedback */}
              <span className="block w-12 h-12 mx-auto rounded-full bg-white border-2 border-gray-200" />
            </button>
          )}
        </div>
      ) : (
        /* Upload mode - file picker */
        <div className="w-full max-w-md">
          <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors">
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              {/* Upload icon */}
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
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Tap to upload</span>
              </p>
              <p className="text-xs text-gray-400">PNG, JPG, or WebP</p>
            </div>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  );
}
