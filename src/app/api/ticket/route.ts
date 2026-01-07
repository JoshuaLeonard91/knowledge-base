import { NextRequest } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { ticketSubjects } from '@/lib/data/servers';
import {
  validateDescription,
  validateDiscordServerId,
  validateSubjectId,
  generateTicketId,
} from '@/lib/validation';
import { jiraServiceDesk } from '@/lib/atlassian/client';
import {
  createSuccessResponse,
  createErrorResponse,
} from '@/lib/security/sanitize';
import {
  logTicketSubmission,
  logValidationFailure,
  logAccessDenied,
  getClientIp,
} from '@/lib/security/logger';

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);

  try {
    // Check authentication
    const authenticated = await isAuthenticated();
    if (!authenticated) {
      logAccessDenied({
        resource: '/api/ticket',
        reason: 'Not authenticated',
        ip,
        method: 'POST',
      });
      return createErrorResponse('authentication', 401);
    }

    // Get user data from session
    const user = await getSession();

    if (!user) {
      logAccessDenied({
        resource: '/api/ticket',
        reason: 'User not found',
        ip,
        method: 'POST',
      });
      return createErrorResponse('authentication', 401);
    }

    // Parse request body
    const body = await request.json();
    const { serverId, subjectId, description } = body;

    // Validate Discord server ID format (snowflake)
    const serverValidation = validateDiscordServerId(serverId);
    if (!serverValidation.valid) {
      logValidationFailure({
        field: 'serverId',
        reason: serverValidation.error || 'Invalid server ID',
        ip,
        resource: '/api/ticket',
      });
      return createErrorResponse('validation', 400);
    }
    const sanitizedServerId = serverValidation.sanitized || serverId;

    // Validate subject ID
    const validSubjectIds = ticketSubjects.map(s => s.id);
    const subjectValidation = validateSubjectId(subjectId, validSubjectIds);
    if (!subjectValidation.valid) {
      logValidationFailure({
        field: 'subjectId',
        reason: subjectValidation.error || 'Invalid subject',
        ip,
        resource: '/api/ticket',
      });
      return createErrorResponse('validation', 400);
    }

    // Validate and sanitize description
    const descValidation = validateDescription(description);
    if (!descValidation.valid) {
      logValidationFailure({
        field: 'description',
        reason: descValidation.error || 'Invalid description',
        ip,
        resource: '/api/ticket',
      });
      return createErrorResponse('validation', 400);
    }

    // Get subject name for ticket title
    const subject = ticketSubjects.find(s => s.id === subjectId);
    const subjectName = subject?.name || 'Support Request';

    // Submit to Jira Service Desk (or mock if not configured)
    const jiraResult = await jiraServiceDesk.createRequest({
      summary: `[${subjectName}] Support Request`,
      description: descValidation.sanitized || description,
      requesterName: user.username,
      discordUserId: user.id,
      discordUsername: user.username,
      discordServerId: sanitizedServerId,
      labels: ['discord', 'support-portal', subjectId],
    });

    let ticketId: string;

    if (!jiraResult.success) {
      // If Jira fails, fall back to local ticket generation
      ticketId = generateTicketId();

      logTicketSubmission({
        success: true,
        ticketId,
        ip,
        userId: user.id,
      });
    } else {
      ticketId = jiraResult.issueKey || generateTicketId();

      logTicketSubmission({
        success: true,
        ticketId,
        ip,
        userId: user.id,
      });
    }

    // Return sanitized response - only ticket reference, no internal data
    return createSuccessResponse({
      ticketId,
    });
  } catch (error) {
    logTicketSubmission({
      success: false,
      ip,
    });

    return createErrorResponse('server', 500, error);
  }
}
