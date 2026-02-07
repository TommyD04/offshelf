/**
 * Spine Detection Module
 *
 * Main orchestrator for detecting book spines in bookshelf images.
 * Segments the image into shelf rows, then detects spines within each row.
 */

import sharp from 'sharp';
import { initOpenCV } from '../opencv/loader';
import { bufferToMat, resizeIfNeeded, matToBuffer, cropRegion } from '../opencv/utils';
import {
  detectVerticalLines,
  detectShelfRows,
  DetectionConfig,
  DEFAULT_CONFIG,
  DetectedLine,
  ShelfRow,
} from '../opencv/lineDetection';
import { extractSpines, DetectedSpine } from '../opencv/spineExtractor';

export interface DetectionResult {
  spines: DetectedSpine[];
  filteredCount: number;
  shelfRows: ShelfRow[];
  debugInfo: {
    imageWidth: number;
    imageHeight: number;
    resizedWidth: number;
    resizedHeight: number;
    shelfRowsDetected: number;
    totalLinesDetected: number;
    processingTimeMs: number;
  };
  edgesImageBuffer?: Buffer;
}

export { DetectionConfig, DEFAULT_CONFIG, DetectedLine, DetectedSpine };

/**
 * Detect book spines in a bookshelf image
 *
 * Pipeline:
 * 1. Resize for performance
 * 2. Detect horizontal shelf separators
 * 3. For each shelf row, detect vertical spine edges
 * 4. Extract spine regions from the original (full-res) image
 *
 * @param imageBuffer - Full bookshelf image as Buffer
 * @param config - Optional detection configuration
 * @param includeDebugImage - Whether to include edge detection visualization
 * @returns Detection result with cropped spine images
 */
export async function detectSpines(
  imageBuffer: Buffer,
  config: Partial<DetectionConfig> = {},
  includeDebugImage: boolean = false
): Promise<DetectionResult> {
  const startTime = Date.now();
  const fullConfig: DetectionConfig = { ...DEFAULT_CONFIG, ...config };

  await initOpenCV();

  const originalMat = await bufferToMat(imageBuffer);
  const originalWidth = originalMat.cols;
  const originalHeight = originalMat.rows;

  const resizedMat = resizeIfNeeded(originalMat, fullConfig.maxImageDimension);
  const resizedWidth = resizedMat.cols;
  const resizedHeight = resizedMat.rows;

  const scaleX = originalWidth / resizedWidth;
  const scaleY = originalHeight / resizedHeight;

  // Step 1: Detect shelf rows (horizontal separators)
  const shelfRows = detectShelfRows(resizedMat, fullConfig);

  // Step 2: For each shelf row, detect vertical lines and extract spines
  let allSpines: DetectedSpine[] = [];
  let totalLines = 0;
  let lastEdgesMat: InstanceType<typeof import('@techstark/opencv-js').Mat> | null = null;

  for (const row of shelfRows) {
    // Crop the shelf row from the resized image
    const rowMat = cropRegion(resizedMat, 0, row.y, resizedWidth, row.height);

    // Detect vertical lines within this row
    const { lines, edgesMat } = detectVerticalLines(rowMat, fullConfig);
    totalLines += lines.length;
    rowMat.delete();

    // Keep last edges for debug image
    if (lastEdgesMat) lastEdgesMat.delete();
    lastEdgesMat = edgesMat;

    // Scale lines back to original image coordinates
    const scaledLines: DetectedLine[] = lines.map(line => ({
      x1: Math.round(line.x1 * scaleX),
      y1: Math.round((line.y1 + row.y) * scaleY),
      x2: Math.round(line.x2 * scaleX),
      y2: Math.round((line.y2 + row.y) * scaleY),
      angle: line.angle,
      avgX: line.avgX * scaleX,
    }));

    // Scale the row boundaries to original image
    const originalRowY = Math.round(row.y * scaleY);
    const originalRowHeight = Math.round(row.height * scaleY);

    // Crop the shelf row from the original image
    const originalRowMat = cropRegion(originalMat, 0, originalRowY, originalWidth, originalRowHeight);

    // Adjust line positions relative to this row
    const rowRelativeLines: DetectedLine[] = scaledLines.map(line => ({
      ...line,
      y1: line.y1 - originalRowY,
      y2: line.y2 - originalRowY,
    }));

    // Extract spines from this row
    const rowSpines = await extractSpines(originalRowMat, rowRelativeLines, fullConfig);
    originalRowMat.delete();

    // Adjust spine bounding boxes to absolute image coordinates
    for (const spine of rowSpines) {
      spine.boundingBox.y += originalRowY;
      spine.index = allSpines.length + spine.index;
    }

    allSpines = allSpines.concat(rowSpines);
  }

  // Build debug image
  let edgesImageBuffer: Buffer | undefined;
  if (includeDebugImage && lastEdgesMat) {
    edgesImageBuffer = await matToBuffer(lastEdgesMat, 'png');
  }

  // Cleanup
  if (lastEdgesMat) lastEdgesMat.delete();
  if (resizedMat !== originalMat) resizedMat.delete();
  originalMat.delete();

  // Filter out low-quality spine crops
  const minWidth = originalWidth * 0.015; // 1.5% of image width
  const unfilteredCount = allSpines.length;

  const filteredSpines: DetectedSpine[] = [];
  for (const spine of allSpines) {
    // Too narrow to contain readable text
    if (spine.boundingBox.width < minWidth) continue;

    // Check average brightness - skip solid dark regions
    const stats = await sharp(spine.imageBuffer).stats();
    const avgBrightness = stats.channels.reduce((sum, ch) => sum + ch.mean, 0) / stats.channels.length;
    if (avgBrightness < 20) continue; // Nearly black

    filteredSpines.push(spine);
  }

  // Re-index filtered spines
  filteredSpines.forEach((spine, i) => { spine.index = i; });

  // Scale shelf rows back to original dimensions for reporting
  const originalShelfRows: ShelfRow[] = shelfRows.map(row => ({
    y: Math.round(row.y * scaleY),
    height: Math.round(row.height * scaleY),
  }));

  return {
    spines: filteredSpines,
    filteredCount: unfilteredCount - filteredSpines.length,
    shelfRows: originalShelfRows,
    debugInfo: {
      imageWidth: originalWidth,
      imageHeight: originalHeight,
      resizedWidth,
      resizedHeight,
      shelfRowsDetected: shelfRows.length,
      totalLinesDetected: totalLines,
      processingTimeMs: Date.now() - startTime,
    },
    edgesImageBuffer,
  };
}

export function getDefaultConfig(): DetectionConfig {
  return { ...DEFAULT_CONFIG };
}
