import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getArticleBySlug, getRelatedArticles, getCategories, getArticles } from '@/lib/cms';
import { ArticleCard } from '@/components/support/ArticleCard';
import { ArticleFeedback } from './ArticleFeedback';
import { ArticleViewTracker } from './ArticleViewTracker';
import { HeaderLink } from './HeaderLink';
import { RichTextRenderer } from '@/components/content/RichTextRenderer';
import { TableOfContents } from '@/components/content/TableOfContents';
import { ArticleNavSidebar } from '@/components/content/ArticleNavSidebar';
import { generateHeaderId, extractHeadingsFromRichText, extractHeadingsFromMarkdown } from '@/lib/utils/headings';
import type { RichTextContent } from '@graphcms/rich-text-types';
import {
  CaretLeft, Clock, BookOpenText, Tag,
  Lightning, Shield, Terminal, FileText, Funnel, ShareNetwork, WifiSlash, Key, Database,
  Crown, Warning, MagnifyingGlass, ArrowsClockwise, Stack, Gear, Calendar, Bell, Lock, Layout,
  RocketLaunch, Question, Wrench, GraduationCap, Code, Megaphone, CreditCard, User, Plug, Article as ArticleIcon
} from '@phosphor-icons/react/dist/ssr';

// Force dynamic rendering - fetches fresh data on every request
// Required for multi-tenant setup where content changes without rebuilds
export const dynamic = 'force-dynamic';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, React.ComponentType<any>> = {
  Zap: Lightning, Shield, Terminal, FileText, Filter: Funnel, Share2: ShareNetwork, WifiOff: WifiSlash, Key, Database,
  Crown, AlertTriangle: Warning, Search: MagnifyingGlass, RefreshCw: ArrowsClockwise, Layers: Stack, Settings: Gear, Calendar, Bell, Lock, Layout,
  Rocket: RocketLaunch, HelpCircle: Question, Wrench, BookOpen: BookOpenText, GraduationCap, Code, Megaphone, CreditCard, User, Plug, Article: ArticleIcon
};

interface ArticlePageProps {
  params: Promise<{ slug: string }>;
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  // Extract headings for table of contents
  const isRichText = typeof article.content === 'object' && article.content !== null;
  const headings = isRichText
    ? extractHeadingsFromRichText(article.content as RichTextContent)
    : extractHeadingsFromMarkdown(article.content as string);

  const [relatedArticles, categories, allArticles] = await Promise.all([
    getRelatedArticles(article, 4),
    getCategories(),
    getArticles()
  ]);
  const category = categories.find(c => c.id === article.category);
  const navArticles = allArticles.map(({ slug: s, title, category: cat }) => ({ slug: s, title, category: cat }));
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

