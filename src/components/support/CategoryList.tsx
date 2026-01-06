import Link from 'next/link';
import { ArticleCategory } from '@/types';
import { RocketLaunch, Question, Wrench, CaretRight, BookOpenText } from '@phosphor-icons/react/dist/ssr';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, React.ComponentType<any>> = {
  Rocket: RocketLaunch,
  HelpCircle: Question,
  Wrench,
};

const categoryColors: Record<string, { bg: string; text: string; gradient: string }> = {
  'getting-started': {
    bg: 'bg-[var(--accent-success)]/10',
    text: 'text-[var(--accent-success)]',
    gradient: 'from-[var(--accent-success)]/20 to-transparent'
  },
  'faq': {
    bg: 'bg-[var(--accent-primary)]/10',
    text: 'text-[var(--accent-primary)]',
    gradient: 'from-[var(--accent-primary)]/20 to-transparent'
  },
  'troubleshooting': {
    bg: 'bg-[var(--accent-warning)]/10',
    text: 'text-[var(--accent-warning)]',
    gradient: 'from-[var(--accent-warning)]/20 to-transparent'
  },
};

interface CategoryListProps {
  categories: ArticleCategory[];
  articleCounts: Record<string, number>;
}

export function CategoryList({ categories, articleCounts }: CategoryListProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      {categories.map((category) => {
        const Icon = iconMap[category.icon] || BookOpenText;
        const colors = categoryColors[category.id] || categoryColors['faq'];
        const count = articleCounts[category.id] || 0;

        return (
          <Link
            key={category.id}
            href={`/support/articles?category=${category.id}`}
            className="group relative overflow-hidden rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-primary)] hover:border-[var(--accent-primary)] transition-all"
          >
            {/* Gradient overlay */}
            <div className={`absolute inset-0 bg-gradient-to-br ${colors.gradient} opacity-0 group-hover:opacity-100 transition-opacity`} />

            <div className="relative p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`p-3 rounded-xl ${colors.bg}`}>
                  <Icon size={24} weight="duotone" className={colors.text} />
                </div>
                <span className="text-sm text-[var(--text-muted)]">
                  {count} article{count !== 1 ? 's' : ''}
                </span>
              </div>
              <h3 className="font-semibold text-lg text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors mb-2">
                {category.name}
              </h3>
              <p className="text-sm text-[var(--text-secondary)]">
                {category.description}
              </p>
              <div className="flex items-center gap-2 mt-4 text-sm text-[var(--accent-primary)] opacity-0 group-hover:opacity-100 transition-opacity">
                <span>Browse articles</span>
                <CaretRight size={16} weight="bold" className="group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
