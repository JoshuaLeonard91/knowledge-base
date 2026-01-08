import Link from 'next/link';
import { ArticleCategory } from '@/types';
import { RocketLaunch, Question, Wrench, CaretRight, BookOpenText, GraduationCap, Code, FileText, Megaphone, Bell, Shield, CreditCard, User, Plug, Article } from '@phosphor-icons/react/dist/ssr';
import { getCategoryColors } from '@/lib/category-colors';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const iconMap: Record<string, React.ComponentType<any>> = {
  Rocket: RocketLaunch,
  Question,
  Wrench,
  BookOpen: BookOpenText,
  GraduationCap,
  Code,
  FileText,
  Megaphone,
  Bell,
  Shield,
  CreditCard,
  User,
  Plug,
  Article,
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
        const colors = getCategoryColors(category.id, category.color);
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
