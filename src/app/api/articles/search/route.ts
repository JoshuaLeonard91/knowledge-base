import { NextRequest, NextResponse } from 'next/server';
import { searchArticles } from '@/lib/cms';
import { validateSearchQuery } from '@/lib/validation';
import { SearchResult } from '@/types';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');

    // Validate search query
    const validation = validateSearchQuery(query);
    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.error, results: [] },
        { status: 400 }
      );
    }

    // Search articles (uses configured CMS provider)
    const articles = await searchArticles(validation.sanitized!);

    // Map to search results (only public data)
    const results: SearchResult[] = articles.slice(0, 10).map((article, index) => ({
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt,
      category: article.category,
      relevance: 10 - index, // Simple relevance score
    }));

    return NextResponse.json({
      success: true,
      query: validation.sanitized,
      results,
      total: articles.length,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'An error occurred', results: [] },
      { status: 500 }
    );
  }
}
