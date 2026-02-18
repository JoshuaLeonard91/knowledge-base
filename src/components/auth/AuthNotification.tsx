'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchParams, usePathname, useRouter } from 'next/navigation';
import { useAuth } from './AuthProvider';
import {
  X,
  Warning,
  CheckCircle,
  ShieldWarning,
  Clock,
  ArrowClockwise,
  SignIn,
} from '@phosphor-icons/react';

type NotificationType = 'error' | 'rate-limit' | 'success' | null;

interface NotificationState {
  type: NotificationType;
  title: string;
  message: string;
  retryAfter?: number;
}

const ERROR_MESSAGES: Record<string, { title: string; message: string }> = {
  RateLimit: {
    title: 'Too Many Attempts',
    message: 'You\'ve made too many requests. Please wait before trying again.',
  },
  RATE_LIMIT: {
    title: 'Too Many Attempts',
    message: 'You\'ve made too many requests. Please wait before trying again.',
  },
  InvalidState: {
    title: 'Session Expired',
    message: 'Your login session timed out. This can happen if you waited too long on the provider page.',
  },
  StateExpired: {
    title: 'Session Expired',
    message: 'Your login session expired. Please try signing in again.',
  },
  TokenExchangeFailed: {
    title: 'Authentication Failed',
    message: 'We couldn\'t verify your identity with the provider. Please try again.',
  },
  AccessDenied: {
    title: 'Access Denied',
    message: 'The login was cancelled or access was denied. You can try again anytime.',
  },
  ProviderNotConfigured: {
    title: 'Provider Unavailable',
    message: 'This login method is not currently available. Please try a different provider.',
  },
  NoToken: {
    title: 'Login Interrupted',
    message: 'The login process was interrupted. Please try signing in again.',
  },
  InvalidToken: {
    title: 'Login Expired',
    message: 'Your login verification expired. This happens if the redirect took too long.',
  },
  Configuration: {
    title: 'Configuration Error',
    message: 'There\'s a temporary server issue. Please try again in a moment.',
  },
  NoAccessToken: {
    title: 'Authentication Error',
    message: 'The provider didn\'t return the expected credentials. Please try again.',
  },
};

const DEFAULT_ERROR = {
  title: 'Something Went Wrong',
  message: 'An unexpected error occurred during login. Please try again.',
};

