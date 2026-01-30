'use client';

import React from 'react';
import { RichText } from '@graphcms/rich-text-react-renderer';
import type { RichTextContent } from '@graphcms/rich-text-types';
import Link from 'next/link';
import { HeaderLink } from '@/app/support/articles/[slug]/HeaderLink';
import { generateHeaderId } from '@/lib/utils/headings';

interface RichTextRendererProps {
  content: RichTextContent;
  className?: string;
}

/** Extract plain text from React children for ID generation */
function getTextFromChildren(children: React.ReactNode): string {
  if (typeof children === 'string') return children;
  if (typeof children === 'number') return String(children);
  if (!children) return '';
  if (Array.isArray(children)) return children.map(getTextFromChildren).join('');
  if (React.isValidElement(children) && children.props) {
    return getTextFromChildren((children.props as { children?: React.ReactNode }).children);
  }
  return '';
}

/** Heading renderer with anchor ID and copy-link button */
function AnchorHeading({
  level,
  className,
  children,
}: {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  className: string;
  children: React.ReactNode;
}) {
  const text = getTextFromChildren(children);
  const id = generateHeaderId(text);
  const Tag = `h${level}` as const;

  return (
    <Tag id={id} className={`group flex items-center ${className}`}>
      <span>{children}</span>
      <HeaderLink id={id} />
    </Tag>
  );
}

export function RichTextRenderer({ content, className = '' }: RichTextRendererProps) {
  return (
    <div className={`rich-text-content ${className}`}>
      <RichText
        content={content}
        renderers={{
          // Headings with anchor IDs and copy-link buttons
          h1: ({ children }) => (
            <AnchorHeading level={1} className="text-4xl font-bold text-[var(--text-primary)] mb-6 mt-10 first:mt-0 leading-tight">
              {children}
            </AnchorHeading>
          ),
          h2: ({ children }) => (
            <AnchorHeading level={2} className="text-3xl font-bold text-[var(--text-primary)] mb-5 mt-12 leading-tight">
              {children}
            </AnchorHeading>
          ),
          h3: ({ children }) => (
            <AnchorHeading level={3} className="text-2xl font-semibold text-[var(--text-primary)] mb-4 mt-10 leading-snug">
              {children}
            </AnchorHeading>
          ),
          h4: ({ children }) => (
            <AnchorHeading level={4} className="text-xl font-semibold text-[var(--text-primary)] mb-3 mt-8 leading-snug">
              {children}
            </AnchorHeading>
          ),
          h5: ({ children }) => (
            <AnchorHeading level={5} className="text-lg font-medium text-[var(--text-primary)] mb-2 mt-6 leading-normal">
              {children}
            </AnchorHeading>
          ),
          h6: ({ children }) => (
            <AnchorHeading level={6} className="text-base font-medium text-[var(--text-primary)] uppercase tracking-wider mb-2 mt-5 leading-normal">
              {children}
            </AnchorHeading>
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
            <blockquote className="border-l-4 border-[var(--border-primary)] pl-4 mb-4">
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
