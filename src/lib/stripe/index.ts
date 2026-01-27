/**
 * Stripe Module
 *
 * Export all Stripe-related utilities.
 * Handles main domain payments only - tenants use external Payment Links.
 */

export {
  stripe,
  SUBSCRIPTION_PRICE_ID,
  createCheckoutSession,
  createGenericCheckoutSession,
  createPortalSession,
  cancelSubscriptionAtPeriodEnd,
  resumeSubscription,
  getStripeSubscription,
  getStripeCustomer,
} from './client';

export {
  handleCheckoutCompleted,
  handleInvoicePaid,
  handleInvoicePaymentFailed,
  handleSubscriptionUpdated,
  handleSubscriptionDeleted,
} from './webhooks';
