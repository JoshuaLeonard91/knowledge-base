'use client';

import { useRef } from 'react';
import { RichText } from '@graphcms/rich-text-react-renderer';
import type { RichTextContent } from '@graphcms/rich-text-types';
import Link from 'next/link';
import { HeaderLink } from '@/app/support/articles/[slug]/HeaderLink';
import type { TocHeading } from '@/lib/utils/headings';

interface RichTextRendererProps {
  content: RichTextContent;
  className?: string;
  headings?: TocHeading[];
}

export function RichTextRenderer({ content, className = '', headings = [] }: RichTextRendererProps) {
  // Use a ref to track which heading index we're on during rendering
  const headingIndexRef = useRef(0);
  // Reset counter on each render
  headingIndexRef.current = 0;

  /** Get the next heading ID from the pre-extracted list */
  const getNextHeadingId = (): string => {
    const heading = headings[headingIndexRef.current];
    headingIndexRef.current++;
    return heading?.id || '';
  };

  /** Heading renderer with anchor ID and copy-link button */
  const renderHeading = (
    Tag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6',
    headingClassName: string,
    children: React.ReactNode,
  ) => {
    const id = getNextHeadingId();

    if (!id) {
      return <Tag className={headingClassName}>{children}</Tag>;
    }

    return (
      <Tag id={id} className={`group flex items-center scroll-mt-28 ${headingClassName}`}>
        <span>{children}</span>
        <HeaderLink id={id} />
      </Tag>
    );
  };

  return (
    <div className={`rich-text-content ${className}`}>
      <RichText
        content={content}
        renderers={{
          // Headings with anchor IDs and copy-link buttons
          h1: ({ children }) => renderHeading(
            'h1', 'text-4xl font-bold text-[var(--text-primary)] mb-6 mt-10 first:mt-0 leading-tight', children
          ),
          h2: ({ children }) => renderHeading(
            'h2', 'text-3xl font-bold text-[var(--text-primary)] mb-5 mt-12 leading-tight', children
          ),
          h3: ({ children }) => renderHeading(
            'h3', 'text-2xl font-semibold text-[var(--text-primary)] mb-4 mt-10 leading-snug', children
          ),
          h4: ({ children }) => renderHeading(
            'h4', 'text-xl font-semibold text-[var(--text-primary)] mb-3 mt-8 leading-snug', children
          ),
          h5: ({ children }) => renderHeading(
            'h5', 'text-lg font-medium text-[var(--text-primary)] mb-2 mt-6 leading-normal', children
          ),
          h6: ({ children }) => renderHeading(
            'h6', 'text-base font-medium text-[var(--text-primary)] uppercase tracking-wider mb-2 mt-5 leading-normal', children
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
            <span className="underline">{children}</span>
          ),

          // Code
          code: ({ children }) => (
            <code className="bg-[var(--bg-tertiary)] text-[var(--text-primary)] px-1.5 py-0.5 rounded text-sm font-mono">
              {children}
            </code>
          ),
          code_block: ({ children }) => (
            <pre className="bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg p-4 mb-4 overflow-x-auto">
              <code className="text-sm font-mono text-[var(--text-secondary)]">{children}</code>
            </pre>
          ),

          // Block quote - generic styling for any quoted content
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-[var(--accent-primary)]/40 bg-[var(--bg-tertiary)]/50 pl-5 pr-4 py-3 mb-4 rounded-r-lg [&_ul]:list-inside [&_ul]:ml-0 [&_ul]:mb-0 [&_ol]:list-inside [&_ol]:ml-0 [&_ol]:mb-0 [&_p:last-child]:mb-0">
              <div className="text-[var(--text-secondary)]">{children}</div>
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
            <figure className="mb-6 flex flex-col items-center">
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
