/**
 * Spine Extractor Module
 *
 * Extracts book spine regions from detected vertical lines.
 * Calculates gaps between lines and crops spine regions.
 */

import { DetectedLine, DetectionConfig, DEFAULT_CONFIG } from './lineDetection';
import { cropRegion, matToBuffer } from './utils';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DetectedSpine {
  index: number;
  boundingBox: BoundingBox;
  imageBuffer: Buffer;
  leftEdge: DetectedLine | null;
  rightEdge: DetectedLine | null;
}

/**
 * Calculate spine regions from detected vertical lines
 *
 * @param lines - Sorted array of detected vertical lines (left to right)
 * @param imageWidth - Width of the original image
 * @param imageHeight - Height of the original image
 * @param config - Detection configuration
 * @returns Array of bounding boxes for spine regions
 */
export function calculateSpineRegions(
  lines: DetectedLine[],
  imageWidth: number,
  imageHeight: number,
  config: DetectionConfig = DEFAULT_CONFIG
): { boundingBox: BoundingBox; leftEdge: DetectedLine | null; rightEdge: DetectedLine | null }[] {
  const minWidth = imageWidth * (config.minSpineWidthPercent / 100);
  const maxWidth = imageWidth * (config.maxSpineWidthPercent / 100);

  const regions: { boundingBox: BoundingBox; leftEdge: DetectedLine | null; rightEdge: DetectedLine | null }[] = [];

  // If no lines detected, treat entire image as one potential spine
  if (lines.length === 0) {
    return [{
      boundingBox: { x: 0, y: 0, width: imageWidth, height: imageHeight },
      leftEdge: null,
      rightEdge: null,
    }];
  }

  // Check region before first line
  const firstLine = lines[0];
  if (firstLine.avgX > minWidth && firstLine.avgX < maxWidth) {
    regions.push({
      boundingBox: {
        x: 0,
        y: 0,
        width: Math.round(firstLine.avgX),
        height: imageHeight,
      },
      leftEdge: null,
      rightEdge: firstLine,
    });
  }

  // Check gaps between consecutive lines
  for (let i = 0; i < lines.length - 1; i++) {
    const leftLine = lines[i];
    const rightLine = lines[i + 1];
    const gapWidth = rightLine.avgX - leftLine.avgX;

    // Check if gap is a valid spine width
    if (gapWidth >= minWidth && gapWidth <= maxWidth) {
      regions.push({
        boundingBox: {
          x: Math.round(leftLine.avgX),
          y: 0,
          width: Math.round(gapWidth),
          height: imageHeight,
        },
        leftEdge: leftLine,
        rightEdge: rightLine,
      });
    }
  }

  // Check region after last line
  const lastLine = lines[lines.length - 1];
  const rightGap = imageWidth - lastLine.avgX;
  if (rightGap > minWidth && rightGap < maxWidth) {
    regions.push({
      boundingBox: {
        x: Math.round(lastLine.avgX),
        y: 0,
        width: Math.round(rightGap),
        height: imageHeight,
      },
      leftEdge: lastLine,
      rightEdge: null,
    });
  }

  return regions;
}

/**
 * Extract spine images from the original image
 *
 * @param originalMat - Original image as OpenCV Mat
 * @param lines - Detected vertical lines
 * @param config - Detection configuration
 * @returns Array of detected spines with cropped image buffers
 */
export async function extractSpines(
  originalMat: InstanceType<typeof import('@techstark/opencv-js').Mat>,
  lines: DetectedLine[],
  config: DetectionConfig = DEFAULT_CONFIG
): Promise<DetectedSpine[]> {
  const { rows: height, cols: width } = originalMat;

  // Calculate spine regions
  const regions = calculateSpineRegions(lines, width, height, config);

  // Extract each spine
  const spines: DetectedSpine[] = [];

  for (let i = 0; i < regions.length; i++) {
    const { boundingBox, leftEdge, rightEdge } = regions[i];

    // Crop the region
    const croppedMat = cropRegion(
      originalMat,
      boundingBox.x,
      boundingBox.y,
      boundingBox.width,
      boundingBox.height
    );

    // Convert to buffer
    const imageBuffer = await matToBuffer(croppedMat, 'jpeg');
    croppedMat.delete();

    spines.push({
      index: i,
      boundingBox,
      imageBuffer,
      leftEdge,
      rightEdge,
    });
  }

  return spines;
}

/**
 * Add padding to spine regions for better OCR
 *
 * @param boundingBox - Original bounding box
 * @param padding - Padding in pixels
 * @param imageWidth - Maximum width constraint
 * @param imageHeight - Maximum height constraint
 * @returns Padded bounding box
 */
export function addPadding(
  boundingBox: BoundingBox,
  padding: number,
  imageWidth: number,
  imageHeight: number
): BoundingBox {
  return {
    x: Math.max(0, boundingBox.x - padding),
    y: Math.max(0, boundingBox.y - padding),
    width: Math.min(imageWidth - boundingBox.x + padding, boundingBox.width + padding * 2),
    height: Math.min(imageHeight - boundingBox.y + padding, boundingBox.height + padding * 2),
  };
}
