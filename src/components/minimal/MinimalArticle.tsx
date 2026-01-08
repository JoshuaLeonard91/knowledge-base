'use client';

import { useState, useEffect } from 'react';
import { CaretLeft, Clock, SpinnerGap } from '@phosphor-icons/react';
import { MinimalView } from './MinimalApp';
import { Article } from '@/types';

interface MinimalArticleProps {
  slug: string;
  onNavigate: (view: MinimalView) => void;
  onBack: () => void;
}

export function MinimalArticle({ slug, onBack }: MinimalArticleProps) {
  const [article, setArticle] = useState<Article | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchArticle() {
      try {
        const res = await fetch(`/api/articles/${slug}`);
        const data = await res.json();
        if (data.success) {
          setArticle(data.article);
        }
      } catch {
        // Silently fail - will show not found
      } finally {
        setIsLoading(false);
      }
    }
    fetchArticle();
  }, [slug]);

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <SpinnerGap size={24} weight="bold" className="text-[var(--accent-primary)] animate-spin" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center">
        <p className="text-[var(--text-muted)]">Article not found</p>
        <button
          onClick={onBack}
          className="mt-4 text-[var(--accent-primary)] hover:underline"
        >
          Go back
        </button>
      </div>
    );
  }

  // Simple markdown rendering
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let listItems: string[] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-1.5 mb-4 text-[var(--text-secondary)]">
            {listItems.map((item, i) => (
              <li key={i}>{item.replace(/^[-*]\s*/, '')}</li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    lines.forEach((line, index) => {
      // Headers
      if (line.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={index} className="text-xl font-semibold text-[var(--text-primary)] mb-3 mt-8">
            {line.replace('## ', '')}
          </h2>
        );
        return;
      }
      if (line.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={index} className="text-lg font-semibold text-[var(--text-primary)] mb-2 mt-6">
            {line.replace('### ', '')}
          </h3>
        );
        return;
      }

      // Lists
      if (line.match(/^[-*]\s/)) {
        listItems.push(line);
        return;
      } else {
        flushList();
      }

      // Empty lines
      if (!line.trim()) {
        return;
      }

      // Code blocks (simple)
      if (line.startsWith('```')) {
        return;
      }

      // Regular paragraphs
      const processedLine = line.replace(
        /`([^`]+)`/g,
        '<code class="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-sm">$1</code>'
      );

      elements.push(
        <p
          key={index}
          className="text-[var(--text-secondary)] mb-4 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: processedLine }}
        />
      );
    });

    flushList();
    return elements;
  };

  return (
    <div className="min-h-[60vh]">
      {/* Back button */}
      <button
        onClick={onBack}
        className="flex items-center gap-2 mb-6 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
      >
        <CaretLeft size={18} weight="bold" />
        <span className="text-sm">Back</span>
      </button>

      {/* Article header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-3">
          <span className="px-2.5 py-1 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-xs font-medium">
            {article.category.replace('-', ' ')}
          </span>
          <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
            <Clock size={12} weight="bold" />
            {article.readTime} min read
          </span>
        </div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {article.title}
        </h1>
      </div>

      {/* Content */}
      <article className="prose-minimal">
        {renderContent(article.content)}
      </article>

      {/* Keywords */}
      <div className="mt-8 pt-6 border-t border-[var(--border-primary)]">
        <div className="flex flex-wrap gap-2">
          {article.keywords.map((keyword) => (
            <span
              key={keyword}
              className="px-2.5 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-muted)] text-xs"
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