export function AuthNotification() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const [notification, setNotification] = useState<NotificationState | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const prevUser = useRef(user);

  // --- Callbacks (declared before effects that use them) ---

  const dismiss = useCallback(() => {
    setIsExiting(true);
    if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    setTimeout(() => {
      setIsVisible(false);
      setIsExiting(false);
      setNotification(null);
    }, 300);
  }, []);

  const handleRetry = useCallback(() => {
    dismiss();
    if (pathname !== '/support') {
      router.push('/support');
    }
  }, [dismiss, pathname, router]);

  // --- Effects ---

  // Detect OAuth errors from URL params
  useEffect(() => {
    const error = searchParams.get('error');
    if (!error) return;

    const errorInfo = ERROR_MESSAGES[error] || DEFAULT_ERROR;
    const isRateLimit = error === 'RateLimit' || error === 'RATE_LIMIT';

    setNotification({
      type: isRateLimit ? 'rate-limit' : 'error',
      title: errorInfo.title,
      message: errorInfo.message,
      retryAfter: isRateLimit ? 60 : undefined,
    });
    setIsVisible(true);
    setIsExiting(false);

    if (isRateLimit) {
      setCountdown(60);
    }

    // Clean the error param from URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.delete('error');
    window.history.replaceState({}, '', url.pathname + url.search);
  }, [searchParams]);

  // Detect successful login (user appeared)
  // Uses sessionStorage so the flag persists across hard navigations
  // (e.g., Stripe redirect → success page → dashboard)
  useEffect(() => {
    const alreadyShown = sessionStorage.getItem('welcomeShown') === 'true';
    if (user && !prevUser.current && !alreadyShown) {
      sessionStorage.setItem('welcomeShown', 'true');
      setNotification({
        type: 'success',
        title: 'Welcome back!',
        message: `Signed in as ${user.displayName}`,
      });
      setIsVisible(true);
      setIsExiting(false);

      // Auto-dismiss success after 3 seconds
      dismissTimerRef.current = setTimeout(() => dismiss(), 3000);
    }
    // Clear flag on logout so it shows again next login
    if (!user && prevUser.current) {
      sessionStorage.removeItem('welcomeShown');
    }
    prevUser.current = user;
  }, [user, dismiss]);

  // Rate limit countdown
  useEffect(() => {
    if (countdown <= 0) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [countdown]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current);
    };
  }, []);

  if (!isVisible || !notification) return null;

  const typeConfig = {
    error: {
      icon: <Warning size={24} weight="fill" />,
      iconColor: 'text-red-400',
      borderColor: 'border-red-500/30',
      glowColor: 'shadow-[0_0_40px_rgba(239,68,68,0.15)]',
      accentBar: 'bg-red-500',
    },
    'rate-limit': {
      icon: <ShieldWarning size={24} weight="fill" />,
      iconColor: 'text-amber-400',
      borderColor: 'border-amber-500/30',
      glowColor: 'shadow-[0_0_40px_rgba(245,158,11,0.15)]',
      accentBar: 'bg-amber-500',
    },
    success: {
      icon: <CheckCircle size={24} weight="fill" />,
      iconColor: 'text-emerald-400',
      borderColor: 'border-emerald-500/30',
      glowColor: 'shadow-[0_0_40px_rgba(16,185,129,0.15)]',
      accentBar: 'bg-emerald-500',
    },
  };

  const config = typeConfig[notification.type!];

  return (
    <div className="fixed inset-0 z-[100] pointer-events-none flex items-start justify-center pt-6 px-4">
      {/* Backdrop for errors (clickable to dismiss) */}
      {notification.type !== 'success' && (
        <div
          className={`fixed inset-0 pointer-events-auto transition-opacity duration-300 ${
            isExiting ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }}
          onClick={dismiss}
        />
      )}

      {/* Notification card */}
      <div
        className={`
          relative pointer-events-auto w-full max-w-md
          overflow-hidden rounded-2xl
          border ${config.borderColor}
          ${config.glowColor}
          transition-all duration-300 ease-out
          ${isExiting
            ? 'opacity-0 -translate-y-4 scale-95'
            : 'animate-scale-in'
          }
        `}
        style={{
          background: 'color-mix(in srgb, var(--bg-secondary) 90%, transparent)',
          backdropFilter: 'blur(20px)',
        }}
      >
        {/* Accent bar at top */}
        <div className={`h-1 w-full ${config.accentBar}`} />

        {/* Content */}
        <div className="p-5">
          {/* Header row */}
          <div className="flex items-start gap-3.5">
            {/* Icon with pulse ring for rate limit */}
            <div className="relative flex-shrink-0 mt-0.5">
              <div className={config.iconColor}>
                {config.icon}
              </div>
              {notification.type === 'rate-limit' && countdown > 0 && (
                <span className="absolute -top-1 -right-1 flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500" />
                </span>
              )}
            </div>

            {/* Text content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-[15px] font-semibold text-[var(--text-primary)] leading-tight">
                {notification.title}
              </h3>
              <p className="mt-1 text-[13px] text-[var(--text-secondary)] leading-relaxed">
                {notification.message}
              </p>

              {/* Rate limit countdown */}
              {notification.type === 'rate-limit' && countdown > 0 && (
                <div className="mt-3 flex items-center gap-2.5">
                  <div className="flex items-center gap-1.5 text-amber-400">
                    <Clock size={14} weight="bold" />
                    <span className="text-xs font-mono font-semibold tabular-nums">
                      {Math.floor(countdown / 60)}:{String(countdown % 60).padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex-1 h-1 rounded-full bg-[var(--bg-tertiary)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-500 to-amber-400 transition-all duration-1000 ease-linear"
                      style={{ width: `${(countdown / 60) * 100}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Rate limit - retry button appears when countdown finishes */}
              {notification.type === 'rate-limit' && countdown === 0 && (
                <button
                  onClick={handleRetry}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                    text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg
                    hover:bg-amber-500/20 hover:border-amber-500/30 transition-all"
                >
                  <ArrowClockwise size={12} weight="bold" />
                  Try Again
                </button>
              )}

              {/* Error retry */}
              {notification.type === 'error' && (
                <button
                  onClick={handleRetry}
                  className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
                    text-[var(--text-secondary)] bg-[var(--bg-tertiary)] border border-[var(--border-primary)] rounded-lg
                    hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-all"
                >
                  <SignIn size={12} weight="bold" />
                  Try Again
                </button>
              )}
            </div>

            {/* Dismiss button */}
            <button
              onClick={dismiss}
              className="flex-shrink-0 p-1 -m-1 rounded-lg text-[var(--text-muted)]
                hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]
                transition-all"
            >
              <X size={16} weight="bold" />
            </button>
          </div>
        </div>

        {/* Success progress bar (auto-dismiss indicator) */}
        {notification.type === 'success' && (
          <div className="h-0.5 w-full bg-[var(--bg-tertiary)]">
            <div
              className="h-full bg-emerald-500 animate-[shrink_3s_linear_forwards]"
              style={{ width: '100%' }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
