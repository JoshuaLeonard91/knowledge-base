import { NextRequest, NextResponse } from 'next/server';
import { getArticleBySlug } from '@/lib/cms';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug || typeof slug !== 'string') {
      return NextResponse.json(
        { success: false, error: 'Invalid slug' },
        { status: 400 }
      );
    }

    // Validate slug format to prevent traversal patterns
    const SLUG_REGEX = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;
    if (slug.length < 2 || slug.length > 200 || !SLUG_REGEX.test(slug)) {
      return NextResponse.json(
        { success: false, error: 'Invalid slug format' },
        { status: 400 }
      );
    }

    const article = await getArticleBySlug(slug);

    if (!article) {
      return NextResponse.json(
        { success: false, error: 'Article not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      article,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'An error occurred' },
      { status: 500 }
    );
  }
}
