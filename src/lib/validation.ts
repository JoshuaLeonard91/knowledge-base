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

// Validate server ID
export function validateServerId(serverId: unknown, validServerIds: string[]): { valid: boolean; error?: string } {
  if (typeof serverId !== 'string') {
    return { valid: false, error: 'Invalid server ID' };
  }

  if (!validServerIds.includes(serverId)) {
    return { valid: false, error: 'Server not found or not authorized' };
  }

  return { valid: true };
}

// Validate subject ID
export function validateSubjectId(subjectId: unknown, validSubjectIds: string[]): { valid: boolean; error?: string } {
  if (typeof subjectId !== 'string') {
    return { valid: false, error: 'Invalid subject ID' };
  }

  if (!validSubjectIds.includes(subjectId)) {
    return { valid: false, error: 'Invalid subject selected' };
  }

  return { valid: true };
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
