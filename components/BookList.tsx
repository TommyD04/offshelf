'use client';

import BookCard from './BookCard';
import { Book } from '@/lib/types';

// TODO: BookList component responsibilities:
// 1. Display list of detected books from Claude Vision API
// 2. Group/sort by confidence level (high first, then medium, then low)
// 3. Allow selecting individual books for editing
// 4. Track which books user has confirmed vs deleted
// 5. Provide "Save All" and "Save Selected" actions

interface BookListProps {
  books: Book[];
  onUpdateBook: (index: number, updatedBook: Book) => void;
  onDeleteBook: (index: number) => void;
  onSave: (books: Book[]) => void;
}

export default function BookList({ books, onUpdateBook, onDeleteBook, onSave }: BookListProps) {
  // TODO: Implement filtering/sorting
  // - Sort by confidence (or by shelf position)
  // - Filter to show only flagged items

  // TODO: Implement bulk actions
  // - Select all / deselect all
  // - Delete selected
  // - Save confirmed books

  const highConfidence = books.filter(b => b.confidence >= 0.75);
  const needsReview = books.filter(b => b.confidence < 0.75);

  return (
    <div className="flex flex-col gap-6">
      {/* Summary stats */}
      <div className="flex gap-4 text-sm">
        <span className="text-green-600">{highConfidence.length} high confidence</span>
        <span className="text-yellow-600">{needsReview.length} needs review</span>
      </div>

      {/* TODO: Add filter/sort controls */}

      {/* Books needing review first */}
      {needsReview.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3 text-yellow-700">
            Needs Review ({needsReview.length})
          </h2>
          <div className="flex flex-col gap-3">
            {needsReview.map((book, index) => (
              <BookCard
                key={`review-${index}`}
                book={book}
                onUpdate={(updated) => onUpdateBook(books.indexOf(book), updated)}
                onDelete={() => onDeleteBook(books.indexOf(book))}
              />
            ))}
          </div>
        </section>
      )}

      {/* High confidence books */}
      <section>
        <h2 className="text-lg font-semibold mb-3 text-green-700">
          Ready to Save ({highConfidence.length})
        </h2>
        <div className="flex flex-col gap-3">
          {highConfidence.map((book, index) => (
            <BookCard
              key={`ready-${index}`}
              book={book}
              onUpdate={(updated) => onUpdateBook(books.indexOf(book), updated)}
              onDelete={() => onDeleteBook(books.indexOf(book))}
            />
          ))}
        </div>
      </section>

      {/* Save action */}
      <button
        onClick={() => onSave(books)}
        className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
      >
        Save {books.length} Books
      </button>
    </div>
  );
}
