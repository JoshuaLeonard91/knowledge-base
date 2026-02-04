/**
 * Jira Ticket Provider
 *
 * Wraps the existing Jira Service Desk client to conform to the
 * common TicketProvider interface. Handles metadata embedding,
 * ownership verification, and description sanitization.
 */

import { jiraServiceDesk, JiraServiceDeskClient, type JiraIssue } from '@/lib/atlassian/client';
import type {
  TicketProvider,
  CreateTicketInput,
  CreateTicketResult,
  TicketListItem,
  Ticket,
  TicketAttachment,
  AddCommentInput,
} from '../types';

// ==========================================
// HELPERS
// ==========================================

interface AdfNode {
  type: string;
  text?: string;
  content?: AdfNode[];
}

/** Extract plain text from Jira's ADF (Atlassian Document Format) */
function extractDescriptionText(issue: JiraIssue): string {
  const description = issue.fields.description;

  if (typeof description === 'string') {
    return description;
  }

  if (description && typeof description === 'object') {
    const adfDescription = description as { content?: AdfNode[] };
    if (adfDescription.content) {
      const extractText = (content: AdfNode[], isTopLevel = false): string => {
        return content.map((node) => {
          if (node.type === 'text') return node.text || '';
          if (node.type === 'paragraph' && node.content) {
            return extractText(node.content);
          }
          if (node.type === 'hardBreak') return '\n';
          if (node.content) return extractText(node.content);
          return '';
        }).join(isTopLevel ? '\n' : '');
      };
      return extractText(adfDescription.content, true);
    }
  }

  return '';
}

