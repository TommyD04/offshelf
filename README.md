# Offshelf

A mobile-first PWA for cataloging books by photographing your bookshelf. Uses Claude Vision to identify books, Open Library for metadata enrichment, and Google Sheets for storage.

## How It Works

1. **Capture** - Take a photo of your bookshelf (or upload one)
2. **Analyze** - Claude Vision identifies book spines and extracts titles/authors
3. **Review** - Edit or remove any incorrectly detected books
4. **Save** - Confirmed books are enriched with metadata and saved to your spreadsheet

## Tech Stack

- **Framework:** Next.js with TypeScript
- **Styling:** Tailwind CSS
- **Book Identification:** Claude Vision API
- **Metadata:** Open Library API
- **Storage:** Google Sheets (Supabase planned for future)

## Project Structure

```
offshelf/
├── app/
│   ├── page.tsx              # Camera/upload UI
│   ├── review/page.tsx       # Book review/edit screen
│   └── api/
│       ├── analyze/route.ts  # Claude Vision integration
│       └── save/route.ts     # Open Library + Sheets
├── components/
│   ├── Camera.tsx            # Photo capture component
│   ├── BookList.tsx          # List of detected books
│   └── BookCard.tsx          # Individual book display/edit
├── lib/
│   ├── types.ts              # Shared TypeScript types
│   ├── claude.ts             # Claude API wrapper
│   ├── openLibrary.ts        # Open Library API wrapper
│   ├── sheets.ts             # Google Sheets API wrapper
│   ├── pipeline/
│   │   ├── index.ts          # Main pipeline (Phase 1 + 2)
│   │   └── detection.ts      # Spine detection orchestrator
│   ├── opencv/
│   │   ├── loader.ts         # OpenCV.js WASM initialization
│   │   ├── utils.ts          # Buffer/Mat conversion utilities
│   │   ├── lineDetection.ts  # Edge detection + Hough lines
│   │   └── spineExtractor.ts # Spine region cropping
│   ├── ocr/
│   │   └── textExtractor.ts  # Tesseract.js OCR wrapper
│   └── interpret/
│       └── bookParser.ts     # Claude-powered text parsing
├── scripts/
│   ├── test-pipeline.ts      # Test single spine OCR
│   └── test-spine-detection.ts # Test full bookshelf detection
└── assets/
    └── edges/                # Test spine images
```

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Install additional packages

```bash
npm install @anthropic-ai/sdk googleapis
```

### 3. Configure environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

You'll need:
- **Anthropic API key** from [console.anthropic.com](https://console.anthropic.com/)
- **Google Cloud service account** with Sheets API enabled
- **Google Spreadsheet ID** (share the spreadsheet with your service account email)

### 4. Initialize your spreadsheet

The first row should have these headers:
```
Title | Author | ISBN | Publication Year | Cover URL | Added At | Source Image ID | Confidence | Manually Edited
```

### 5. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your phone (or use browser dev tools mobile view).

## Processing Pipeline

The pipeline processes bookshelf images in multiple phases:

```
Full Bookshelf Image
       ↓
  Shelf Row Detection (brightness projection)
       ↓
  Per-Row: Canny Edge Detection + Hough Lines
       ↓
  Spine Region Extraction (gaps between vertical lines)
       ↓
  Per-Spine: Enhance → OCR (Tesseract) → Parse (Claude)
       ↓
  Structured Results (title, author, confidence)
```

**Phase 1 (complete):** Pre-cropped spine → OCR → Interpret
**Phase 2 (complete):** Full bookshelf → OpenCV edge detection → Spine crops → Phase 1

### Testing

```bash
# Test single spine image
npx tsx scripts/test-pipeline.ts ./assets/edges/edge_1.PNG

# Test full bookshelf detection
npx tsx scripts/test-spine-detection.ts ./assets/IMG_2189.jpg
```

## Implementation Status

- [x] Camera/upload UI
- [x] Claude Vision API integration
- [x] Review/edit UI
- [ ] Open Library enrichment
- [ ] Google Sheets integration
- [x] Phase 1: Spine OCR pipeline (sharp + Tesseract + Claude)
- [x] Phase 2: Automatic spine detection (OpenCV.js)
- [ ] Phase 3: Perspective rectification

## Architecture Decisions

### Horizontal Books (Deferred)

The current pipeline detects **vertical book spines only**. Books stacked horizontally (e.g., flat stacks on top of standing books) are not detected.

**Rationale for deferring:**
- Vertical books represent ~80% of books on a typical shelf
- Horizontal detection requires a separate classification step (aspect ratio analysis, horizontal edge detection) adding significant complexity
- Text orientation differs (left-to-right vs. rotated), requiring different OCR preprocessing

**Future approach:** Send undetected regions to Claude Vision directly, which can read horizontal covers/spines without custom edge detection. This aligns with a planned Phase 3 where Claude Vision handles ambiguous cases as a fallback.

### OCR vs. Claude Vision

Phase 1-2 uses Tesseract.js OCR followed by Claude for text interpretation. An alternative is sending spine crops directly to Claude Vision. The current approach was chosen because:
- Tesseract is free (no API cost per spine)
- Claude is used only for text parsing (cheaper Haiku model)
- Direct Vision could be added as a fallback for low-confidence OCR results

## Expected Accuracy

Based on testing with a 2-shelf bookcase (~40 books):
- ~50% correctly identified title and/or author
- ~25% partially correct (title or author, not both)
- ~25% low confidence or missed (narrow spines, poor contrast)
- Accuracy improves significantly with pre-cropped spine images

## Future Plans

- Horizontal book detection (see Architecture Decisions above)
- Claude Vision fallback for low-confidence OCR
- Perspective rectification (Phase 3)
- User guidance overlay during photo capture
- Desktop support
- Supabase migration for better querying
- Duplicate detection across shelves
- Export to CSV/Goodreads format

## Deploy

Deploy to Vercel:

```bash
npm run build
vercel
```

Remember to add your environment variables in the Vercel dashboard.
