// Input validation and sanitization utilities

// Sanitize string input - removes HTML and trims
export function sanitizeString(input: unknown): string {
  if (typeof input !== 'string') {
    return '';
  }
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove any remaining angle brackets
    .trim();
}

// Validate ticket description
export function validateDescription(description: unknown): { valid: boolean; error?: string; sanitized?: string } {
  const sanitized = sanitizeString(description);

  if (!sanitized) {
    return { valid: false, error: 'Description is required' };
  }

  if (sanitized.length < 10) {
    return { valid: false, error: 'Description must be at least 10 characters' };
  }

  if (sanitized.length > 2000) {
    return { valid: false, error: 'Description must be less than 2000 characters' };
  }

  return { valid: true, sanitized };
}

// Validate server ID (legacy - validates against a list)
export function validateServerId(serverId: unknown, validServerIds: string[]): { valid: boolean; error?: string } {
  if (typeof serverId !== 'string') {
    return { valid: false, error: 'Invalid server ID' };
  }

  if (!validServerIds.includes(serverId)) {
    return { valid: false, error: 'Server not found or not authorized' };
  }

  return { valid: true };
}

// Validate Discord server ID format (snowflake - 17-19 digit number)
export function validateDiscordServerId(serverId: unknown): { valid: boolean; error?: string; sanitized?: string } {
  if (typeof serverId !== 'string') {
    return { valid: false, error: 'Server ID is required' };
  }

  const sanitized = serverId.trim();

  if (!sanitized) {
    return { valid: false, error: 'Server ID is required' };
  }

  // Discord snowflake IDs are 17-19 digits
  const snowflakeRegex = /^\d{17,19}$/;
  if (!snowflakeRegex.test(sanitized)) {
    return { valid: false, error: 'Invalid Discord server ID format. It should be a 17-19 digit number.' };
  }

  return { valid: true, sanitized };
}

// Validate ticket severity
const VALID_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;

export function validateSeverity(severity: unknown): { valid: boolean; error?: string; sanitized?: string } {
  if (typeof severity !== 'string') {
    return { valid: false, error: 'Severity is required' };
  }

  const sanitized = severity.trim().toLowerCase();

  if (!VALID_SEVERITIES.includes(sanitized as typeof VALID_SEVERITIES[number])) {
    return { valid: false, error: 'Invalid severity level' };
  }

  return { valid: true, sanitized };
}

// Validate search query
export function validateSearchQuery(query: unknown): { valid: boolean; error?: string; sanitized?: string } {
  const sanitized = sanitizeString(query);

  if (!sanitized) {
    return { valid: false, error: 'Search query is required' };
  }

  if (sanitized.length < 2) {
    return { valid: false, error: 'Search query must be at least 2 characters' };
  }

  if (sanitized.length > 100) {
    return { valid: false, error: 'Search query must be less than 100 characters' };
  }

  return { valid: true, sanitized };
}

// Generate a random ticket ID
export function generateTicketId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = 'TKT-';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
