import { NextRequest } from 'next/server';
import { isAuthenticated, getSession } from '@/lib/auth';
import { ticketCategories, getCategoryById } from '@/lib/data/servers';
import {
  validateDescription,
  validateDiscordServerId,
  validateSeverity,
  generateTicketId,
} from '@/lib/validation';
import { getTicketProvider } from '@/lib/ticketing/adapter';
import { prisma } from '@/lib/db/client';
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
import { validateCsrfRequest, csrfErrorResponse } from '@/lib/security/csrf';

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

    // Validate CSRF token
    const csrfResult = await validateCsrfRequest(request);
    if (!csrfResult.valid) {
      logAccessDenied({
        resource: '/api/ticket',
        reason: `CSRF validation failed: ${csrfResult.error}`,
        ip,
        method: 'POST',
      });
      return csrfErrorResponse();
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
    const { serverId, categoryId, severity, description, discordNotify } = body;

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

    // Validate category ID
    const validCategoryIds = ticketCategories.map(c => c.id);
    if (!categoryId || !validCategoryIds.includes(categoryId)) {
      logValidationFailure({
        field: 'categoryId',
        reason: 'Invalid category',
        ip,
        resource: '/api/ticket',
      });
      return createErrorResponse('validation', 400);
    }

    // Validate severity
    const severityValidation = validateSeverity(severity);
    if (!severityValidation.valid) {
      logValidationFailure({
        field: 'severity',
        reason: severityValidation.error || 'Invalid severity',
        ip,
        resource: '/api/ticket',
      });
      return createErrorResponse('validation', 400);
    }
    const sanitizedSeverity = severityValidation.sanitized || severity;

    // Map severity to priority
    const severityToPriority: Record<string, 'lowest' | 'low' | 'medium' | 'high' | 'highest'> = {
      low: 'low',
      medium: 'medium',
      high: 'high',
      critical: 'highest',
    };
    const priority = severityToPriority[sanitizedSeverity] || 'medium';

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

    // Get category name for ticket title
    const category = getCategoryById(categoryId);
    const categoryName = category?.name || 'Support Request';

    // Build summary and labels
    const summary = `[${categoryName}] Support Request`;
    const labels = ['discord', 'support-portal', `category-${categoryId}`, `severity-${sanitizedSeverity}`];

    // Submit via ticket provider adapter
    const provider = getTicketProvider();
    const result = await provider.createTicket({
      summary,
      description: descValidation.sanitized || description,
      priority,
      labels,
      discordUserId: user.id,
      discordUsername: user.username,
      discordServerId: sanitizedServerId,
      });

    let ticketId: string;

    if (!result.success) {
      // If provider fails, fall back to local ticket generation
      ticketId = generateTicketId();
    } else {
      ticketId = result.ticketId || generateTicketId();
    }

    // Update Discord DM notification preference
    if (typeof discordNotify === 'boolean') {
      try {
        const existingUser = await prisma.tenantUser.findFirst({
          where: { tenantId: null, discordId: user.id },
        });
        if (existingUser) {
          await prisma.tenantUser.update({
            where: { id: existingUser.id },
            data: { discordNotifications: discordNotify },
          });
        } else {
          await prisma.tenantUser.create({
            data: {
              discordId: user.id,
              discordUsername: user.username,
              discordNotifications: discordNotify,
            },
          });
        }
      } catch (err) {
        console.error('[Ticket] Failed to update notification preference:', err);
      }
    }

    logTicketSubmission({
      success: true,
      ticketId,
      ip,
      userId: user.id,
    });

    // Return sanitized response - only ticket reference, no internal data
    return createSuccessResponse({
      ticketId,
    });
  } catch {
    logTicketSubmission({
      success: false,
      ip,
    });

    return createErrorResponse('server', 500);
  }
}
