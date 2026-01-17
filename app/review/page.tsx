'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import BookList from '@/components/BookList';
import { Book, AnalysisResult } from '@/lib/types';

// TODO: Review page responsibilities:
// 1. Retrieve analysis results (from sessionStorage or passed state)
// 2. Let user review, edit, and confirm books
// 3. Submit confirmed books to /api/save
// 4. Show success/error feedback

export default function ReviewPage() {
  const router = useRouter();
  const [books, setBooks] = useState<Book[]>([]);
  const [sourceImageId, setSourceImageId] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<{ total_saved: number } | null>(null);

  // Load analysis results on mount
  useEffect(() => {
    // TODO: Retrieve analysis from sessionStorage
    // This was stored after the analyze API call completed

    const stored = sessionStorage.getItem('analysisResult');

    if (!stored) {
      // No results to review - redirect to home
      router.push('/');
      return;
    }

    try {
      const result: AnalysisResult = JSON.parse(stored);

      // Flatten books from all shelf sections
      const allBooks = result.shelf_sections.flatMap(section => section.books);

      setBooks(allBooks);
      setSourceImageId(result.image_id);
      setIsLoading(false);
    } catch (e) {
      setError('Failed to load analysis results');
      setIsLoading(false);
    }
  }, [router]);

  // Handle book updates
  const handleUpdateBook = (index: number, updatedBook: Book) => {
    setBooks(prev => {
      const newBooks = [...prev];
      newBooks[index] = updatedBook;
      return newBooks;
    });
  };

  // Handle book deletion
  const handleDeleteBook = (index: number) => {
    setBooks(prev => prev.filter((_, i) => i !== index));
  };

  // Handle save
  const handleSave = async (booksToSave: Book[]) => {
    if (booksToSave.length === 0) {
      setError('No books to save');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          books: booksToSave,
          sourceImageId,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Save failed');
      }

      const result = await response.json();
      setSaveResult(result.summary);

      // Clear stored analysis
      sessionStorage.removeItem('analysisResult');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setIsSaving(false);
    }
  };

  // Success state
  if (saveResult) {
    return (
      <main className="min-h-screen p-6 bg-gray-50">
        <div className="max-w-md mx-auto text-center">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-2xl font-bold mb-2">Books Saved!</h1>
          <p className="text-gray-600 mb-6">
            {saveResult.total_saved} books added to your catalog
          </p>
          <button
            onClick={() => router.push('/')}
            className="px-6 py-3 bg-blue-600 text-white rounded-lg"
          >
            Scan Another Shelf
          </button>
        </div>
      </main>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <main className="min-h-screen p-6 flex items-center justify-center">
        <p className="text-gray-500">Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-md mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-bold">Review Books</h1>
          <p className="text-gray-600 text-sm mt-1">
            Edit or remove any incorrectly detected books
          </p>
        </header>

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {isSaving ? (
          <div className="text-center py-12">
            <p className="text-gray-500">Saving and enriching books...</p>
            <p className="text-gray-400 text-sm mt-2">
              Fetching metadata from Open Library
            </p>
          </div>
        ) : (
          <BookList
            books={books}
            onUpdateBook={handleUpdateBook}
            onDeleteBook={handleDeleteBook}
            onSave={handleSave}
          />
        )}
      </div>
    </main>
  );
}
