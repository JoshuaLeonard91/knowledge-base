import type { NextConfig } from "next";

/**
 * Content Security Policy
 * Restricts what resources can be loaded
 */
const ContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://jsd-widget.atlassian.com", // unsafe-inline needed for Next.js, Atlassian for JSM widget
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://jsd-widget.atlassian.com", // Allow Google Fonts CSS and JSM widget styles
  "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://jsd-widget.atlassian.com", // Allow Google Fonts stylesheets and JSM widget
  "img-src 'self' data: https: blob: https://cdn.discordapp.com", // Allow Discord avatars
  "font-src 'self' data: https://fonts.gstatic.com https://jsd-widget.atlassian.com", // Allow Google Fonts files and JSM widget fonts
  "connect-src 'self' https:", // Allow API calls
  "frame-src 'self' https://jsd-widget.atlassian.com", // Allow JSM widget iframe
  "frame-ancestors 'none'", // Prevent framing (same as X-Frame-Options)
  "base-uri 'self' https://jsd-widget.atlassian.com https://joshualeonard1.atlassian.net",
  "form-action 'self' https://discord.com", // Allow Discord OAuth form
  "object-src 'none'", // Disable plugins
  "upgrade-insecure-requests", // Upgrade HTTP to HTTPS
].join("; ");

const nextConfig: NextConfig = {
  // Allow images from Hygraph CDN
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.graphassets.com',
      },
      {
        protocol: 'https',
        hostname: 'cdn.discordapp.com',
      },
    ],
  },
  // Security headers
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // DNS Prefetch Control
          {
            key: "X-DNS-Prefetch-Control",
            value: "on",
          },
          // Prevent Clickjacking
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          // Prevent MIME type sniffing
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          // Control referrer information
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          // XSS Protection (legacy, but still useful)
          {
            key: "X-XSS-Protection",
            value: "1; mode=block",
          },
          // Permissions Policy (formerly Feature Policy)
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // Content Security Policy
          {
            key: "Content-Security-Policy",
            value: ContentSecurityPolicy,
          },
          // HTTP Strict Transport Security (HSTS)
          // Only enable in production with HTTPS
          ...(process.env.NODE_ENV === "production"
            ? [
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains; preload",
                },
              ]
            : []),
          // Prevent cross-domain policies
          {
            key: "X-Permitted-Cross-Domain-Policies",
            value: "none",
          },
          // Prevent IE from downloading files in wrong context
          {
            key: "X-Download-Options",
            value: "noopen",
          },
          // Control DNS prefetching
          {
            key: "X-DNS-Prefetch-Control",
            value: "off",
          },
        ],
      },
      // API routes - additional security
      {
        source: "/api/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, no-cache, must-revalidate, proxy-revalidate",
          },
          {
            key: "Pragma",
            value: "no-cache",
          },
          {
            key: "Expires",
            value: "0",
          },
        ],
      },
    ];
  },
  // Disable x-powered-by header
  poweredByHeader: false,
};

export default nextConfig;
