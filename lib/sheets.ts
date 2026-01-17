import { google } from 'googleapis';
import { Book, SheetBookRow } from './types';

// TODO: Install the Google APIs package: npm install googleapis

// Google Sheets API documentation:
// https://developers.google.com/sheets/api/quickstart/nodejs

/**
 * Initialize Google Sheets client with service account credentials
 *
 * Required environment variables:
 * - GOOGLE_SHEETS_PRIVATE_KEY: Service account private key
 * - GOOGLE_SHEETS_CLIENT_EMAIL: Service account email
 * - GOOGLE_SHEETS_SPREADSHEET_ID: Target spreadsheet ID
 */
function getGoogleSheetsClient() {
  // TODO: Set up authentication
  //
  // The private key from env might have escaped newlines
  // that need to be converted: privateKey.replace(/\\n/g, '\n')

  const auth = new google.auth.JWT({
    email: process.env.GOOGLE_SHEETS_CLIENT_EMAIL,
    key: process.env.GOOGLE_SHEETS_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  return google.sheets({ version: 'v4', auth });
}

/**
 * Convert a Book to a spreadsheet row
 * Column order must match your sheet headers
 */
function bookToRow(book: Book, sourceImageId: string): SheetBookRow {
  return {
    title: book.title,
    author: book.author,
    isbn: book.isbn || '',
    publication_year: book.publication_year || '',
    cover_url: book.cover_url || '',
    added_at: new Date().toISOString(),
    source_image_id: sourceImageId,
    confidence: book.confidence,
    manually_edited: book.manuallyEdited || false,
  };
}

/**
 * Append books to Google Sheet
 *
 * @param books - Books to add (should already be enriched)
 * @param sourceImageId - ID of the source image for tracking
 * @returns Number of rows added
 */
export async function appendBooks(
  books: Book[],
  sourceImageId: string
): Promise<number> {
  // TODO: Implement append to Google Sheets
  //
  // Steps:
  // 1. Convert books to row format
  // 2. Use sheets.spreadsheets.values.append()
  // 3. Handle errors (auth, quota, network)
  //
  // The append method adds rows after existing data,
  // so you don't need to track row numbers

  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not configured');
  }

  // Convert books to rows
  const rows = books.map(book => {
    const row = bookToRow(book, sourceImageId);
    // Return values in column order
    return [
      row.title,
      row.author,
      row.isbn,
      row.publication_year,
      row.cover_url,
      row.added_at,
      row.source_image_id,
      row.confidence,
      row.manually_edited,
    ];
  });

  try {
    const response = await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Sheet1!A:I', // Adjust if your sheet has a different name
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: rows,
      },
    });

    // Return number of rows added
    return response.data.updates?.updatedRows || 0;
  } catch (error) {
    console.error('Failed to append to Google Sheets:', error);
    throw error;
  }
}

/**
 * Initialize a new spreadsheet with headers
 * Call this once when setting up
 */
export async function initializeSheet(): Promise<void> {
  const sheets = getGoogleSheetsClient();
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID;

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID not configured');
  }

  const headers = [
    'Title',
    'Author',
    'ISBN',
    'Publication Year',
    'Cover URL',
    'Added At',
    'Source Image ID',
    'Confidence',
    'Manually Edited',
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Sheet1!A1:I1',
    valueInputOption: 'RAW',
    requestBody: {
      values: [headers],
    },
  });
}

/**
 * Check if a book already exists in the sheet (by title + author)
 * Useful for duplicate detection in future
 */
export async function bookExists(title: string, author: string): Promise<boolean> {
  // TODO: Implement for duplicate detection
  // This is a future feature - skip for MVP
  return false;
}
