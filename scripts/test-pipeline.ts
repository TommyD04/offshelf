/**
 * Test script for Phase 1 of the spine processing pipeline
 *
 * Usage:
 *   npx tsx scripts/test-pipeline.ts <path-to-spine-image>
 *
 * Example:
 *   npx tsx scripts/test-pipeline.ts ./test-images/spine1.jpg
 *
 * This will:
 * 1. Load the image
 * 2. Enhance it (normalize, sharpen, grayscale)
 * 3. Run Tesseract OCR
 * 4. Send OCR text to Claude for interpretation
 * 5. Print the results
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { readFileSync } from 'fs';

async function main() {
  const imagePath = process.argv[2];

  if (!imagePath) {
    console.error('Usage: npx tsx scripts/test-pipeline.ts <path-to-spine-image>');
    console.error('');
    console.error('Example:');
    console.error('  npx tsx scripts/test-pipeline.ts ./test-images/spine1.jpg');
    process.exit(1);
  }

  console.log(`\nProcessing: ${imagePath}\n`);
  console.log('='.repeat(50));

  try {
    // Dynamic import after dotenv has loaded
    const { processSpineImage } = await import('../lib/pipeline');

    // Read the image file
    const imageBuffer = readFileSync(imagePath);
    console.log(`Image size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

    // Process through the pipeline
    console.log('\nStep 1: Enhancing image...');
    console.log('Step 2: Running OCR...');
    const result = await processSpineImage(imageBuffer);
    console.log('Step 3: Interpreting with Claude...');

    // Print results
    console.log('\n' + '='.repeat(50));
    console.log('RESULTS');
    console.log('='.repeat(50));

    console.log('\nOCR Output:');
    console.log('-'.repeat(30));
    console.log(result.ocr.text || '(no text detected)');
    console.log(`\nOCR Confidence: ${result.ocr.confidence.toFixed(1)}%`);

    console.log('\nParsed Book Info:');
    console.log('-'.repeat(30));
    console.log(`Title:      ${result.book.title || '(unknown)'}`);
    console.log(`Author:     ${result.book.author || '(unknown)'}`);
    console.log(`Confidence: ${result.book.confidence}`);

    console.log('\n' + '='.repeat(50));
    console.log('Pipeline test complete!');

  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
