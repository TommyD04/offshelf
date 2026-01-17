import { NextRequest, NextResponse } from 'next/server';
import { analyzeBookshelf, validateAnalysisResult } from '@/lib/claude';

// POST /api/analyze
// Receives an image and returns book analysis from Claude Vision

export async function POST(request: NextRequest) {
  // TODO: Implement image analysis endpoint
  //
  // Flow:
  // 1. Receive image as FormData (multipart/form-data)
  // 2. Extract image file and convert to base64
  // 3. Generate unique image ID
  // 4. Call Claude Vision API
  // 5. Validate and return response

  try {
    // Parse the multipart form data
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(imageFile.type)) {
      return NextResponse.json(
        { error: 'Invalid image type. Use JPEG, PNG, or WebP.' },
        { status: 400 }
      );
    }

    // Convert to base64
    const arrayBuffer = await imageFile.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');

    // Generate image ID from filename or timestamp
    const imageId = imageFile.name || `shelf_${Date.now()}`;

    // Call Claude Vision API
    const result = await analyzeBookshelf(
      base64,
      imageId,
      imageFile.type as 'image/jpeg' | 'image/png' | 'image/webp'
    );

    // Validate the response structure
    if (!validateAnalysisResult(result)) {
      console.error('Invalid analysis result structure:', result);
      return NextResponse.json(
        { error: 'Invalid response from analysis' },
        { status: 500 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Analysis failed:', error);

    // Return user-friendly error
    const message = error instanceof Error ? error.message : 'Analysis failed';
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}

// Configure for larger file uploads (bookshelf photos can be big)
export const config = {
  api: {
    bodyParser: false, // Disable default parser for FormData
  },
};
