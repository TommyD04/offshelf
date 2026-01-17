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
│   └── sheets.ts             # Google Sheets API wrapper
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

## Implementation Status

- [ ] Camera/upload UI
- [ ] Claude Vision API integration
- [ ] Review/edit UI
- [ ] Open Library enrichment
- [ ] Google Sheets integration

## Expected Accuracy

Based on testing with dense bookshelf photos (~75 books):
- ~80% high confidence identification
- ~15% medium confidence (flagged for review)
- ~5% low confidence or missed
- Manual review step catches most errors

## Future Plans

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
