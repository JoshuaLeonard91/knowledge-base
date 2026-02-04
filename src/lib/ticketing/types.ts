/**
 * Common ticketing types shared across all providers (Jira, Zendesk, etc.)
 *
 * These types define the provider-agnostic interface that all ticket
 * providers must implement. API routes use these types instead of
 * provider-specific ones.
 */

// ==========================================
// TICKET DATA TYPES
// ==========================================

export interface Ticket {
  id: string;           // Provider-specific ID (e.g., Jira issue key "SUPPORT-142")
  summary: string;
  description: string;  // Sanitized — no internal metadata
  status: string;       // Display name (e.g., "In Progress")
  statusCategory: 'new' | 'indeterminate' | 'done' | 'undefined';
  priority?: string;
  assignee?: string;    // Display name of the assigned agent
  created: string;      // ISO 8601
  updated: string;      // ISO 8601
  comments: TicketComment[];
}

export interface TicketAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  url: string;          // Provider download URL (requires auth)
}

export interface TicketComment {
  id: string;
  author: string;       // Sanitized author label (e.g., "Support Team", "You")
  body: string;
  created: string;      // ISO 8601
  isStaff: boolean;     // true = support team, false = ticket owner
  attachments?: TicketAttachment[];
}

export interface TicketListItem {
  id: string;
  summary: string;
  status: string;
  statusCategory: string;
  created: string;
  updated: string;
}

// ==========================================
// INPUT TYPES
// ==========================================

export interface CreateTicketInput {
  summary: string;
  description: string;
  priority: 'lowest' | 'low' | 'medium' | 'high' | 'highest';
  labels: string[];
  // Submitter identity
  discordUserId: string;
  discordUsername: string;
  discordServerId?: string;
  requesterEmail?: string;
}

export interface AddCommentInput {
  ticketId: string;
  message: string;
  discordUserId: string;
  discordUsername: string;
  attachments?: AttachmentInput[];
}

export interface AttachmentInput {
  filename: string;
  buffer: Buffer;
  mimeType: string;
}

// ==========================================
// RESPONSE TYPES
// ==========================================

export interface CreateTicketResult {
  success: boolean;
  ticketId?: string;
  error?: string;
}

// ==========================================
// PROVIDER INTERFACE
// ==========================================

/**
 * All ticket providers must implement this interface.
 * Provider-specific details (API clients, auth, etc.) are internal.
 */
export interface TicketProvider {
  /** Provider name for logging/display */
  readonly name: string;

  /** Whether the provider is configured and available */
  isAvailable(): boolean;

  /** Create a new ticket */
  createTicket(input: CreateTicketInput): Promise<CreateTicketResult>;

  /** List tickets for a Discord user */
  listTickets(discordUserId: string, discordUsername?: string): Promise<TicketListItem[]>;

  /** Get a single ticket with comments, verifying ownership */
  getTicket(ticketId: string, discordUserId: string): Promise<Ticket | null>;

  /** Add a comment to a ticket (verifies ownership internally) */
  addComment(input: AddCommentInput): Promise<boolean>;

  /** Upload an attachment to a ticket (optional — not all providers support this) */
  addAttachment?(ticketId: string, file: Buffer, filename: string, mimeType: string): Promise<boolean>;

  /** Download an attachment buffer by its provider URL (optional) */
  getAttachmentBuffer?(url: string): Promise<Buffer | null>;

  /** Assign a ticket to a user (optional — requires Jira account ID mapping) */
  assignTicket?(ticketId: string, jiraAccountId: string): Promise<boolean>;

  /** Transition a ticket to a target status (e.g., "In Progress") */
  transitionTicket?(ticketId: string, targetStatus: string): Promise<boolean>;

  /**
   * Fetch a ticket without ownership verification.
   * Returns the ticket data + the Discord user ID found in the description metadata.
   * Used by webhook handlers that receive an issue key but don't know the owner.
   * MUST only be called from trusted server-side paths (never from user-facing API routes).
   */
  getTicketUnguarded?(ticketId: string): Promise<{ ticket: Ticket; discordUserId: string } | null>;
}

// ==========================================
// PROVIDER ENUM (matches Prisma schema)
// ==========================================

export type TicketProviderType = 'JIRA' | 'ZENDESK';
