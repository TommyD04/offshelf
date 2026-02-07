/**
 * OpenCV.js Loader
 *
 * Handles async initialization of OpenCV WebAssembly module.
 * Uses singleton pattern to avoid multiple loads.
 */

import cv from '@techstark/opencv-js';

let isInitialized = false;
let initPromise: Promise<void> | null = null;

/**
 * Initialize OpenCV.js
 * Safe to call multiple times - will only load once.
 *
 * @returns Promise that resolves when OpenCV is ready
 */
export async function initOpenCV(): Promise<void> {
  if (isInitialized) {
    return;
  }

  if (initPromise) {
    return initPromise;
  }

  initPromise = new Promise<void>((resolve, reject) => {
    if (cv.Mat) {
      // Already loaded
      isInitialized = true;
      resolve();
      return;
    }

    // OpenCV.js uses onRuntimeInitialized callback
    const originalOnRuntimeInitialized = cv.onRuntimeInitialized;
    cv.onRuntimeInitialized = () => {
      if (originalOnRuntimeInitialized) {
        originalOnRuntimeInitialized();
      }
      isInitialized = true;
      resolve();
    };

    // Set a timeout for loading
    setTimeout(() => {
      if (!isInitialized) {
        reject(new Error('OpenCV.js initialization timed out'));
      }
    }, 30000); // 30 second timeout
  });

  return initPromise;
}

/**
 * Get the OpenCV instance
 * Throws if not initialized
 */
export function getCV(): typeof cv {
  if (!isInitialized) {
    throw new Error('OpenCV not initialized. Call initOpenCV() first.');
  }
  return cv;
}

/**
 * Check if OpenCV is initialized
 */
export function isOpenCVReady(): boolean {
  return isInitialized;
}

export { cv };
