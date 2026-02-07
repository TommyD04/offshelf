/**
 * Line Detection Module
 *
 * Detects vertical lines in images using Canny edge detection
 * and Hough transform. Optimized for book spine edges.
 */

import { getCV } from './loader';

export interface DetectionConfig {
  // Spine width constraints (as percentage of image width)
  minSpineWidthPercent: number;
  maxSpineWidthPercent: number;
  // Line detection parameters
  verticalAngleTolerance: number; // degrees from vertical
  minLineLengthPercent: number; // as percentage of image height
  // Edge detection tuning
  cannyLowThreshold: number;
  cannyHighThreshold: number;
  // Performance
  maxImageDimension: number;
}

export const DEFAULT_CONFIG: DetectionConfig = {
  minSpineWidthPercent: 0.8,
  maxSpineWidthPercent: 12,
  verticalAngleTolerance: 15,
  minLineLengthPercent: 15,
  cannyLowThreshold: 30,
  cannyHighThreshold: 120,
  maxImageDimension: 2000,
};

export interface DetectedLine {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  angle: number; // degrees from horizontal (90 = vertical)
  avgX: number; // average x position for sorting
}

/**
 * Preprocess image for edge detection
 * Converts to grayscale and applies blur + contrast enhancement
 */
export function preprocessImage(
  mat: InstanceType<typeof import('@techstark/opencv-js').Mat>
): InstanceType<typeof import('@techstark/opencv-js').Mat> {
  const cv = getCV();

  // Convert to grayscale
  const gray = new cv.Mat();
  if (mat.channels() > 1) {
    cv.cvtColor(mat, gray, cv.COLOR_BGR2GRAY);
  } else {
    mat.copyTo(gray);
  }

  // Apply Gaussian blur to reduce noise
  const blurred = new cv.Mat();
  cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0);
  gray.delete();

  // Apply contrast enhancement
  // CLAHE may not be available in all OpenCV.js builds
  let enhanced: InstanceType<typeof import('@techstark/opencv-js').Mat>;
  if (typeof cv.CLAHE === 'function') {
    const clahe = new cv.CLAHE(2.0, new cv.Size(8, 8));
    enhanced = new cv.Mat();
    clahe.apply(blurred, enhanced);
    clahe.delete();
  } else {
    // Fallback: use histogram equalization
    enhanced = new cv.Mat();
    cv.equalizeHist(blurred, enhanced);
  }
  blurred.delete();

  return enhanced;
}

/**
 * Detect edges using Canny algorithm
 */
export function detectEdges(
  mat: InstanceType<typeof import('@techstark/opencv-js').Mat>,
  config: DetectionConfig
): InstanceType<typeof import('@techstark/opencv-js').Mat> {
  const cv = getCV();

  const edges = new cv.Mat();
  cv.Canny(mat, edges, config.cannyLowThreshold, config.cannyHighThreshold);

  // Apply morphological operations to connect edge fragments
  const kernel = cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(1, 3));
  const dilated = new cv.Mat();
  cv.dilate(edges, dilated, kernel);
  kernel.delete();
  edges.delete();

  return dilated;
}

/**
 * Find vertical lines using Hough transform
 */
export function findVerticalLines(
  edges: InstanceType<typeof import('@techstark/opencv-js').Mat>,
  config: DetectionConfig
): DetectedLine[] {
  const cv = getCV();

  const { rows: height, cols: width } = edges;
  const minLineLength = Math.floor(height * (config.minLineLengthPercent / 100));
  const maxLineGap = 30;

  // Probabilistic Hough Transform
  const lines = new cv.Mat();
  cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 30, minLineLength, maxLineGap);

  const detectedLines: DetectedLine[] = [];
  const verticalTolerance = config.verticalAngleTolerance;

  for (let i = 0; i < lines.rows; i++) {
    const x1 = lines.data32S[i * 4];
    const y1 = lines.data32S[i * 4 + 1];
    const x2 = lines.data32S[i * 4 + 2];
    const y2 = lines.data32S[i * 4 + 3];

    // Calculate angle from horizontal (90 degrees = vertical)
    const deltaX = x2 - x1;
    const deltaY = y2 - y1;
    const angle = Math.abs(Math.atan2(deltaX, deltaY) * (180 / Math.PI));

    // Filter for near-vertical lines (within tolerance of 90 degrees)
    if (angle <= verticalTolerance || angle >= 180 - verticalTolerance) {
      detectedLines.push({
        x1,
        y1,
        x2,
        y2,
        angle: 90 - angle, // Convert to deviation from vertical
        avgX: (x1 + x2) / 2,
      });
    }
  }

  lines.delete();

  return detectedLines;
}

