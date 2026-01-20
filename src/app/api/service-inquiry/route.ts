import { NextRequest, NextResponse } from 'next/server';
import { sanitizeString } from '@/lib/security/sanitize';

interface ServiceInquiry {
  name: string;
  email: string;
  company?: string;
  service: string;
  inquiryType: 'general' | 'pricing' | 'demo' | 'support';
  message: string;
}

// Valid inquiry types for validation
const VALID_INQUIRY_TYPES = ['general', 'pricing', 'demo', 'support'] as const;

// Sanitize label for Jira (alphanumeric, hyphens, underscores only)
function sanitizeLabel(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .substring(0, 50);
}

export async function POST(request: NextRequest) {
  try {
    const body: ServiceInquiry = await request.json();

    // Validate required fields
    if (!body.name || !body.email || !body.service || !body.message) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Validate inquiry type
    if (!VALID_INQUIRY_TYPES.includes(body.inquiryType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid inquiry type' },
        { status: 400 }
      );
    }

    // Sanitize all user inputs
    const sanitizedName = sanitizeString(body.name).substring(0, 100);
    const sanitizedEmail = body.email.substring(0, 254); // Max email length per RFC
    const sanitizedCompany = body.company ? sanitizeString(body.company).substring(0, 100) : '';
    const sanitizedService = sanitizeString(body.service).substring(0, 100);
    const sanitizedMessage = sanitizeString(body.message).substring(0, 5000);

    // Check if Jira is configured for service inquiries
    const atlassianDomain = process.env.ATLASSIAN_DOMAIN;
    const atlassianEmail = process.env.ATLASSIAN_EMAIL;
    const atlassianToken = process.env.ATLASSIAN_API_TOKEN;
    const projectKey = process.env.JIRA_PROJECT_KEY;

    if (atlassianDomain && atlassianEmail && atlassianToken && projectKey) {
      // Create Jira issue for the inquiry
      const auth = Buffer.from(`${atlassianEmail}:${atlassianToken}`).toString('base64');

      const jiraPayload = {
        fields: {
          project: { key: projectKey },
          summary: `Service Inquiry: ${sanitizedService} - ${body.inquiryType}`,
          description: {
            type: 'doc',
            version: 1,
            content: [
              {
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: 'Contact Information' }]
              },
              {
                type: 'bulletList',
                content: [
                  { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Name: ${sanitizedName}` }] }] },
                  { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Email: ${sanitizedEmail}` }] }] },
                  { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Company/Server: ${sanitizedCompany || 'Not provided'}` }] }] },
                ]
              },
              {
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: 'Inquiry Details' }]
              },
              {
                type: 'bulletList',
                content: [
                  { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Service: ${sanitizedService}` }] }] },
                  { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Type: ${body.inquiryType}` }] }] },
                ]
              },
              {
                type: 'heading',
                attrs: { level: 2 },
                content: [{ type: 'text', text: 'Message' }]
              },
              {
                type: 'paragraph',
                content: [{ type: 'text', text: sanitizedMessage }]
              }
            ]
          },
          issuetype: { name: 'Task' },
          labels: ['service-inquiry', body.inquiryType, sanitizeLabel(sanitizedService)],
        }
      };

      const jiraResponse = await fetch(
        `https://${atlassianDomain}/rest/api/3/issue`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
          body: JSON.stringify(jiraPayload),
        }
      );

      if (jiraResponse.ok) {
        const jiraData = await jiraResponse.json();
        console.log('[Service Inquiry] Created Jira issue:', jiraData.key);
        return NextResponse.json({
          success: true,
          message: 'Thank you for your inquiry! Our team will contact you within 1-2 business days.',
          referenceId: jiraData.key,
        });
      } else {
        // Log only status code, not the full error body which may contain sensitive data
        console.error('[Service Inquiry] Jira API error - status:', jiraResponse.status);
        // Fall through to mock mode if Jira fails
      }
    }

    // Mock mode - log the inquiry (using sanitized values)
    console.log('[Service Inquiry] Mock mode - inquiry received:', {
      name: sanitizedName,
      email: sanitizedEmail,
      company: sanitizedCompany,
      service: sanitizedService,
      inquiryType: body.inquiryType,
      messagePreview: sanitizedMessage.substring(0, 100) + (sanitizedMessage.length > 100 ? '...' : ''),
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for your inquiry! Our team will contact you within 1-2 business days.',
    });
  } catch {
    // Log generic error message - don't expose error details
    console.error('[Service Inquiry] Failed to process inquiry');
    return NextResponse.json(
      { success: false, error: 'Failed to process inquiry' },
      { status: 500 }
    );
  }
}
