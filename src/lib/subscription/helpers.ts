/**
 * Subscription Helpers
 *
 * Utilities for checking subscription status and access.
 */

import { prisma } from '@/lib/db/client';
import { SubscriptionStatus, User, Subscription, Tenant } from '@/generated/prisma';

export type UserWithSubscription = User & {
  subscription: Subscription | null;
  tenants: Tenant[];
};

/**
 * Check if a subscription grants access to the portal
 *
 * Returns true for:
 * - ACTIVE: Paid and current
 * - PAST_DUE: Payment failed but in grace period
 * - CANCELED: Canceled but still within the paid period
 */
export function hasActiveAccess(subscription: Subscription | null): boolean {
  if (!subscription) {
    return false;
  }

  // ACTIVE and PAST_DUE always have access
  if (
    subscription.status === SubscriptionStatus.ACTIVE ||
    subscription.status === SubscriptionStatus.PAST_DUE
  ) {
    return true;
  }

  // CANCELED has access until period end
  if (subscription.status === SubscriptionStatus.CANCELED) {
    return new Date() < subscription.currentPeriodEnd;
  }

  // EXPIRED has no access
  return false;
}

/**
 * Get user with subscription and tenants
 */
export async function getUserWithSubscription(
  userId: string
): Promise<UserWithSubscription | null> {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
      tenants: true,
    },
  });
}

/**
 * Get user by Discord ID with subscription and tenants
 */
export async function getUserByDiscordId(
  discordId: string
): Promise<UserWithSubscription | null> {
  return prisma.user.findUnique({
    where: { discordId },
    include: {
      subscription: true,
      tenants: true,
    },
  });
}

/**
 * Get user by Stripe customer ID
 */
export async function getUserByStripeCustomerId(
  stripeCustomerId: string
): Promise<UserWithSubscription | null> {
  return prisma.user.findUnique({
    where: { stripeCustomerId },
    include: {
      subscription: true,
      tenants: true,
    },
  });
}

/**
 * Create or update user from Discord login
 */
export async function upsertUserFromDiscord({
  discordId,
  discordUsername,
  discordAvatar,
  email,
}: {
  discordId: string;
  discordUsername: string;
  discordAvatar?: string | null;
  email?: string | null;
}): Promise<User> {
  return prisma.user.upsert({
    where: { discordId },
    create: {
      discordId,
      discordUsername,
      discordAvatar,
      email,
    },
    update: {
      discordUsername,
      discordAvatar,
      email,
    },
  });
}

/**
 * Determine the next step for a user in the signup flow
 *
 * Returns:
 * - 'subscribe' - User needs to subscribe
 * - 'onboarding' - User has subscription but no tenant
 * - 'dashboard' - User is fully set up
 * - 'resubscribe' - User's subscription has expired
 */
export function getSignupStep(user: UserWithSubscription):
  'subscribe' | 'onboarding' | 'dashboard' | 'resubscribe' {
  const { subscription, tenants } = user;

  // No subscription - needs to subscribe
  if (!subscription) {
    return 'subscribe';
  }

  // Subscription expired - needs to resubscribe
  if (subscription.status === SubscriptionStatus.EXPIRED) {
    return 'resubscribe';
  }

  // Has active access but no tenant - needs onboarding
  if (hasActiveAccess(subscription) && tenants.length === 0) {
    return 'onboarding';
  }

  // Has active access and tenant - go to dashboard
  if (hasActiveAccess(subscription) && tenants.length > 0) {
    return 'dashboard';
  }

  // Fallback to resubscribe
  return 'resubscribe';
}

/**
 * Format subscription status for display
 */
export function formatSubscriptionStatus(subscription: Subscription | null): {
  status: string;
  description: string;
  color: 'green' | 'yellow' | 'red' | 'gray';
} {
  if (!subscription) {
    return {
      status: 'No Subscription',
      description: 'You do not have an active subscription.',
      color: 'gray',
    };
  }

  switch (subscription.status) {
    case SubscriptionStatus.ACTIVE:
      return {
        status: 'Active',
        description: 'Your subscription is active and in good standing.',
        color: 'green',
      };
    case SubscriptionStatus.PAST_DUE:
      return {
        status: 'Past Due',
        description: 'Your payment failed. Please update your payment method.',
        color: 'yellow',
      };
    case SubscriptionStatus.CANCELED:
      const daysLeft = Math.ceil(
        (subscription.currentPeriodEnd.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
      );
      return {
        status: 'Canceled',
        description: `Your subscription is canceled. You have ${daysLeft} days remaining.`,
        color: 'yellow',
      };
    case SubscriptionStatus.EXPIRED:
      return {
        status: 'Expired',
        description: 'Your subscription has expired. Please resubscribe to continue.',
        color: 'red',
      };
    default:
      return {
        status: 'Unknown',
        description: 'Unable to determine subscription status.',
        color: 'gray',
      };
  }
}
