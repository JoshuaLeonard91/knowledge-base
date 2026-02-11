'use client';

import { useRef, useState } from 'react';
import { Link as LinkIcon, Check } from '@phosphor-icons/react';

/**
 * Copy-link button rendered inside heading elements.
 * When `id` prop is provided, uses it directly (markdown renderer).
 * Otherwise, finds parent heading's `id` lazily on click via .closest() (rich text renderer).
 */
export function HeaderLink({ id: idProp }: { id?: string } = {}) {
  const ref = useRef<HTMLButtonElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
    const id = idProp || ref.current?.closest('h1, h2, h3, h4, h5, h6')?.id;
    if (!id) return;

    const url = `${window.location.origin}${window.location.pathname}#${id}`;

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy link:', error);
    }
  };

  return (
    <button
      ref={ref}
      onClick={handleCopy}
      className="inline-flex items-center justify-center w-8 h-8 ml-2 rounded self-center shrink-0 opacity-40 md:opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-tertiary)] transition-all"
      title="Copy link to section"
      aria-label="Copy link to section"
    >
      {copied ? (
        <Check size={18} weight="bold" className="text-[var(--accent-success)]" />
      ) : (
        <LinkIcon size={18} weight="bold" className="text-[var(--text-muted)]" />
      )}
    </button>
  );
}
