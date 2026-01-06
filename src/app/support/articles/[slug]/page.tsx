import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getArticleBySlug, getRelatedArticles, categories } from '@/lib/data/articles';
import { ArticleCard } from '@/components/support/ArticleCard';
import { ArticleFeedback } from './ArticleFeedback';
import {
  CaretLeft, Clock, BookOpenText, Tag,
  Lightning, Shield, Terminal, FileText, Funnel, ShareNetwork, WifiSlash, Key, Database,
  Crown, Warning, MagnifyingGlass, ArrowsClockwise, Stack, Gear, Calendar, Bell, Lock, Layout,
  RocketLaunch, Question, Wrench
} from '@phosphor-icons/react/dist/ssr';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, React.ComponentType<any>> = {
  Zap: Lightning, Shield, Terminal, FileText, Filter: Funnel, Share2: ShareNetwork, WifiOff: WifiSlash, Key, Database,
  Crown, AlertTriangle: Warning, Search: MagnifyingGlass, RefreshCw: ArrowsClockwise, Layers: Stack, Settings: Gear, Calendar, Bell, Lock, Layout,
  Rocket: RocketLaunch, HelpCircle: Question, Wrench
};

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  const relatedArticles = getRelatedArticles(slug);
  const category = categories.find(c => c.id === article.category);
  const Icon = iconMap[article.icon] || BookOpenText;

  // Simple markdown-like rendering
  const renderContent = (content: string) => {
    const lines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let inCodeBlock = false;
    let codeContent = '';
    let listItems: string[] = [];
    let inTable = false;
    let tableRows: string[][] = [];

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-2 mb-4">
            {listItems.map((item, i) => (
              <li key={i} className="text-[var(--text-secondary)]">
                {item.replace(/^[-*]\s*/, '')}
              </li>
            ))}
          </ul>
        );
        listItems = [];
      }
    };

    const flushTable = () => {
      if (tableRows.length > 0) {
        const headers = tableRows[0];
        const rows = tableRows.slice(2); // Skip header separator
        elements.push(
          <div key={`table-${elements.length}`} className="overflow-x-auto mb-4">
            <table className="w-full">
              <thead>
                <tr>
                  {headers.map((h, i) => (
                    <th key={i}>{h.trim()}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j}>{cell.trim()}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        tableRows = [];
        inTable = false;
      }
    };

    lines.forEach((line, index) => {
      // Code blocks
      if (line.startsWith('```')) {
        if (inCodeBlock) {
          elements.push(
            <pre key={`code-${index}`} className="mb-4">
              <code>{codeContent.trim()}</code>
            </pre>
          );
          codeContent = '';
          inCodeBlock = false;
        } else {
          flushList();
          flushTable();
          inCodeBlock = true;
        }
        return;
      }

      if (inCodeBlock) {
        codeContent += line + '\n';
        return;
      }

      // Tables
      if (line.startsWith('|')) {
        flushList();
        inTable = true;
        const cells = line.split('|').filter(c => c.trim());
        if (!line.includes('---')) {
          tableRows.push(cells);
        } else {
          tableRows.push(['---']); // Separator marker
        }
        return;
      } else if (inTable) {
        flushTable();
      }

      // Headers
      if (line.startsWith('# ')) {
        flushList();
        elements.push(
          <h1 key={index} className="text-3xl font-bold text-[var(--text-primary)] mb-6 mt-8 first:mt-0">
            {line.replace('# ', '')}
          </h1>
        );
        return;
      }
      if (line.startsWith('## ')) {
        flushList();
        elements.push(
          <h2 key={index} className="text-2xl font-semibold text-[var(--text-primary)] mb-4 mt-8">
            {line.replace('## ', '')}
          </h2>
        );
        return;
      }
      if (line.startsWith('### ')) {
        flushList();
        elements.push(
          <h3 key={index} className="text-xl font-semibold text-[var(--text-primary)] mb-3 mt-6">
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

      // Checkboxes
      if (line.match(/^- \[[ x]\]/)) {
        const checked = line.includes('[x]');
        const text = line.replace(/^- \[[ x]\]\s*/, '');
        elements.push(
          <div key={index} className="flex items-center gap-2 mb-2">
            <input type="checkbox" checked={checked} readOnly className="rounded" />
            <span className="text-[var(--text-secondary)]">{text}</span>
          </div>
        );
        return;
      }

      // Empty lines
      if (!line.trim()) {
        return;
      }

      // Regular paragraphs
      // Handle inline code
      const processedLine = line.replace(
        /`([^`]+)`/g,
        '<code class="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-sm font-mono">$1</code>'
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
    flushTable();

    return elements;
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <section className="relative overflow-hidden border-b border-[var(--border-primary)]">
        <div className="absolute inset-0 bg-gradient-to-b from-[var(--bg-tertiary)] to-[var(--bg-primary)]" />
        <div className="absolute inset-0 bg-grid opacity-20" />

        <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Breadcrumb */}
          <Link
            href="/support/articles"
            className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent-primary)] mb-6 transition-colors"
          >
            <CaretLeft size={16} weight="bold" />
            Back to Articles
          </Link>

          <div className="flex items-start gap-4">
            <div className={`p-4 rounded-xl bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20`}>
              <Icon size={32} weight="duotone" className="text-[var(--accent-primary)]" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-3 flex-wrap">
                {category && (
                  <span className="px-3 py-1 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-sm font-medium">
                    {category.name}
                  </span>
                )}
                <span className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
                  <Clock size={16} weight="bold" />
                  {article.readTime} min read
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
                {article.title}
              </h1>
            </div>
          </div>
        </div>
      </section>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Article Content */}
        <article className="prose max-w-none">
          {renderContent(article.content)}
        </article>

        {/* Keywords */}
        <div className="mt-12 pt-8 border-t border-[var(--border-primary)]">
          <div className="flex items-center gap-2 mb-4">
            <Tag size={16} weight="duotone" className="text-[var(--text-muted)]" />
            <span className="text-sm text-[var(--text-muted)]">Related topics:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {article.keywords.map((keyword) => (
              <span
                key={keyword}
                className="px-3 py-1 rounded-full bg-[var(--bg-tertiary)] text-[var(--text-secondary)] text-sm"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {/* Feedback */}
        <ArticleFeedback articleSlug={article.slug} />

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <div className="mt-12">
            <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
              Related Articles
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              {relatedArticles.slice(0, 4).map((related) => (
                <ArticleCard key={related.slug} article={related} variant="compact" />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
