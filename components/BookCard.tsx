'use client';

import { useState } from 'react';
import { Book } from '@/lib/types';

// TODO: BookCard component responsibilities:
// 1. Display single book with title, author, confidence indicator
// 2. Show flags/warnings (partial spine, uncertain author, etc.)
// 3. Allow inline editing of title and author
// 4. Show raw spine text for debugging/reference
// 5. Provide delete action

interface BookCardProps {
  book: Book;
  onUpdate: (updatedBook: Book) => void;
  onDelete: () => void;
}

export default function BookCard({ book, onUpdate, onDelete }: BookCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(book.title);
  const [editAuthor, setEditAuthor] = useState(book.author);

  // TODO: Implement save/cancel editing
  const handleSave = () => {
    onUpdate({
      ...book,
      title: editTitle,
      author: editAuthor,
      // Mark as manually edited so we know it was reviewed
      manuallyEdited: true,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditTitle(book.title);
    setEditAuthor(book.author);
    setIsEditing(false);
  };

  // Confidence color coding
  const confidenceColor =
    book.confidence >= 0.75 ? 'bg-green-100 text-green-800' :
    book.confidence >= 0.5 ? 'bg-yellow-100 text-yellow-800' :
    'bg-red-100 text-red-800';

  return (
    <div className="border rounded-lg p-4 bg-white shadow-sm">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          {isEditing ? (
            // Edit mode
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="w-full px-2 py-1 border rounded"
                placeholder="Book title"
              />
              <input
                type="text"
                value={editAuthor}
                onChange={(e) => setEditAuthor(e.target.value)}
                className="w-full px-2 py-1 border rounded"
                placeholder="Author"
              />
              <div className="flex gap-2">
                <button
                  onClick={handleSave}
                  className="px-3 py-1 bg-blue-600 text-white rounded text-sm"
                >
                  Save
                </button>
                <button
                  onClick={handleCancel}
                  className="px-3 py-1 bg-gray-200 rounded text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            // Display mode
            <>
              <h3 className="font-medium">{book.title}</h3>
              <p className="text-gray-600 text-sm">{book.author}</p>
            </>
          )}
        </div>

        {/* Confidence badge */}
        <span className={`px-2 py-1 rounded text-xs font-medium ${confidenceColor}`}>
          {Math.round(book.confidence * 100)}%
        </span>
      </div>

      {/* Flags */}
      {book.flags && book.flags.length > 0 && (
        <div className="mt-2 flex gap-1 flex-wrap">
          {book.flags.map((flag, i) => (
            <span key={i} className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-xs">
              {flag}
            </span>
          ))}
        </div>
      )}

      {/* Raw spine text (collapsible for debugging) */}
      {book.spine_text_raw && (
        <details className="mt-2 text-xs text-gray-400">
          <summary className="cursor-pointer">Raw text</summary>
          <p className="mt-1 font-mono">{book.spine_text_raw}</p>
        </details>
      )}

      {/* Actions */}
      {!isEditing && (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-blue-600 hover:underline"
          >
            Edit
          </button>
          <button
            onClick={onDelete}
            className="text-sm text-red-600 hover:underline"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
}
