import type { NextConfig } from "next";

// NOTE: Content Security Policy is set per-request in middleware with a
// cryptographic nonce for script-src. Do NOT add CSP here — it would
// conflict with the nonce-based policy.

const nextConfig: NextConfig = {
  // Prevent bundler from processing discord.js (native modules like zlib-sync)
  serverExternalPackages: ['discord.js', '@discordjs/ws', '@discordjs/rest', 'zlib-sync'],
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
          // Disable legacy XSS filter (can introduce vulnerabilities; CSP is the replacement)
          {
            key: "X-XSS-Protection",
            value: "0",
          },
          // Isolate browsing context from cross-origin windows
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
          // Prevent cross-origin resource loading
          {
            key: "Cross-Origin-Resource-Policy",
            value: "same-origin",
          },
          // Permissions Policy (formerly Feature Policy)
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
          },
          // CSP is set per-request in middleware (nonce-based script-src)
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
