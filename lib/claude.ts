import Anthropic from '@anthropic-ai/sdk';
import { AnalysisResult } from './types';

// TODO: Install the Anthropic SDK: npm install @anthropic-ai/sdk

// Initialize the Anthropic client
// The SDK automatically reads ANTHROPIC_API_KEY from environment
const anthropic = new Anthropic();

// The prompt that instructs Claude how to analyze bookshelf images
// This prompt structure was validated in your testing
const ANALYSIS_PROMPT = `Analyze this bookshelf image and identify all visible books.

For each book, extract:
- title: The book's title as best you can read it
- author: The author's name if visible
- confidence: Your confidence in the identification (0-1 scale)
- flags: Any issues like "partial_spine", "author_uncertain", "stacked", "glare"
- spine_text_raw: The exact text you can read on the spine

Organize books by shelf section (top_shelf, middle_shelf, bottom_shelf, etc.) and number their positions left-to-right.

Return ONLY valid JSON matching this structure:
{
  "image_id": "user_provided_id",
  "processed_at": "ISO timestamp",
  "shelf_sections": [
    {
      "section": "top_shelf",
      "books": [
        {
          "position": 1,
          "title": "Book Title",
          "author": "Author Name",
          "confidence": 0.95,
          "flags": [],
          "spine_text_raw": "BOOK TITLE AUTHOR NAME"
        }
      ]
    }
  ],
  "summary": {
    "total_detected": 0,
    "high_confidence": 0,
    "medium_confidence": 0,
    "low_confidence": 0,
    "flagged_for_review": 0
  }
}

Use these confidence thresholds:
- 0.75+: High confidence - title and author clearly readable
- 0.50-0.74: Medium confidence - some uncertainty, flag for review
- Below 0.50: Low confidence - significant uncertainty

Count books by confidence level in the summary. Flag any book with confidence below 0.75 for review.`;

/**
 * Analyze a bookshelf image using Claude Vision API
 *
 * @param imageBase64 - Base64 encoded image data
 * @param imageId - Identifier for this image (e.g., filename)
 * @param mediaType - Image MIME type (image/jpeg, image/png, etc.)
 * @returns Structured analysis result
 */
export async function analyzeBookshelf(
  imageBase64: string,
  imageId: string,
  mediaType: 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp' = 'image/jpeg'
): Promise<AnalysisResult> {
  // TODO: Implement the actual API call
  //
  // The structure should be:
  // const response = await anthropic.messages.create({
  //   model: 'claude-sonnet-4-20250514',
  //   max_tokens: 4096,
  //   messages: [
  //     {
  //       role: 'user',
  //       content: [
  //         {
  //           type: 'image',
  //           source: {
  //             type: 'base64',
  //             media_type: mediaType,
  //             data: imageBase64,
  //           },
  //         },
  //         {
  //           type: 'text',
  //           text: ANALYSIS_PROMPT.replace('user_provided_id', imageId),
  //         },
  //       ],
  //     },
  //   ],
  // });
  //
  // Then parse the JSON from response.content[0].text
  // Handle potential JSON parsing errors gracefully

  // Placeholder return for scaffolding
  throw new Error('TODO: Implement Claude Vision API call');
}

/**
 * Validate that a response matches our expected structure
 * Useful for catching API changes or unexpected responses
 */
export function validateAnalysisResult(data: unknown): data is AnalysisResult {
  // TODO: Implement validation
  // Check that all required fields exist and have correct types
  // This helps catch issues early rather than failing in the UI

  if (!data || typeof data !== 'object') return false;

  const result = data as Record<string, unknown>;

  return (
    typeof result.image_id === 'string' &&
    typeof result.processed_at === 'string' &&
    Array.isArray(result.shelf_sections) &&
    typeof result.summary === 'object'
  );
}
