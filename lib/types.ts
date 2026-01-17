// Shared types for Offshelf
// These match the Claude Vision API response structure you validated

export interface Book {
  position: number;
  title: string;
  author: string;
  confidence: number;
  flags: string[];
  spine_text_raw: string;
  // Added by user during review
  manuallyEdited?: boolean;
  // Added after Open Library enrichment
  isbn?: string;
  cover_url?: string;
  publication_year?: number;
  open_library_key?: string;
}

export interface ShelfSection {
  section: string; // e.g., "top_shelf", "middle_shelf"
  books: Book[];
}

export interface AnalysisResult {
  image_id: string;
  processed_at: string;
  shelf_sections: ShelfSection[];
  summary: {
    total_detected: number;
    high_confidence: number;
    medium_confidence: number;
    low_confidence: number;
    flagged_for_review: number;
  };
}

// Open Library API response types
export interface OpenLibrarySearchResult {
  numFound: number;
  docs: OpenLibraryDoc[];
}

export interface OpenLibraryDoc {
  key: string;
  title: string;
  author_name?: string[];
  first_publish_year?: number;
  isbn?: string[];
  cover_i?: number; // Cover ID for building cover URL
}

// Google Sheets row format
export interface SheetBookRow {
  title: string;
  author: string;
  isbn: string;
  publication_year: number | string;
  cover_url: string;
  added_at: string;
  source_image_id: string;
  confidence: number;
  manually_edited: boolean;
}
