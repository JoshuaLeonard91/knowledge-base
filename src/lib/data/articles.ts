import { Article, ArticleCategory } from '@/types';

export const categories: ArticleCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Essential guides to get you up and running',
    icon: 'Rocket',
  },
  {
    id: 'faq',
    name: 'FAQ',
    description: 'Answers to frequently asked questions',
    icon: 'HelpCircle',
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting',
    description: 'Solutions for common issues',
    icon: 'Wrench',
  },
];

export const articles: Article[] = [
  {
    slug: 'getting-started-guide',
    title: 'Getting Started Guide',
    category: 'getting-started',
    topic: 'general',
    keywords: ['setup', 'start', 'begin', 'install', 'configure'],
    excerpt: 'Learn the basics and get up and running quickly with our platform.',
    content: `# Getting Started Guide

Welcome! This guide will help you get started.

## Step 1: Create an Account

Sign up using your Discord account to get started.

## Step 2: Configure Settings

After logging in, configure your basic settings.

## Step 3: Explore Features

Browse through the available features and customize your experience.

## Need Help?

If you have any questions, check out our FAQ or submit a support ticket.`,
    relatedSlugs: ['common-questions'],
    icon: 'Rocket',
    readTime: 2,
  },
  {
    slug: 'common-questions',
    title: 'Common Questions',
    category: 'faq',
    topic: 'general',
    keywords: ['faq', 'questions', 'help', 'answers'],
    excerpt: 'Find answers to the most commonly asked questions.',
    content: `# Common Questions

## How do I get started?

Check out our Getting Started Guide for step-by-step instructions.

## How do I contact support?

You can submit a support ticket through our ticket system.

## Is my data secure?

Yes, we take security seriously. All data is encrypted and securely stored.`,
    relatedSlugs: ['getting-started-guide', 'contact-support'],
    icon: 'HelpCircle',
    readTime: 2,
  },
  {
    slug: 'contact-support',
    title: 'How to Contact Support',
    category: 'faq',
    topic: 'general',
    keywords: ['support', 'contact', 'help', 'ticket'],
    excerpt: 'Learn about the different ways to get help from our support team.',
    content: `# How to Contact Support

## Submit a Ticket

The fastest way to get help is to submit a support ticket.

## Join Our Discord

Connect with our community and support team on Discord.

## Response Times

We typically respond within 24-48 hours.`,
    relatedSlugs: ['common-questions'],
    icon: 'MessageCircle',
    readTime: 1,
  },
  {
    slug: 'troubleshooting-basics',
    title: 'Basic Troubleshooting',
    category: 'troubleshooting',
    topic: 'general',
    keywords: ['troubleshoot', 'fix', 'problem', 'issue', 'error'],
    excerpt: 'Basic troubleshooting steps for common issues.',
    content: `# Basic Troubleshooting

## Step 1: Refresh

Try refreshing the page or restarting the application.

## Step 2: Clear Cache

Clear your browser cache and cookies.

## Step 3: Check Status

Check our status page for any ongoing issues.

## Still Having Issues?

If the problem persists, submit a support ticket with details about the issue.`,
    relatedSlugs: ['contact-support', 'common-questions'],
    icon: 'Wrench',
    readTime: 2,
  },
];

export function getArticlesByCategory(category: Article['category']): Article[] {
  return articles.filter(a => a.category === category);
}

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find(a => a.slug === slug);
}

export function searchArticles(query: string): Article[] {
  const lowerQuery = query.toLowerCase();
  return articles
    .map(article => {
      let score = 0;
      if (article.title.toLowerCase().includes(lowerQuery)) score += 10;
      if (article.excerpt.toLowerCase().includes(lowerQuery)) score += 5;
      if (article.keywords.some(k => k.toLowerCase().includes(lowerQuery))) score += 8;
      return { article, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ article }) => article);
}

export function getRelatedArticles(slug: string): Article[] {
  const article = getArticleBySlug(slug);
  if (!article) return [];
  return article.relatedSlugs
    .map(s => getArticleBySlug(s))
    .filter((a): a is Article => a !== undefined);
}
