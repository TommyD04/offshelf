/**
 * Offshelf Image Processing Pipeline
 *
 * Architecture:
 * Image → Detect Spines → Crop Each → Rectify → Enhance → OCR → Interpret → JSON
 *
 * Phase 1: Manual crop → OCR → Interpret
 * Phase 2 (current): Add spine detection with OpenCV
 * Phase 3: Add rectification and enhancement
 */

import sharp from 'sharp';
import { extractText, OCRResult } from '../ocr/textExtractor';
import { parseBookFromOCR, ParsedBook } from '../interpret/bookParser';
import { detectSpines, DetectionConfig } from './detection';

export interface SpineResult {
  // The parsed book information
  book: ParsedBook;
  // Raw OCR output
  ocr: OCRResult;
  // Base64 encoded spine crop for UI display
  spineImageBase64: string;
  // Numeric confidence (0-1) derived from text confidence
  confidence: number;
}

export interface PipelineResult {
  imageId: string;
  processedAt: string;
  spines: SpineResult[];
  summary: {
    total: number;
    highConfidence: number;
    mediumConfidence: number;
    lowConfidence: number;
  };
}

/**
 * Convert confidence string to numeric value
 */
function confidenceToNumber(confidence: 'high' | 'medium' | 'low'): number {
  switch (confidence) {
    case 'high':
      return 0.9;
    case 'medium':
      return 0.7;
    case 'low':
      return 0.4;
  }
}

/**
 * Phase 1: Process a single pre-cropped spine image
 *
 * Takes an already-cropped spine image and runs it through:
 * 1. Enhancement (normalize, sharpen)
 * 2. OCR (Tesseract)
 * 3. Interpretation (Claude parses title/author)
 *
 * @param imageBuffer - The spine image as a Buffer
 * @returns Processed spine result with book info
 */
export async function processSpineImage(
  imageBuffer: Buffer
): Promise<SpineResult> {
  // Step 1: Enhance the image for better OCR
  const enhanced = await sharp(imageBuffer)
    .normalize() // Stretch histogram for better contrast
    .sharpen({ sigma: 1.0 }) // Mild sharpen for small text
    .grayscale() // OCR works better on grayscale
    .toBuffer();

  // Step 2: Run OCR
  const ocr = await extractText(enhanced);

  // Step 3: Parse the OCR text into structured book info
  const book = await parseBookFromOCR(ocr.text);

  // Create base64 of the original crop for UI display
  const spineImageBase64 = imageBuffer.toString('base64');

  const confidence = confidenceToNumber(book.confidence);

  return {
    book,
    ocr,
    spineImageBase64,
    confidence,
  };
}

/**
 * Phase 1: Process multiple pre-cropped spine images
 *
 * @param images - Array of spine image buffers
 * @param imageId - Identifier for this batch
 * @returns Full pipeline result
 */
export async function processSpineImages(
  images: Buffer[],
  imageId: string
): Promise<PipelineResult> {
  const spines: SpineResult[] = [];

  // Process each spine
  for (const img of images) {
    const result = await processSpineImage(img);
    spines.push(result);
  }

  // Calculate summary
  const summary = {
    total: spines.length,
    highConfidence: spines.filter(s => s.confidence >= 0.85).length,
    mediumConfidence: spines.filter(s => s.confidence >= 0.6 && s.confidence < 0.85).length,
    lowConfidence: spines.filter(s => s.confidence < 0.6).length,
  };

  return {
    imageId,
    processedAt: new Date().toISOString(),
    spines,
    summary,
  };
}

/**
 * Phase 2: Process a full bookshelf image
 *
 * Pipeline:
 * 1. Detect spine regions using OpenCV edge detection
 * 2. Crop each detected spine
 * 3. Enhance and OCR each spine (using Phase 1 pipeline)
 * 4. Return structured results
 *
 * @param imageBuffer - Full bookshelf image as Buffer
 * @param imageId - Unique identifier for this image
 * @param detectionConfig - Optional configuration for spine detection
 * @returns Full pipeline result with all detected books
 */
export async function processBookshelfImage(
  imageBuffer: Buffer,
  imageId: string,
  detectionConfig?: Partial<DetectionConfig>
): Promise<PipelineResult> {
  // Step 1: Detect spines using OpenCV
  const detection = await detectSpines(imageBuffer, detectionConfig);

  // Step 2 & 3: Process each detected spine through Phase 1 pipeline
  const spines: SpineResult[] = [];

  for (const detectedSpine of detection.spines) {
    try {
      const result = await processSpineImage(detectedSpine.imageBuffer);
      spines.push(result);
    } catch (error) {
      // Log error but continue processing other spines
      console.error(`Error processing spine ${detectedSpine.index}:`, error);
    }
  }

  // Calculate summary
  const summary = {
    total: spines.length,
    highConfidence: spines.filter(s => s.confidence >= 0.85).length,
    mediumConfidence: spines.filter(s => s.confidence >= 0.6 && s.confidence < 0.85).length,
    lowConfidence: spines.filter(s => s.confidence < 0.6).length,
  };

  return {
    imageId,
    processedAt: new Date().toISOString(),
    spines,
    summary,
  };
}

// Re-export detection types for convenience
export { DetectionConfig } from './detection';
