/**
 * Test script for Phase 2: Spine Detection Pipeline
 *
 * Usage:
 *   npx tsx scripts/test-spine-detection.ts <path-to-bookshelf-image>
 *
 * Example:
 *   npx tsx scripts/test-spine-detection.ts ./test-images/bookshelf.jpg
 *
 * This will:
 * 1. Load the bookshelf image
 * 2. Detect book spines using OpenCV edge detection
 * 3. Run OCR on each detected spine
 * 4. Parse book info with Claude
 * 5. Print results and save debug images
 */

import { config } from 'dotenv';
config({ path: '.env.local' });

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, basename } from 'path';

async function main() {
  const imagePath = process.argv[2];

  if (!imagePath) {
    console.error('Usage: npx tsx scripts/test-spine-detection.ts <path-to-bookshelf-image>');
    console.error('');
    console.error('Example:');
    console.error('  npx tsx scripts/test-spine-detection.ts ./test-images/bookshelf.jpg');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(60));
  console.log('OFFSHELF SPINE DETECTION TEST');
  console.log('='.repeat(60));

  console.log(`\nInput: ${imagePath}`);

  try {
    // Read the image file
    const imageBuffer = readFileSync(imagePath);
    console.log(`Image size: ${(imageBuffer.length / 1024).toFixed(1)} KB`);

    // Dynamic imports after dotenv loads
    console.log('\nLoading OpenCV...');
    const startLoad = Date.now();
    const { detectSpines } = await import('../lib/pipeline/detection');
    const { processSpineImage } = await import('../lib/pipeline');
    console.log(`OpenCV loaded in ${Date.now() - startLoad}ms`);

    // Run spine detection
    console.log('\nStep 1: Detecting spines...');
    const detection = await detectSpines(imageBuffer, {}, true);

    console.log(`\nDetection Results:`);
    console.log(`  Image dimensions: ${detection.debugInfo.imageWidth} x ${detection.debugInfo.imageHeight}`);
    console.log(`  Processed at: ${detection.debugInfo.resizedWidth} x ${detection.debugInfo.resizedHeight}`);
    console.log(`  Shelf rows detected: ${detection.debugInfo.shelfRowsDetected}`);
    for (let i = 0; i < detection.shelfRows.length; i++) {
      const row = detection.shelfRows[i];
      console.log(`    Row ${i + 1}: y=${row.y}, height=${row.height}px`);
    }
    console.log(`  Vertical lines found: ${detection.debugInfo.totalLinesDetected}`);
    console.log(`  Spine regions detected: ${detection.spines.length} (${detection.filteredCount} filtered out)`);
    console.log(`  Detection time: ${detection.debugInfo.processingTimeMs}ms`);

    // Create output directory
    const outputDir = join(process.cwd(), 'test-output');
    if (!existsSync(outputDir)) {
      mkdirSync(outputDir, { recursive: true });
    }

    // Save debug images
    if (detection.edgesImageBuffer) {
      const edgesPath = join(outputDir, 'edges.png');
      writeFileSync(edgesPath, detection.edgesImageBuffer);
      console.log(`\nSaved edge detection image: ${edgesPath}`);
    }

    // Save individual spine crops
    const spinesDir = join(outputDir, 'spines');
    if (!existsSync(spinesDir)) {
      mkdirSync(spinesDir, { recursive: true });
    }

    for (let i = 0; i < detection.spines.length; i++) {
      const spine = detection.spines[i];
      const spinePath = join(spinesDir, `spine-${String(i + 1).padStart(2, '0')}.jpg`);
      writeFileSync(spinePath, spine.imageBuffer);
    }
    console.log(`Saved ${detection.spines.length} spine crops to: ${spinesDir}`);

    // Process each spine through OCR
    const results: { title: string; author: string; confidence: string; ocrConf: number; skipped: boolean }[] = [];

    if (detection.spines.length > 0) {
      console.log('\nStep 2: Running OCR pipeline on detected spines...');
      console.log('-'.repeat(60));

      for (let i = 0; i < detection.spines.length; i++) {
        const spine = detection.spines[i];
        console.log(`\nSpine ${i + 1}/${detection.spines.length}:`);
        console.log(`  Position: x=${spine.boundingBox.x}, width=${spine.boundingBox.width}px`);

        try {
          const result = await processSpineImage(spine.imageBuffer);

          const title = result.book.title || '(unknown)';
          const author = result.book.author || '(unknown)';
          const skipped = !result.book.title && !result.book.author;

          console.log(`  OCR Text: "${result.ocr.text.replace(/\n/g, ' ').substring(0, 50)}..."`);
          console.log(`  OCR Confidence: ${result.ocr.confidence.toFixed(1)}%`);
          console.log(`  Title: ${title}`);
          console.log(`  Author: ${author}`);
          console.log(`  Confidence: ${result.book.confidence}`);

          results.push({
            title,
            author,
            confidence: result.book.confidence,
            ocrConf: result.ocr.confidence,
            skipped,
          });
        } catch (error) {
          console.log(`  Error: ${error instanceof Error ? error.message : error}`);
          results.push({ title: '(error)', author: '(error)', confidence: 'low', ocrConf: 0, skipped: true });
        }
      }
    } else {
      console.log('\nNo spines detected. Try adjusting detection parameters.');
    }

    // Summary
    const high = results.filter(r => r.confidence === 'high' && !r.skipped).length;
    const medium = results.filter(r => r.confidence === 'medium' && !r.skipped).length;
    const low = results.filter(r => r.confidence === 'low' && !r.skipped).length;
    const skipped = results.filter(r => r.skipped).length;

    console.log('\n' + '='.repeat(60));
    console.log('SUMMARY');
    console.log('='.repeat(60));
    console.log(`  Total spines processed: ${results.length}`);
    console.log(`  Filtered out (too narrow/dark): ${detection.filteredCount}`);
    console.log(`  Skipped (no OCR text): ${skipped}`);
    console.log(`  High confidence: ${high}`);
    console.log(`  Medium confidence: ${medium}`);
    console.log(`  Low confidence: ${low}`);

    if (high + medium > 0) {
      console.log(`\nIdentified books:`);
      results
        .filter(r => !r.skipped && (r.confidence === 'high' || r.confidence === 'medium'))
        .forEach(r => {
          const authorStr = r.author !== '(unknown)' ? ` by ${r.author}` : '';
          console.log(`  [${r.confidence}] "${r.title}"${authorStr}`);
        });
    }

    console.log('\n' + '='.repeat(60));
    console.log('Test complete!');
    console.log(`Output saved to: ${outputDir}`);
    console.log('='.repeat(60) + '\n');

  } catch (error) {
    console.error('\nError:', error instanceof Error ? error.message : error);
    if (error instanceof Error && error.stack) {
      console.error('\nStack trace:', error.stack);
    }
    process.exit(1);
  }
}

main();
