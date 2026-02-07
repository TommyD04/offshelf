/**
 * OpenCV Image Utilities
 *
 * Handles conversion between Node.js Buffer and OpenCV Mat format.
 * Uses sharp for image decoding/encoding.
 */

import sharp from 'sharp';
import { getCV } from './loader';

/**
 * Convert an image Buffer to OpenCV Mat
 *
 * @param imageBuffer - Image as Buffer (JPEG, PNG, etc.)
 * @returns OpenCV Mat in BGR format
 */
export async function bufferToMat(imageBuffer: Buffer): Promise<InstanceType<typeof import('@techstark/opencv-js').Mat>> {
  const cv = getCV();

  // Use sharp to decode and get raw pixel data
  const { data, info } = await sharp(imageBuffer)
    .raw()
    .toBuffer({ resolveWithObject: true });

  const { width, height, channels } = info;

  // Create Mat from raw data
  const mat = new cv.Mat(height, width, channels === 4 ? cv.CV_8UC4 : cv.CV_8UC3);
  mat.data.set(data);

  // Convert RGB to BGR (OpenCV uses BGR)
  if (channels === 3) {
    cv.cvtColor(mat, mat, cv.COLOR_RGB2BGR);
  } else if (channels === 4) {
    cv.cvtColor(mat, mat, cv.COLOR_RGBA2BGRA);
  }

  return mat;
}

/**
 * Convert OpenCV Mat back to Buffer
 *
 * @param mat - OpenCV Mat
 * @param format - Output format ('jpeg' | 'png')
 * @returns Image as Buffer
 */
export async function matToBuffer(
  mat: InstanceType<typeof import('@techstark/opencv-js').Mat>,
  format: 'jpeg' | 'png' = 'jpeg'
): Promise<Buffer> {
  const cv = getCV();

  // Convert BGR to RGB for sharp
  let rgbMat = mat;
  if (mat.channels() === 3) {
    rgbMat = new cv.Mat();
    cv.cvtColor(mat, rgbMat, cv.COLOR_BGR2RGB);
  } else if (mat.channels() === 4) {
    rgbMat = new cv.Mat();
    cv.cvtColor(mat, rgbMat, cv.COLOR_BGRA2RGBA);
  }

  // Get raw pixel data
  const data = Buffer.from(rgbMat.data);
  const { rows: height, cols: width } = rgbMat;
  const channels = rgbMat.channels();

  // Clean up temporary Mat if we created one
  if (rgbMat !== mat) {
    rgbMat.delete();
  }

  // Use sharp to encode
  const sharpInstance = sharp(data, {
    raw: {
      width,
      height,
      channels: channels as 1 | 2 | 3 | 4,
    },
  });

  if (format === 'jpeg') {
    return sharpInstance.jpeg({ quality: 90 }).toBuffer();
  } else {
    return sharpInstance.png().toBuffer();
  }
}

/**
 * Resize a Mat if it exceeds max dimension
 *
 * @param mat - Input Mat
 * @param maxDimension - Maximum width or height
 * @returns Resized Mat (or original if already small enough)
 */
export function resizeIfNeeded(
  mat: InstanceType<typeof import('@techstark/opencv-js').Mat>,
  maxDimension: number
): InstanceType<typeof import('@techstark/opencv-js').Mat> {
  const cv = getCV();

  const { rows: height, cols: width } = mat;
  const maxSide = Math.max(width, height);

  if (maxSide <= maxDimension) {
    return mat;
  }

  const scale = maxDimension / maxSide;
  const newWidth = Math.round(width * scale);
  const newHeight = Math.round(height * scale);

  const resized = new cv.Mat();
  cv.resize(mat, resized, new cv.Size(newWidth, newHeight), 0, 0, cv.INTER_AREA);

  return resized;
}

/**
 * Crop a region from a Mat
 *
 * @param mat - Source Mat
 * @param x - Left edge
 * @param y - Top edge
 * @param width - Width of region
 * @param height - Height of region
 * @returns Cropped Mat (caller must delete)
 */
export function cropRegion(
  mat: InstanceType<typeof import('@techstark/opencv-js').Mat>,
  x: number,
  y: number,
  width: number,
  height: number
): InstanceType<typeof import('@techstark/opencv-js').Mat> {
  const cv = getCV();

  // Clamp bounds to image dimensions
  const clampedX = Math.max(0, Math.min(x, mat.cols - 1));
  const clampedY = Math.max(0, Math.min(y, mat.rows - 1));
  const clampedWidth = Math.min(width, mat.cols - clampedX);
  const clampedHeight = Math.min(height, mat.rows - clampedY);

  const rect = new cv.Rect(clampedX, clampedY, clampedWidth, clampedHeight);
  const cropped = mat.roi(rect);

  // Clone to get independent Mat
  const result = cropped.clone();
  cropped.delete();

  return result;
}
