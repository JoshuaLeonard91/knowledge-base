/**
 * CSP Violation Report Endpoint
 *
 * POST /api/csp-report
 *
 * Receives Content-Security-Policy violation reports from browsers.
 * Logs violations for security monitoring. Rate-limited by middleware.
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const report = body['csp-report'] || body;

    // Log violation with minimal info (avoid logging attacker-controlled data verbatim)
    console.warn('[CSP Violation]', {
      directive: report['violated-directive'] || report.violatedDirective,
      blocked: report['blocked-uri'] || report.blockedURL,
      document: report['document-uri'] || report.documentURL,
      referrer: report['referrer'] || report.referrer,
    });

    return NextResponse.json({ received: true }, { status: 204 });
  } catch {
    return NextResponse.json({ received: true }, { status: 204 });
  }
}
