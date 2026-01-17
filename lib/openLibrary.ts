import { Book, OpenLibrarySearchResult } from './types';

// Open Library API documentation: https://openlibrary.org/developers/api

const OPEN_LIBRARY_SEARCH_URL = 'https://openlibrary.org/search.json';
const OPEN_LIBRARY_COVER_URL = 'https://covers.openlibrary.org/b/id';

/**
 * Search Open Library for a book by title and author
 * Returns the best match with enriched metadata
 *
 * @param title - Book title to search for
 * @param author - Author name (optional but improves accuracy)
 * @returns Enriched book data or null if not found
 */
export async function searchBook(
  title: string,
  author?: string
): Promise<Partial<Book> | null> {
  // TODO: Implement Open Library search
  //
  // Build search query:
  // - Use title as primary search term
  // - Add author if provided for better matching
  // - Limit results to reduce API load
  //
  // Example URL:
  // https://openlibrary.org/search.json?title=Railroaded&author=Richard+White&limit=3
  //
  // Handle:
  // - Network errors
  // - No results found
  // - Multiple results (pick best match)

  const params = new URLSearchParams({
    title: title,
    limit: '3', // Get top 3 matches
  });

  if (author) {
    params.append('author', author);
  }

  try {
    const response = await fetch(`${OPEN_LIBRARY_SEARCH_URL}?${params}`);

    if (!response.ok) {
      console.error('Open Library API error:', response.status);
      return null;
    }

    const data: OpenLibrarySearchResult = await response.json();

    if (data.numFound === 0 || data.docs.length === 0) {
      return null;
    }

    // Use the first (best) match
    const match = data.docs[0];

    return {
      isbn: match.isbn?.[0],
      publication_year: match.first_publish_year,
      cover_url: match.cover_i
        ? `${OPEN_LIBRARY_COVER_URL}/${match.cover_i}-M.jpg`
        : undefined,
      open_library_key: match.key,
    };
  } catch (error) {
    console.error('Failed to search Open Library:', error);
    return null;
  }
}

/**
 * Enrich multiple books with Open Library data
 * Processes in series to avoid rate limiting
 *
 * @param books - Array of books to enrich
 * @returns Books with added metadata (original data preserved)
 */
export async function enrichBooks(books: Book[]): Promise<Book[]> {
  // TODO: Implement batch enrichment
  //
  // For each book:
  // 1. Search Open Library
  // 2. Merge results with existing book data
  // 3. Add small delay between requests (rate limiting)
  //
  // Consider:
  // - Using spine_text_raw as fallback search term
  // - Parallel requests with limited concurrency
  // - Caching results to avoid duplicate searches

  const enrichedBooks: Book[] = [];

  for (const book of books) {
    // Search using title and author
    const metadata = await searchBook(book.title, book.author);

    // If no match with author, try title only
    // (author might be wrong or missing)
    const fallbackMetadata = metadata
      ? null
      : await searchBook(book.title);

    const enriched: Book = {
      ...book,
      ...(metadata || fallbackMetadata || {}),
    };

    enrichedBooks.push(enriched);

    // Small delay to be nice to the API
    await sleep(100);
  }

  return enrichedBooks;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Build a cover image URL from an Open Library cover ID
 * Sizes: S (small), M (medium), L (large)
 */
export function getCoverUrl(coverId: number, size: 'S' | 'M' | 'L' = 'M'): string {
  return `${OPEN_LIBRARY_COVER_URL}/${coverId}-${size}.jpg`;
}
