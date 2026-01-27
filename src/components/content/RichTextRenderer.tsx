'use client';

import { RichText } from '@graphcms/rich-text-react-renderer';
import type { RichTextContent } from '@graphcms/rich-text-types';
import Link from 'next/link';

interface RichTextRendererProps {
  content: RichTextContent;
  className?: string;
}

export function RichTextRenderer({ content, className = '' }: RichTextRendererProps) {
  return (
    <div className={`rich-text-content ${className}`}>
      <RichText
        content={content}
        renderers={{
          // Headings with distinct sizes and subtle color accents
          h1: ({ children }) => (
            <h1 className="text-4xl font-bold text-[var(--text-primary)] mb-6 mt-10 first:mt-0 leading-tight">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-3xl font-bold text-[var(--text-primary)] mb-5 mt-12 leading-tight border-b-2 border-[var(--accent-primary)]/30 pb-3">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-2xl font-semibold text-[var(--accent-primary)] mb-4 mt-10 leading-snug">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-xl font-semibold text-[var(--accent-primary)] mb-3 mt-8 leading-snug">
              {children}
            </h4>
          ),
          h5: ({ children }) => (
            <h5 className="text-lg font-medium text-[var(--text-secondary)] mb-2 mt-6 leading-normal">
              {children}
            </h5>
          ),
          h6: ({ children }) => (
            <h6 className="text-base font-medium text-[var(--text-muted)] uppercase tracking-wider mb-2 mt-5 leading-normal">
              {children}
            </h6>
          ),

          // Paragraphs
          p: ({ children }) => (
            <p className="text-[var(--text-secondary)] mb-4 leading-relaxed">
              {children}
            </p>
          ),

          // Bold and italic
          bold: ({ children }) => (
            <strong className="font-semibold text-[var(--text-primary)]">{children}</strong>
          ),
          italic: ({ children }) => (
            <em className="italic">{children}</em>
          ),
          underline: ({ children }) => (
            <span className="underline decoration-[var(--accent-primary)]">{children}</span>
          ),

          // Code
          code: ({ children }) => (
            <code className="bg-[var(--bg-tertiary)] text-[var(--accent-primary)] px-1.5 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          ),
          code_block: ({ children }) => (
            <pre className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg p-4 mb-4 overflow-x-auto">
              <code className="text-sm font-mono text-[var(--text-secondary)]">{children}</code>
            </pre>
          ),

          // Block quote - used for tips, warnings, notes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[var(--accent-primary)] bg-[var(--bg-tertiary)] pl-4 pr-4 py-3 mb-4 rounded-r-lg">
              <div className="text-[var(--text-secondary)] italic">{children}</div>
            </blockquote>
          ),

          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-outside ml-6 mb-4 space-y-2 text-[var(--text-secondary)]">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-outside ml-6 mb-4 space-y-2 text-[var(--text-secondary)]">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="leading-relaxed pl-1">{children}</li>
          ),

          // Links
          a: ({ children, href, openInNewTab }) => {
            const isExternal = href?.startsWith('http');
            if (isExternal) {
              return (
                <a
                  href={href}
                  target={openInNewTab ? '_blank' : undefined}
                  rel={openInNewTab ? 'noopener noreferrer' : undefined}
                  className="text-[var(--accent-primary)] hover:underline font-medium"
                >
                  {children}
                </a>
              );
            }
            return (
              <Link href={href || '#'} className="text-[var(--accent-primary)] hover:underline font-medium">
                {children}
              </Link>
            );
          },

          // Images
          img: ({ src, altText, width, height }) => (
            <figure className="mb-6">
              <img
                src={src}
                alt={altText || ''}
                width={width}
                height={height}
                className="rounded-lg max-w-full h-auto"
              />
              {altText && (
                <figcaption className="text-sm text-[var(--text-muted)] mt-2 text-center">
                  {altText}
                </figcaption>
              )}
            </figure>
          ),

          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto mb-6">
              <table className="w-full border-collapse border border-[var(--border-primary)] rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          table_head: ({ children }) => (
            <thead className="bg-[var(--bg-tertiary)]">{children}</thead>
          ),
          table_body: ({ children }) => (
            <tbody>{children}</tbody>
          ),
          table_row: ({ children }) => (
            <tr className="border-b border-[var(--border-primary)]">{children}</tr>
          ),
          table_header_cell: ({ children }) => (
            <th className="px-4 py-3 text-left font-semibold text-[var(--text-primary)]">
              {children}
            </th>
          ),
          table_cell: ({ children }) => (
            <td className="px-4 py-3 text-[var(--text-secondary)]">{children}</td>
          ),

          // Embed/iframe
          iframe: ({ url, width, height }) => (
            <div className="mb-6 aspect-video">
              <iframe
                src={url}
                width={width || '100%'}
                height={height || '100%'}
                className="rounded-lg w-full h-full"
                allowFullScreen
              />
            </div>
          ),

          // Class wrapper (for custom styling via CMS)
          class: ({ children, className: customClass }) => (
            <div className={customClass}>{children}</div>
          ),
        }}
      />
    </div>
  );
}

export default RichTextRenderer;
