import { MockServer, MockUser, TicketSubject } from '@/types';

export const mockServers: MockServer[] = [
  {
    id: '1234567890',
    name: 'My Server',
    icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=server1',
    memberCount: 1500,
  },
  {
    id: '2345678901',
    name: 'Community Hub',
    icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=server2',
    memberCount: 850,
  },
  {
    id: '3456789012',
    name: 'Test Server',
    icon: 'https://api.dicebear.com/7.x/shapes/svg?seed=server3',
    memberCount: 120,
  },
];

export const mockUser: MockUser = {
  id: '987654321098765432',
  username: 'DemoUser',
  discriminator: '0',
  avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=demo',
  servers: mockServers,
};

export const ticketSubjects: TicketSubject[] = [
  {
    id: 'technical',
    name: 'Technical Problem',
    category: 'integrations',
    icon: 'Wrench',
  },
  {
    id: 'documentation',
    name: 'Documentation Issue',
    category: 'integrations',
    icon: 'FileText',
  },
  {
    id: 'feedback',
    name: 'Feedback / Suggestion',
    category: 'discord',
    icon: 'MessageSquare',
  },
  {
    id: 'other',
    name: 'Other',
    category: 'discord',
    icon: 'HelpCircle',
  },
];

export function getSubjectsByCategory(category: 'integrations' | 'discord'): TicketSubject[] {
  return ticketSubjects.filter(s => s.category === category);
}

export function getSubjectById(id: string): TicketSubject | undefined {
  return ticketSubjects.find(s => s.id === id);
}
