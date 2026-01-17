import { NextRequest, NextResponse } from 'next/server';
import { Book } from '@/lib/types';
import { enrichBooks } from '@/lib/openLibrary';
import { appendBooks } from '@/lib/sheets';

// POST /api/save
// Receives confirmed books, enriches with Open Library, saves to Sheets

export async function POST(request: NextRequest) {
  // TODO: Implement save endpoint
  //
  // Flow:
  // 1. Receive books array and source image ID from JSON body
  // 2. Enrich books with Open Library metadata
  // 3. Save to Google Sheets
  // 4. Return summary of what was saved

  try {
    const body = await request.json();
    const { books, sourceImageId } = body as {
      books: Book[];
      sourceImageId: string;
    };

    // Validate input
    if (!books || !Array.isArray(books) || books.length === 0) {
      return NextResponse.json(
        { error: 'No books provided' },
        { status: 400 }
      );
    }

    if (!sourceImageId) {
      return NextResponse.json(
        { error: 'Source image ID required' },
        { status: 400 }
      );
    }

    // Step 1: Enrich with Open Library data
    // This adds ISBN, cover URL, publication year
    console.log(`Enriching ${books.length} books with Open Library data...`);
    const enrichedBooks = await enrichBooks(books);

    // Count how many were enriched
    const enrichedCount = enrichedBooks.filter(b => b.isbn || b.cover_url).length;
    console.log(`Enriched ${enrichedCount}/${books.length} books`);

    // Step 2: Save to Google Sheets
    console.log('Saving to Google Sheets...');
    const rowsAdded = await appendBooks(enrichedBooks, sourceImageId);
    console.log(`Added ${rowsAdded} rows to spreadsheet`);

    // Return summary
    return NextResponse.json({
      success: true,
      summary: {
        total_saved: books.length,
        enriched_with_metadata: enrichedCount,
        rows_added: rowsAdded,
      },
      // Return enriched data so UI can show covers, etc.
      books: enrichedBooks,
    });
  } catch (error) {
    console.error('Save failed:', error);

    const message = error instanceof Error ? error.message : 'Save failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
