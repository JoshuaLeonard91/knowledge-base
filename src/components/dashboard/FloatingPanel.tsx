/**
 * Floating Panel — reusable card with glass-morphism styling.
 * Used across all dashboard pages for consistent visual treatment.
 */

interface FloatingPanelProps {
  children: React.ReactNode;
  className?: string;
  noPadding?: boolean;
}

export function FloatingPanel({ children, className = '', noPadding = false }: FloatingPanelProps) {
  return (
    <div className={`
      bg-[var(--bg-secondary)]/60 backdrop-blur-sm
      border border-white/[0.06]
      rounded-xl
      shadow-lg shadow-black/20
      ${noPadding ? '' : 'p-6'}
      ${className}
    `}>
      {children}
    </div>
  );
}
