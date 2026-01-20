import Tesseract from 'tesseract.js';

export interface OCRResult {
  text: string;
  confidence: number;
  source: 'tesseract';
}

/**
 * Extract text from an image using Tesseract.js
 *
 * @param imageBuffer - Image data as Buffer or base64 string
 * @returns Extracted text and confidence score
 */
export async function extractText(
  imageBuffer: Buffer | string
): Promise<OCRResult> {
  // Tesseract.js accepts Buffer, base64 string, or file path
  const result = await Tesseract.recognize(imageBuffer, 'eng', {
    // Page segmentation mode 6: Assume a single uniform block of text
    // Good for book spines which are typically one column of text
    // Other useful modes:
    //   4 = single column of variable-sized text
    //   7 = single text line
    //   11 = sparse text, find as much text as possible
  });

  return {
    text: result.data.text.trim(),
    confidence: result.data.confidence,
    source: 'tesseract',
  };
}

/**
 * Extract text from multiple images in parallel
 * Useful for processing multiple spine crops at once
 *
 * @param images - Array of image buffers
 * @returns Array of OCR results in same order as input
 */
export async function extractTextBatch(
  images: (Buffer | string)[]
): Promise<OCRResult[]> {
  // Process in parallel for better performance
  const results = await Promise.all(
    images.map(img => extractText(img))
  );
  return results;
}