    // Helper to process inline formatting
    // Preserves safe HTML spans with color styles from CMS
    const formatInline = (text: string) => {
      return text
        .replace(/`([^`]+)`/g, '<code class="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-sm font-mono">$1</code>')
        .replace(/\*\*([^*]+)\*\*/g, '<strong class="font-semibold text-[var(--text-primary)]">$1</strong>')
        .replace(/__([^_]+)__/g, '<strong class="font-semibold text-[var(--text-primary)]">$1</strong>')
        .replace(/\*([^*]+)\*/g, '<em class="italic">$1</em>')
        .replace(/(?<![a-zA-Z])_([^_]+)_(?![a-zA-Z])/g, '<em class="italic">$1</em>')
        // Images - must be before links since similar syntax
        .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="max-w-full h-auto rounded-lg my-4" />')
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-[var(--accent-primary)] hover:underline">$1</a>');
      // Note: <span style="color: ..."> tags from CMS are preserved and rendered via dangerouslySetInnerHTML
    };

    const flushList = () => {
      if (listItems.length > 0) {
        elements.push(
          <ul key={`list-${elements.length}`} className="list-disc list-inside space-y-2 mb-4">
            {listItems.map((item, i) => (
              <li
                key={i}
                className="text-[var(--text-secondary)]"
                dangerouslySetInnerHTML={{ __html: formatInline(item.replace(/^[-*]\s*/, '')) }}
              />
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
                    <th key={i} dangerouslySetInnerHTML={{ __html: formatInline(h.trim()) }} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} dangerouslySetInnerHTML={{ __html: formatInline(cell.trim()) }} />
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

      // Headers with anchor links (process inline formatting)
      if (line.startsWith('# ')) {
        flushList();
        const headerText = line.replace('# ', '');
        const headerId = generateHeaderId(headerText);
        elements.push(
          <h1 key={index} id={headerId} className="group scroll-mt-28 text-3xl font-bold text-[var(--text-primary)] mb-6 mt-8 first:mt-0 flex items-center">
            <span dangerouslySetInnerHTML={{ __html: formatInline(headerText) }} />
            <HeaderLink id={headerId} />
          </h1>
        );
        return;
      }
      if (line.startsWith('## ')) {
        flushList();
        const headerText = line.replace('## ', '');
        const headerId = generateHeaderId(headerText);
        elements.push(
          <h2 key={index} id={headerId} className="group scroll-mt-28 text-2xl font-semibold text-[var(--text-primary)] mb-4 mt-8 flex items-center">
            <span dangerouslySetInnerHTML={{ __html: formatInline(headerText) }} />
            <HeaderLink id={headerId} />
          </h2>
        );
        return;
      }
      if (line.startsWith('### ')) {
        flushList();
        const headerText = line.replace('### ', '');
        const headerId = generateHeaderId(headerText);
        elements.push(
          <h3 key={index} id={headerId} className="group scroll-mt-28 text-xl font-semibold text-[var(--text-primary)] mb-3 mt-6 flex items-center">
            <span dangerouslySetInnerHTML={{ __html: formatInline(headerText) }} />
            <HeaderLink id={headerId} />
          </h3>
        );
        return;
      }
      if (line.startsWith('#### ')) {
        flushList();
        const headerText = line.replace('#### ', '');
        const headerId = generateHeaderId(headerText);
        elements.push(
          <h4 key={index} id={headerId} className="group scroll-mt-28 text-lg font-semibold text-[var(--text-primary)] mb-2 mt-5 flex items-center">
            <span dangerouslySetInnerHTML={{ __html: formatInline(headerText) }} />
            <HeaderLink id={headerId} />
          </h4>
        );
        return;
      }
      if (line.startsWith('##### ')) {
        flushList();
        const headerText = line.replace('##### ', '');
        const headerId = generateHeaderId(headerText);
        elements.push(
          <h5 key={index} id={headerId} className="group scroll-mt-28 text-base font-semibold text-[var(--text-primary)] mb-2 mt-4 flex items-center">
            <span dangerouslySetInnerHTML={{ __html: formatInline(headerText) }} />
            <HeaderLink id={headerId} />
          </h5>
        );
        return;
      }
      if (line.startsWith('###### ')) {
        flushList();
        const headerText = line.replace('###### ', '');
        const headerId = generateHeaderId(headerText);
        elements.push(
          <h6 key={index} id={headerId} className="group scroll-mt-28 text-sm font-semibold text-[var(--text-primary)] uppercase tracking-wide mb-2 mt-4 flex items-center">
            <span dangerouslySetInnerHTML={{ __html: formatInline(headerText) }} />
            <HeaderLink id={headerId} />
          </h6>
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

      // Standalone images
      const imageMatch = line.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);
      if (imageMatch) {
        const [, alt, src] = imageMatch;
        elements.push(
          <figure key={index} className="my-6">
            <img
              src={src}
              alt={alt}
              className="max-w-full h-auto rounded-lg shadow-md"
            />
            {alt && (
              <figcaption className="text-center text-sm text-[var(--text-muted)] mt-2">
                {alt}
              </figcaption>
            )}
          </figure>
        );
        return;
      }

      // Regular paragraphs with inline formatting
      elements.push(
        <p
          key={index}
          className="text-[var(--text-secondary)] mb-4 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: formatInline(line) }}
        />
      );
    });

    flushList();
    flushTable();

    return elements;
  };

  return (
    <div className="min-h-screen">
      <ArticleViewTracker slug={article.slug} title={article.title} category={article.category} />

      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[288px_1fr] xl:grid-cols-[288px_1fr_288px] gap-10">
          {/* Left sidebar - Article Navigation (LG+) */}
          <aside className="hidden lg:block">
            <div className="sticky top-1/2 -translate-y-1/2">
              <ArticleNavSidebar
                categories={categories}
                articles={navArticles}
                currentSlug={slug}
              />
            </div>
          </aside>

          {/* Main content */}
          <div className="min-w-0 max-w-4xl mx-auto w-full">
            {/* Breadcrumb */}
            <Link
              href="/support/articles"
              className="inline-flex items-center gap-1.5 text-sm text-[var(--text-muted)] hover:text-[var(--accent-primary)] mb-6 transition-colors"
            >
              <CaretLeft size={14} weight="bold" />
              Back to Articles
            </Link>

            {/* Article header */}
            <header className="mb-10">
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <div className="p-2.5 rounded-lg bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20">
                  <Icon size={22} weight="duotone" className="text-[var(--accent-primary)]" />
                </div>
                {category && (
                  <span className="px-3 py-1 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-sm font-medium">
                    {category.name}
                  </span>
                )}
                {article.readTime > 0 && (
                  <span className="flex items-center gap-1 text-sm text-[var(--text-muted)]">
                    <Clock size={14} weight="bold" />
                    {article.readTime} min read
                  </span>
                )}
              </div>
              <h1 className="text-3xl md:text-4xl font-bold text-[var(--text-primary)]">
                {article.title}
              </h1>
            </header>

            {/* Article Content */}
            <article className="prose max-w-none">
              {isRichText ? (
                <RichTextRenderer content={article.content as RichTextContent} headings={headings} />
              ) : (
                renderContent(article.content as string)
              )}
            </article>

            {/* Keywords */}
            {article.keywords && article.keywords.length > 0 && (
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
            )}

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

          {/* Right sidebar - Table of Contents (XL+) */}
          {headings.length > 1 && (
            <aside className="hidden xl:block">
              <div className="sticky top-1/2 -translate-y-1/2">
                <TableOfContents headings={headings} />
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
