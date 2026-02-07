import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic();

export interface ParsedBook {
  title: string;
  author: string;
  confidence: 'high' | 'medium' | 'low';
  rawOcrText: string;
}

const PARSE_PROMPT = `You are extracting book information from OCR text taken from a book spine.

The text may have:
- OCR errors (misread characters, merged words)
- Unusual formatting (ALL CAPS, mixed case, line breaks)
- Extra text (publisher names, series titles, award seals)
- Author name larger than title or vice versa

Your job: identify the book TITLE and AUTHOR from this messy text.

Rules:
1. Title is usually the most prominent text (but not always)
2. Author name often appears at top or bottom of spine
3. Ignore publisher names, "A Novel", "New York Times Bestseller", etc.
4. If author is unclear, use empty string ""
5. Return your confidence: high (clear), medium (some guessing), low (very uncertain)

Return ONLY valid JSON:
{
  "title": "The Book Title",
  "author": "Author Name",
  "confidence": "high"
}`;

/**
 * Parse raw OCR text into structured book information using Claude
 *
 * @param ocrText - Raw text extracted from book spine via OCR
 * @returns Parsed book title, author, and confidence
 */
export async function parseBookFromOCR(ocrText: string): Promise<ParsedBook> {
  // Guard: skip Claude API if OCR produced no usable text
  const cleanedText = ocrText.replace(/[^a-zA-Z]/g, '').trim();
  if (cleanedText.length < 3) {
    return {
      title: '',
      author: '',
      confidence: 'low',
      rawOcrText: ocrText,
    };
  }

  const response = await anthropic.messages.create({
    model: 'claude-3-haiku-20240307', // Fast and cost-effective for this task
    max_tokens: 200,
    messages: [
      {
        role: 'user',
        content: `${PARSE_PROMPT}\n\nOCR Text:\n${ocrText}`,
      },
    ],
  });

  const textBlock = response.content.find(block => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude');
  }

  let jsonText = textBlock.text.trim();

  // Remove markdown code block if present
  if (jsonText.startsWith('```')) {
    jsonText = jsonText.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  try {
    const parsed = JSON.parse(jsonText) as {
      title: string;
      author: string;
      confidence: 'high' | 'medium' | 'low';
    };

    return {
      title: parsed.title || '',
      author: parsed.author || '',
      confidence: parsed.confidence || 'low',
      rawOcrText: ocrText,
    };
  } catch {
    // If parsing fails, return what we have with low confidence
    return {
      title: ocrText.split('\n')[0] || ocrText,
      author: '',
      confidence: 'low',
      rawOcrText: ocrText,
    };
  }
}

/**
 * Parse multiple OCR results into book information
 * Processes sequentially to avoid rate limits
 *
 * @param ocrTexts - Array of raw OCR texts
 * @returns Array of parsed books
 */
export async function parseBooksBatch(ocrTexts: string[]): Promise<ParsedBook[]> {
  const results: ParsedBook[] = [];

  for (const text of ocrTexts) {
    if (text.trim()) {
      const parsed = await parseBookFromOCR(text);
      results.push(parsed);
    }
  }

  return results;
}