/**
 * Merge nearby parallel lines into single lines
 */
export function mergeNearbyLines(
  lines: DetectedLine[],
  mergeThreshold: number = 8
): DetectedLine[] {
  if (lines.length === 0) return [];

  // Sort by average x position
  const sorted = [...lines].sort((a, b) => a.avgX - b.avgX);

  const merged: DetectedLine[] = [];
  let currentGroup: DetectedLine[] = [sorted[0]];

  for (let i = 1; i < sorted.length; i++) {
    const current = sorted[i];
    const lastInGroup = currentGroup[currentGroup.length - 1];

    // If this line is close to the group, add to group
    if (Math.abs(current.avgX - lastInGroup.avgX) <= mergeThreshold) {
      currentGroup.push(current);
    } else {
      // Merge the group and start a new one
      merged.push(mergeGroup(currentGroup));
      currentGroup = [current];
    }
  }

  // Don't forget the last group
  merged.push(mergeGroup(currentGroup));

  return merged;
}

/**
 * Merge a group of lines into a single representative line
 */
function mergeGroup(lines: DetectedLine[]): DetectedLine {
  if (lines.length === 1) return lines[0];

  // Average the positions
  const avgX1 = lines.reduce((sum, l) => sum + l.x1, 0) / lines.length;
  const avgY1 = Math.min(...lines.map(l => Math.min(l.y1, l.y2)));
  const avgX2 = lines.reduce((sum, l) => sum + l.x2, 0) / lines.length;
  const avgY2 = Math.max(...lines.map(l => Math.max(l.y1, l.y2)));
  const avgAngle = lines.reduce((sum, l) => sum + l.angle, 0) / lines.length;
  const avgX = (avgX1 + avgX2) / 2;

  return {
    x1: Math.round(avgX1),
    y1: Math.round(avgY1),
    x2: Math.round(avgX2),
    y2: Math.round(avgY2),
    angle: avgAngle,
    avgX,
  };
}

/**
 * A detected shelf row (horizontal region of the image)
 */
export interface ShelfRow {
  y: number;      // top edge
  height: number; // row height
}

/**
 * Find horizontal lines (shelf separators) using Hough transform
 *
 * Only detects strong, long horizontal lines that likely represent
 * shelf boundaries — not book edges or text.
 */
export function findHorizontalLines(
  edges: InstanceType<typeof import('@techstark/opencv-js').Mat>,
  config: DetectionConfig
): DetectedLine[] {
  const cv = getCV();

  const { rows: height, cols: width } = edges;
  // Shelf separator must span at least 50% of image width
  const minLineLength = Math.floor(width * 0.5);
  const maxLineGap = 50;

  const lines = new cv.Mat();
  // Higher threshold (100) to only pick up strong horizontal edges
  cv.HoughLinesP(edges, lines, 1, Math.PI / 180, 100, minLineLength, maxLineGap);

  const horizontalLines: DetectedLine[] = [];

  for (let i = 0; i < lines.rows; i++) {
    const x1 = lines.data32S[i * 4];
    const y1 = lines.data32S[i * 4 + 1];
    const x2 = lines.data32S[i * 4 + 2];
    const y2 = lines.data32S[i * 4 + 3];

    const deltaX = x2 - x1;
    const deltaY = y2 - y1;
    const angle = Math.abs(Math.atan2(deltaY, deltaX) * (180 / Math.PI));

    // Near-horizontal: within 5 degrees of horizontal
    if (angle <= 5 || angle >= 175) {
      horizontalLines.push({
        x1, y1, x2, y2,
        angle,
        avgX: (y1 + y2) / 2, // use avgX field to store avgY for sorting
      });
    }
  }

  lines.delete();
  return horizontalLines;
}

/**
 * Detect shelf rows using horizontal brightness projection
 *
 * Instead of Hough lines, this scans for dark horizontal bands
 * (shelf gaps/separators) by computing average brightness per row.
 * Much more reliable than line detection for finding shelf boundaries.
 *
 * @returns Array of shelf rows sorted top to bottom
 */
