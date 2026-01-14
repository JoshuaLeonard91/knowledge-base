import { NextRequest, NextResponse } from 'next/server';

interface ServiceInquiry {
  name: string;
  email: string;
  company?: string;
  service: string;
  inquiryType: 'general' | 'pricing' | 'demo' | 'support';
  message: string;
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
          summary: `Service Inquiry: ${body.service} - ${body.inquiryType}`,
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
                  { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Name: ${body.name}` }] }] },
                  { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Email: ${body.email}` }] }] },
                  { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Company/Server: ${body.company || 'Not provided'}` }] }] },
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
                  { type: 'listItem', content: [{ type: 'paragraph', content: [{ type: 'text', text: `Service: ${body.service}` }] }] },
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
                content: [{ type: 'text', text: body.message }]
              }
            ]
          },
          issuetype: { name: 'Task' },
          labels: ['service-inquiry', body.inquiryType, body.service],
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
        const errorText = await jiraResponse.text();
        console.error('[Service Inquiry] Jira API error:', errorText);
        // Fall through to mock mode if Jira fails
      }
    }

    // Mock mode - log the inquiry
    console.log('[Service Inquiry] Mock mode - inquiry received:', {
      name: body.name,
      email: body.email,
      company: body.company,
      service: body.service,
      inquiryType: body.inquiryType,
      messagePreview: body.message.substring(0, 100) + '...',
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      message: 'Thank you for your inquiry! Our team will contact you within 1-2 business days.',
    });
  } catch (error) {
    console.error('[Service Inquiry] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to process inquiry' },
      { status: 500 }
    );
  }
}
