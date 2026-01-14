import { IconProps } from '@phosphor-icons/react';
import { Wrench, Users, Headset, Clock, Shield, Rocket, GearSix, ChatCircleDots, Handshake } from '@phosphor-icons/react/dist/ssr';

export interface ServiceTier {
  name: string;
  description: string;
  features: string[];
  sla: {
    responseTime: string;
    availability: string;
    support: string;
  };
  highlighted?: boolean;
}

export interface Service {
  id: string;
  name: string;
  tagline: string;
  description: string;
  icon: React.ComponentType<IconProps>;
  color: string;
  features: string[];
  relatedArticles?: string[]; // Article slugs
}

export const services: Service[] = [
  {
    id: 'managed-bots',
    name: 'Managed Bot Services',
    tagline: 'Let us handle your Discord integrations',
    description: 'Full-service management of your Discord bots and integrations. We handle hosting, updates, monitoring, and troubleshooting so you can focus on your community.',
    icon: Wrench,
    color: 'var(--accent-primary)',
    features: [
      '24/7 bot monitoring and uptime',
      'Automatic updates and security patches',
      'Custom feature development',
      'Performance optimization',
      'Database management and backups',
    ],
    relatedArticles: ['getting-started', 'welcome-guide'],
  },
  {
    id: 'consulting',
    name: 'Consulting Services',
    tagline: 'Expert guidance for your Discord strategy',
    description: 'One-on-one consulting sessions with Discord experts. Get personalized advice on server setup, moderation strategies, bot selection, and community growth.',
    icon: Users,
    color: '#7289DA',
    features: [
      'Server architecture review',
      'Moderation workflow optimization',
      'Bot stack recommendations',
      'Community growth strategies',
      'Security and permissions audit',
    ],
    relatedArticles: ['permissions-setup'],
  },
  {
    id: 'priority-support',
    name: 'Priority Support',
    tagline: 'Fast response when you need it most',
    description: 'Skip the queue with priority support tickets. Get faster response times, dedicated support agents, and escalation paths for critical issues.',
    icon: Headset,
    color: 'var(--accent-success)',
    features: [
      'Guaranteed response times',
      'Dedicated support agent',
      'Phone/video call support option',
      'Priority bug fixes',
      'Direct escalation path',
    ],
    relatedArticles: ['getting-started'],
  },
  {
    id: 'custom-development',
    name: 'Custom Development',
    tagline: 'Bespoke solutions for unique needs',
    description: 'Need something specific? Our development team can build custom bots, integrations, and tools tailored to your exact requirements.',
    icon: GearSix,
    color: 'var(--accent-warning)',
    features: [
      'Custom bot development',
      'Third-party API integrations',
      'Dashboard and admin panels',
      'Webhooks and automation',
      'White-label solutions',
    ],
  },
];

export const serviceTiers: ServiceTier[] = [
  {
    name: 'Community',
    description: 'Perfect for small communities just getting started',
    features: [
      'Access to knowledge base',
      'Community Discord support',
      'Standard ticket support',
      'Email notifications',
    ],
    sla: {
      responseTime: '48 hours',
      availability: 'Business hours',
      support: 'Email & tickets',
    },
  },
  {
    name: 'Professional',
    description: 'For growing communities that need reliable support',
    features: [
      'Everything in Community',
      'Priority ticket queue',
      'Faster response times',
      'Monthly check-in calls',
      'Dedicated account manager',
    ],
    sla: {
      responseTime: '24 hours',
      availability: 'Extended hours',
      support: 'Email, tickets & chat',
    },
    highlighted: true,
  },
  {
    name: 'Enterprise',
    description: 'For large communities with mission-critical needs',
    features: [
      'Everything in Professional',
      'Guaranteed 4-hour response',
      '24/7 emergency support',
      'Custom SLA agreements',
      'Dedicated support team',
      'On-call engineer access',
    ],
    sla: {
      responseTime: '4 hours',
      availability: '24/7',
      support: 'All channels + phone',
    },
  },
];

export const slaHighlights = [
  {
    icon: Clock,
    title: 'Fast Response Times',
    description: 'We commit to responding within your SLA timeframe, every time.',
  },
  {
    icon: Shield,
    title: 'Guaranteed Uptime',
    description: '99.9% uptime guarantee for all managed services.',
  },
  {
    icon: Rocket,
    title: 'Proactive Monitoring',
    description: 'We detect and resolve issues before they impact your community.',
  },
  {
    icon: ChatCircleDots,
    title: 'Transparent Communication',
    description: 'Real-time status updates and post-incident reports.',
  },
  {
    icon: Handshake,
    title: 'Commitment to Excellence',
    description: 'If we miss an SLA target, we make it right.',
  },
];