export function detectShelfRows(
  mat: InstanceType<typeof import('@techstark/opencv-js').Mat>,
  config: DetectionConfig = DEFAULT_CONFIG
): ShelfRow[] {
  const cv = getCV();
  const { rows: height, cols: width } = mat;
  const fullImage: ShelfRow[] = [{ y: 0, height }];

  // Convert to grayscale
  let gray: InstanceType<typeof import('@techstark/opencv-js').Mat>;
  if (mat.channels() > 1) {
    gray = new cv.Mat();
    cv.cvtColor(mat, gray, cv.COLOR_BGR2GRAY);
  } else {
    gray = mat.clone();
  }

  // Compute average brightness for each row
  const rowBrightness: number[] = [];
  for (let y = 0; y < height; y++) {
    let sum = 0;
    for (let x = 0; x < width; x++) {
      sum += gray.ucharAt(y, x);
    }
    rowBrightness.push(sum / width);
  }
  gray.delete();

  // Smooth the brightness profile to reduce noise
  const smoothWindow = Math.floor(height * 0.01) || 1;
  const smoothed: number[] = [];
  for (let i = 0; i < height; i++) {
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - smoothWindow); j <= Math.min(height - 1, i + smoothWindow); j++) {
      sum += rowBrightness[j];
      count++;
    }
    smoothed.push(sum / count);
  }

  // Find the overall average brightness
  const avgBrightness = smoothed.reduce((a, b) => a + b, 0) / smoothed.length;

  // Dark threshold: rows significantly darker than average are gaps
  const darkThreshold = avgBrightness * 0.4;

  // Find dark bands (contiguous dark rows)
  const darkBands: { start: number; end: number }[] = [];
  let bandStart = -1;

  for (let y = 0; y < height; y++) {
    if (smoothed[y] < darkThreshold) {
      if (bandStart === -1) bandStart = y;
    } else {
      if (bandStart !== -1) {
        const bandHeight = y - bandStart;
        // Band must be at least 1% of image height to be a real gap
        if (bandHeight > height * 0.01) {
          darkBands.push({ start: bandStart, end: y });
        }
        bandStart = -1;
      }
    }
  }
  // Close any open band
  if (bandStart !== -1 && height - bandStart > height * 0.01) {
    darkBands.push({ start: bandStart, end: height });
  }

  // Filter: only keep dark bands in the middle 70% of the image
  const margin = height * 0.15;
  const separators = darkBands.filter(b => {
    const center = (b.start + b.end) / 2;
    return center > margin && center < height - margin;
  });

  if (separators.length === 0) {
    return fullImage;
  }

  // Create rows from the bright regions between dark bands
  const rows: ShelfRow[] = [];

  // First row: top of image to first dark band
  if (separators[0].start > height * 0.1) {
    rows.push({ y: 0, height: separators[0].start });
  }

  // Rows between dark bands
  for (let i = 0; i < separators.length - 1; i++) {
    const top = separators[i].end;
    const bottom = separators[i + 1].start;
    if (bottom - top > height * 0.1) {
      rows.push({ y: top, height: bottom - top });
    }
  }

  // Last row: after last dark band to bottom
  const lastEnd = separators[separators.length - 1].end;
  if (height - lastEnd > height * 0.1) {
    rows.push({ y: lastEnd, height: height - lastEnd });
  }

  // Each row must be at least 15% of image height
  const validRows = rows.filter(r => r.height > height * 0.15);

  if (validRows.length < 2) {
    return fullImage;
  }

  return validRows;
}

/**
 * Full line detection pipeline
 */
export function detectVerticalLines(
  mat: InstanceType<typeof import('@techstark/opencv-js').Mat>,
  config: DetectionConfig = DEFAULT_CONFIG
): { lines: DetectedLine[]; edgesMat: InstanceType<typeof import('@techstark/opencv-js').Mat> } {
  // Preprocess
  const preprocessed = preprocessImage(mat);

  // Detect edges
  const edges = detectEdges(preprocessed, config);
  preprocessed.delete();

  // Find lines
  const rawLines = findVerticalLines(edges, config);

  // Merge nearby lines
  const mergedLines = mergeNearbyLines(rawLines);

  // Sort left to right
  mergedLines.sort((a, b) => a.avgX - b.avgX);

  return { lines: mergedLines, edgesMat: edges };
}
