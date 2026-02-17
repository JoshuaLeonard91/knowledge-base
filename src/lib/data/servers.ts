import { TicketCategory } from '@/types';

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
