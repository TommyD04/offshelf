'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Camera from '@/components/Camera';
import { AnalysisResult } from '@/lib/types';

// TODO: Main page responsibilities:
// 1. Show camera/upload UI
// 2. Send captured image to /api/analyze
// 3. Store results and navigate to review page

export default function Home() {
  const router = useRouter();
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCapture = async (imageBlob: Blob) => {
    setIsAnalyzing(true);
    setError(null);

    try {
      // Create form data with image
      const formData = new FormData();
      formData.append('image', imageBlob, `shelf_${Date.now()}.jpg`);

      // Send to analyze endpoint
      const response = await fetch('/api/analyze', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Analysis failed');
      }

      const result: AnalysisResult = await response.json();

      // Store result for review page
      sessionStorage.setItem('analysisResult', JSON.stringify(result));

      // Navigate to review
      router.push('/review');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to analyze image');
      setIsAnalyzing(false);
    }
  };

  return (
    <main className="min-h-screen p-6 bg-gray-50">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Offshelf</h1>
          <p className="text-gray-600 mt-2">
            Catalog your books with a photo
          </p>
        </header>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Main content */}
        {isAnalyzing ? (
          <div className="text-center py-12">
            <div className="animate-pulse">
              <div className="w-16 h-16 mx-auto mb-4 bg-blue-200 rounded-full" />
              <p className="text-gray-600">Analyzing your bookshelf...</p>
              <p className="text-gray-400 text-sm mt-2">
                This may take a few seconds
              </p>
            </div>
          </div>
        ) : (
          <Camera onCapture={handleCapture} />
        )}

        {/* Instructions */}
        <div className="mt-8 text-center text-sm text-gray-500">
          <p className="font-medium mb-2">Tips for best results:</p>
          <ul className="space-y-1">
            <li>• Make sure spines are clearly visible</li>
            <li>• Good lighting helps accuracy</li>
            <li>• Avoid glare on glossy covers</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
