// Article types - categories are dynamic from Google Sheets
export interface Article {
  slug: string;
  title: string;
  category: string; // Dynamic - defined in Google Sheets
  topic: string;
  keywords: string[];
  excerpt: string;
  content: string;
  relatedSlugs: string[];
  icon: string;
  readTime: number;
}

export interface ArticleCategory {
  id: string; // Dynamic - defined in Google Sheets
  name: string;
  description: string;
  icon: string;
  color?: string; // Optional color override from sheet
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

// History types for recent searches and viewed articles
export interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

export interface ViewHistoryItem {
  slug: string;
  title: string;
  category: string;
  timestamp: number;
}

export interface UserHistory {
  recentSearches: SearchHistoryItem[];
  viewedArticles: ViewHistoryItem[];
}
