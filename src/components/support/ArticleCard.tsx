import Link from 'next/link';
import { Article } from '@/types';
import { Clock, CaretRight, FileText } from '@phosphor-icons/react/dist/ssr';
import { getIconSSR } from '@/lib/icons-ssr';
import { getCategoryColors } from '@/lib/category-colors';

interface ArticleCardProps {
  article: Article;
  variant?: 'default' | 'compact';
}

export function ArticleCard({ article, variant = 'default' }: ArticleCardProps) {
  const Icon = getIconSSR(article.icon, FileText);
  const colors = getCategoryColors(article.category);

  if (variant === 'compact') {
    return (
      <Link
        href={`/support/articles/${article.slug}`}
        className="flex items-center gap-3 p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:shadow-[var(--shadow-glow)] transition-all group"
      >
        <div className={`p-2 rounded-lg ${colors.bg}`}>
          <Icon size={16} weight="duotone" className={colors.text} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors truncate">
            {article.title}
          </p>
        </div>
        <CaretRight size={16} weight="bold" className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-1 transition-all" />
      </Link>
    );
  }

  return (
    <Link
      href={`/support/articles/${article.slug}`}
      className="block p-6 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] hover:shadow-[var(--shadow-glow)] transition-all group"
    >
      <div className="flex items-start gap-4">
        <div className={`p-3 rounded-xl ${colors.bg} ${colors.border} border`}>
          <Icon size={24} weight="duotone" className={colors.text} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors.bg} ${colors.text}`}>
              {article.category.replace('-', ' ')}
            </span>
            <span className="flex items-center gap-1 text-xs text-[var(--text-muted)]">
              <Clock size={12} weight="bold" />
              {article.readTime} min read
            </span>
          </div>
          <h3 className="font-semibold text-lg text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors mb-2">
            {article.title}
          </h3>
          <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
            {article.excerpt}
          </p>
        </div>
        <CaretRight size={20} weight="bold" className="text-[var(--text-muted)] group-hover:text-[var(--accent-primary)] group-hover:translate-x-1 transition-all flex-shrink-0" />
      </div>
    </Link>
  );
}
