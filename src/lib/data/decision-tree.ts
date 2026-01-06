import { TreeNode } from '@/types';

export const decisionTree: TreeNode[] = [
  {
    id: 'root',
    type: 'question',
    title: 'What do you need help with?',
    description: 'Select the area you need assistance with',
    options: [
      { label: 'Account Issues', icon: 'User', nextId: 'account' },
      { label: 'Technical Problems', icon: 'Wrench', nextId: 'technical' },
      { label: 'General Questions', icon: 'HelpCircle', nextId: 'general' },
    ],
  },
  // Account branch
  {
    id: 'account',
    type: 'question',
    title: 'What account issue are you experiencing?',
    options: [
      { label: 'Can\'t log in', nextId: 'account-login' },
      { label: 'Settings not saving', nextId: 'account-settings' },
      { label: 'Other account issue', nextId: 'account-other' },
    ],
  },
  {
    id: 'account-login',
    type: 'solution',
    title: 'Login Issues',
    solution: {
      steps: [
        'Make sure you\'re using the correct Discord account',
        'Try clearing your browser cookies',
        'Disable any browser extensions that might interfere',
        'Try using a different browser',
      ],
      articleSlug: 'troubleshooting-basics',
      canFileTicket: true,
    },
  },
  {
    id: 'account-settings',
    type: 'solution',
    title: 'Settings Not Saving',
    solution: {
      steps: [
        'Refresh the page and try again',
        'Check your internet connection',
        'Clear your browser cache',
        'Try a different browser',
      ],
      articleSlug: 'common-questions',
      canFileTicket: true,
    },
  },
  {
    id: 'account-other',
    type: 'solution',
    title: 'Other Account Issues',
    solution: {
      steps: [
        'Check our FAQ for common questions',
        'Review the account settings guide',
        'If the issue persists, submit a support ticket',
      ],
      articleSlug: 'common-questions',
      canFileTicket: true,
    },
  },
  // Technical branch
  {
    id: 'technical',
    type: 'question',
    title: 'What technical issue are you facing?',
    options: [
      { label: 'Error messages', nextId: 'technical-error' },
      { label: 'Something not working', nextId: 'technical-broken' },
      { label: 'Slow performance', nextId: 'technical-slow' },
    ],
  },
  {
    id: 'technical-error',
    type: 'solution',
    title: 'Error Messages',
    solution: {
      steps: [
        'Note the exact error message',
        'Try refreshing the page',
        'Clear your browser cache and cookies',
        'If the error persists, submit a ticket with the error details',
      ],
      articleSlug: 'troubleshooting-basics',
      canFileTicket: true,
    },
  },
  {
    id: 'technical-broken',
    type: 'solution',
    title: 'Feature Not Working',
    solution: {
      steps: [
        'Refresh the page',
        'Check if you have the required permissions',
        'Try logging out and back in',
        'Check our status page for any ongoing issues',
      ],
      articleSlug: 'troubleshooting-basics',
      canFileTicket: true,
    },
  },
  {
    id: 'technical-slow',
    type: 'solution',
    title: 'Slow Performance',
    solution: {
      steps: [
        'Check your internet connection',
        'Close unnecessary browser tabs',
        'Clear your browser cache',
        'Try disabling browser extensions',
      ],
      canFileTicket: true,
    },
  },
  // General branch
  {
    id: 'general',
    type: 'question',
    title: 'What would you like to know?',
    options: [
      { label: 'How to get started', nextId: 'general-start' },
      { label: 'How to contact support', nextId: 'general-support' },
    ],
  },
  {
    id: 'general-start',
    type: 'solution',
    title: 'Getting Started',
    solution: {
      steps: [
        'Check out our Getting Started Guide',
        'Log in with your Discord account',
        'Explore the features and settings',
      ],
      articleSlug: 'getting-started-guide',
      canFileTicket: false,
    },
  },
  {
    id: 'general-support',
    type: 'solution',
    title: 'Contacting Support',
    solution: {
      steps: [
        'Browse our help articles for quick answers',
        'Use Get Help for common issues',
        'Submit a support ticket for personalized help',
      ],
      articleSlug: 'contact-support',
      canFileTicket: true,
    },
  },
];

export function getTreeNode(id: string): TreeNode | undefined {
  return decisionTree.find(node => node.id === id);
}

export function getRootNode(): TreeNode {
  return decisionTree.find(node => node.id === 'root')!;
}
