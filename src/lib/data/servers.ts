import { MockServer, MockUser, TicketCategory } from '@/types';

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

// Available ticket categories (fallback for API validation)
export const ticketCategories: TicketCategory[] = [
  { id: 'technical', name: 'Technical Problem', icon: 'Wrench', order: 1 },
  { id: 'setup', name: 'Setup & Configuration', icon: 'Gear', order: 2 },
  { id: 'not-working', name: 'Feature Not Working', icon: 'WarningCircle', order: 3 },
  { id: 'permissions', name: 'Permission Issue', icon: 'Lock', order: 4 },
  { id: 'billing', name: 'Billing & Account', icon: 'CreditCard', order: 5 },
  { id: 'feedback', name: 'Feedback & Suggestions', icon: 'ChatCircle', order: 6 },
  { id: 'other', name: 'Other', icon: 'Question', order: 7 },
];

export function getCategoryById(id: string): TicketCategory | undefined {
  return ticketCategories.find(c => c.id === id);
}
