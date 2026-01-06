import { NextRequest, NextResponse } from 'next/server';
import { sanitizeString } from '@/lib/validation';
import { delay } from '@/lib/utils';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { articleSlug, helpful, comment } = body;

    // Validate article slug
    const sanitizedSlug = sanitizeString(articleSlug);
    if (!sanitizedSlug) {
      return NextResponse.json(
        { success: false, error: 'Invalid article' },
        { status: 400 }
      );
    }

    // Validate helpful (must be boolean)
    if (typeof helpful !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'Invalid feedback' },
        { status: 400 }
      );
    }

    // Sanitize optional comment
    const sanitizedComment = comment ? sanitizeString(comment).slice(0, 500) : null;

    // Simulate processing
    await delay(300);

    // In a real app, you would store this in a database
    console.log('=== ARTICLE FEEDBACK ===');
    console.log('Article:', sanitizedSlug);
    console.log('Helpful:', helpful);
    if (sanitizedComment) {
      console.log('Comment:', sanitizedComment);
    }
    console.log('========================');

    return NextResponse.json({
      success: true,
      message: 'Thank you for your feedback!',
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Failed to submit feedback' },
      { status: 500 }
    );
  }
}
