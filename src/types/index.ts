// Article types
export interface Article {
  slug: string;
  title: string;
  category: 'getting-started' | 'faq' | 'troubleshooting';
  topic: 'general';
  keywords: string[];
  excerpt: string;
  content: string;
  relatedSlugs: string[];
  icon: string;
  readTime: number;
}

export interface ArticleCategory {
  id: 'getting-started' | 'faq' | 'troubleshooting';
  name: string;
  description: string;
  icon: string;
}

// Decision tree types
export interface TreeNodeOption {
  label: string;
  icon?: string;
  nextId: string;
}

export interface TreeNodeSolution {
  steps: string[];
  articleSlug?: string;
  canFileTicket: boolean;
}

export interface TreeNode {
  id: string;
  type: 'question' | 'solution';
  title: string;
  description?: string;
  options?: TreeNodeOption[];
  solution?: TreeNodeSolution;
}

// User types (for mock auth)
export interface MockServer {
  id: string;
  name: string;
  icon: string;
  memberCount: number;
}

export interface MockUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  servers: MockServer[];
}

// Public user data (safe to send to client)
export interface PublicUser {
  id: string;
  username: string;
  discriminator: string;
  avatar: string;
  serverCount: number;
}

// Ticket types
export interface TicketSubject {
  id: string;
  name: string;
  category: 'integrations' | 'discord';
  icon: string;
}

export interface TicketSubmission {
  serverId: string;
  subjectId: string;
  description: string;
}

export interface TicketResponse {
  success: boolean;
  ticketId?: string;
  message: string;
}

// Search types
export interface SearchResult {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  relevance: number;
}
