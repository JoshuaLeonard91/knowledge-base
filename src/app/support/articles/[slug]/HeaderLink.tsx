'use client';

import { useState } from 'react';
import { Link as LinkIcon, Check } from '@phosphor-icons/react';

interface HeaderLinkProps {
  id: string;
}

export function HeaderLink({ id }: HeaderLinkProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault();
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
      onClick={handleCopy}
      className="inline-flex items-center justify-center w-6 h-6 ml-2 rounded opacity-0 group-hover:opacity-100 hover:bg-[var(--bg-tertiary)] transition-all"
      title="Copy link to section"
      aria-label="Copy link to section"
    >
      {copied ? (
        <Check size={14} weight="bold" className="text-[var(--accent-success)]" />
      ) : (
        <LinkIcon size={14} weight="bold" className="text-[var(--text-muted)]" />
      )}
    </button>
  );
}
