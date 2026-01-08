import { NextResponse } from 'next/server';
import { getArticles, getCategories } from '@/lib/cms';

export async function GET() {
  try {
    const [articles, categories] = await Promise.all([
      getArticles(),
      getCategories()
    ]);

    return NextResponse.json({
      success: true,
      articles,
      categories,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'An error occurred', articles: [], categories: [] },
      { status: 500 }
    );
  }
}