/** Remove internal metadata from description before returning to client */
function sanitizeDescription(description: string): string {
  const separatorIndex = description.indexOf('----');
  if (separatorIndex !== -1) {
    return description.substring(0, separatorIndex).trim();
  }

  return description
    .replace(/Discord User ID:\s*\d+/gi, '')
    .replace(/Discord Username:\s*\S+/gi, '')
    .replace(/Discord Server ID:\s*\d+/gi, '')
    .replace(/\*Submitted via Support Portal\*/gi, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Check if ticket belongs to user via Discord ID in metadata */
function verifyOwnership(descriptionText: string, discordUserId: string): boolean {
  const discordIdPattern = /Discord User ID:\s*(\d{17,19})/i;
  const match = descriptionText.match(discordIdPattern);

  if (match && match[1]) {
    return match[1] === discordUserId;
  }

  const strictIdPattern = new RegExp(`\\b${discordUserId}\\b`);
  return strictIdPattern.test(descriptionText);
}

/** Map Jira status category key to our normalized categories */
function normalizeStatusCategory(key: string): 'new' | 'indeterminate' | 'done' | 'undefined' {
  if (key === 'new') return 'new';
  if (key === 'indeterminate') return 'indeterminate';
  if (key === 'done') return 'done';
  return 'undefined';
}

// ==========================================
// JIRA PROVIDER
// ==========================================

export class JiraTicketProvider implements TicketProvider {
  readonly name = 'Jira';
  private client: JiraServiceDeskClient;

  constructor(client?: JiraServiceDeskClient) {
    this.client = client || jiraServiceDesk;
  }

  isAvailable(): boolean {
    return this.client.isAvailable();
  }

  async createTicket(input: CreateTicketInput): Promise<CreateTicketResult> {
    const result = await this.client.createRequest({
      summary: input.summary,
      description: input.description,
      requesterName: input.discordUsername,
      requesterEmail: input.requesterEmail,
      discordUserId: input.discordUserId,
      discordUsername: input.discordUsername,
      discordServerId: input.discordServerId,
      priority: input.priority,
      labels: input.labels,
    });

    if (!result.success) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      ticketId: result.issueKey,
    };
  }

  async listTickets(discordUserId: string, discordUsername?: string): Promise<TicketListItem[]> {
    const issues = await this.client.getTicketsByDiscordUser(discordUserId, discordUsername);

    return issues.map(issue => ({
      id: issue.key,
      summary: issue.fields.summary,
      status: issue.fields.status?.name || 'Unknown',
      statusCategory: issue.fields.status?.statusCategory?.key || 'undefined',
      created: issue.fields.created,
      updated: issue.fields.updated,
    }));
  }

  async getTicket(ticketId: string, discordUserId: string): Promise<Ticket | null> {
    const { issue, comments } = await this.client.getTicketWithComments(ticketId);

    if (!issue) return null;

    // Verify ownership
    const descriptionText = extractDescriptionText(issue);
    if (!verifyOwnership(descriptionText, discordUserId)) {
      return null; // Treat as not found to avoid info leakage
    }

    // Build attachment lookup from issue-level attachments
    const issueAttachments = issue.fields.attachment || [];
    const attachmentById = new Map(issueAttachments.map(a => [a.id, a]));

    return {
      id: issue.key,
      summary: issue.fields.summary,
      description: sanitizeDescription(descriptionText),
      status: issue.fields.status?.name || 'Unknown',
      statusCategory: normalizeStatusCategory(issue.fields.status?.statusCategory?.key || ''),
      priority: issue.fields.priority?.name,
      assignee: issue.fields.assignee?.displayName || undefined,
      created: issue.fields.created,
      updated: issue.fields.updated,
      comments: comments.map(c => {
        const isUserComment = c.body.includes(`Discord User ID: ${discordUserId}`);

        // Match attachments to this comment via ADF media node IDs
        const commentAttachments: TicketAttachment[] = [];
        for (const mediaId of c.mediaAttachmentIds) {
          const att = attachmentById.get(mediaId);
          if (att) {
            commentAttachments.push({
              id: att.id,
              filename: att.filename,
              mimeType: att.mimeType,
              size: att.size,
              url: att.content,
            });
          }
        }

        // Also match by timestamp: attachments created within 10s of comment
        if (commentAttachments.length === 0 && !isUserComment) {
          const commentTime = new Date(c.created).getTime();
          for (const att of issueAttachments) {
            const attTime = new Date(att.created).getTime();
            if (Math.abs(attTime - commentTime) < 10_000) {
              // Avoid duplicates
              if (!commentAttachments.some(a => a.id === att.id)) {
                commentAttachments.push({
                  id: att.id,
                  filename: att.filename,
                  mimeType: att.mimeType,
                  size: att.size,
                  url: att.content,
                });
              }
            }
          }
        }

        return {
          id: c.id,
          author: isUserComment ? 'You' : (c.author.toLowerCase().includes('system') ? 'System' : 'Support Team'),
          body: sanitizeDescription(c.body),
          created: c.created,
          isStaff: !isUserComment,
          attachments: commentAttachments.length > 0 ? commentAttachments : undefined,
        };
      }),
    };
  }

  async getTicketUnguarded(ticketId: string): Promise<{ ticket: Ticket; discordUserId: string } | null> {
    const { issue, comments } = await this.client.getTicketWithComments(ticketId);
    if (!issue) return null;

    const descriptionText = extractDescriptionText(issue);

    // Extract Discord user ID from description metadata
    const discordIdMatch = descriptionText.match(/Discord User ID:\s*(\d{17,19})/i);
    if (!discordIdMatch) return null;

    const discordUserId = discordIdMatch[1];

    // Build attachment lookup from issue-level attachments
    const issueAttachments = issue.fields.attachment || [];
    const attachmentById = new Map(issueAttachments.map(a => [a.id, a]));

    const ticket: Ticket = {
      id: issue.key,
      summary: issue.fields.summary,
      description: sanitizeDescription(descriptionText),
      status: issue.fields.status?.name || 'Unknown',
      statusCategory: normalizeStatusCategory(issue.fields.status?.statusCategory?.key || ''),
      priority: issue.fields.priority?.name,
      assignee: issue.fields.assignee?.displayName || undefined,
      created: issue.fields.created,
      updated: issue.fields.updated,
      comments: comments.map(c => {
        const isUserComment = c.body.includes(`Discord User ID: ${discordUserId}`);

        const commentAttachments: TicketAttachment[] = [];
        for (const mediaId of c.mediaAttachmentIds) {
          const att = attachmentById.get(mediaId);
          if (att) {
            commentAttachments.push({
              id: att.id,
              filename: att.filename,
              mimeType: att.mimeType,
              size: att.size,
              url: att.content,
            });
          }
        }

        if (commentAttachments.length === 0 && !isUserComment) {
          const commentTime = new Date(c.created).getTime();
          for (const att of issueAttachments) {
            const attTime = new Date(att.created).getTime();
            if (Math.abs(attTime - commentTime) < 10_000) {
              if (!commentAttachments.some(a => a.id === att.id)) {
                commentAttachments.push({
                  id: att.id,
                  filename: att.filename,
                  mimeType: att.mimeType,
                  size: att.size,
                  url: att.content,
                });
              }
            }
          }
        }

        return {
          id: c.id,
          author: isUserComment ? 'You' : (c.author.toLowerCase().includes('system') ? 'System' : 'Support Team'),
          body: sanitizeDescription(c.body),
          created: c.created,
          isStaff: !isUserComment,
          attachments: commentAttachments.length > 0 ? commentAttachments : undefined,
        };
      }),
    };

    return { ticket, discordUserId };
  }

  async addComment(input: AddCommentInput): Promise<boolean> {
    // Verify ownership first
    const issue = await this.client.getIssue(input.ticketId);
    if (!issue) return false;

    const descriptionText = extractDescriptionText(issue);
    if (!verifyOwnership(descriptionText, input.discordUserId)) {
      return false;
    }

    // Build comment with metadata
    let commentText = `${input.message.trim()}\n\n----\n`;
    if (input.discordUsername) {
      commentText += `Discord Username: ${input.discordUsername}\n`;
    }
    commentText += `Discord User ID: ${input.discordUserId}`;

    return this.client.addComment(input.ticketId, commentText);
  }

  async addAttachment(ticketId: string, file: Buffer, filename: string, mimeType: string): Promise<boolean> {
    return this.client.addAttachment(ticketId, file, filename, mimeType);
  }

  async getAttachmentBuffer(url: string): Promise<Buffer | null> {
    return this.client.downloadAttachment(url);
  }

  async assignTicket(ticketId: string, jiraAccountId: string): Promise<boolean> {
    return this.client.assignIssue(ticketId, jiraAccountId);
  }

  async transitionTicket(ticketId: string, targetStatus: string): Promise<boolean> {
    return this.client.transitionIssue(ticketId, targetStatus);
  }
}
