'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './AuthProvider';
import { SpinnerGap, SignIn } from '@phosphor-icons/react';

// Provider display config
const PROVIDER_INFO: Record<string, { name: string; color: string }> = {
  discord: { name: 'Discord', color: '#5865F2' },
  google: { name: 'Google', color: '#4285F4' },
  github: { name: 'GitHub', color: '#333' },
};

function DiscordIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function GoogleIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

function GitHubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.17 6.839 9.49.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.604-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.464-1.11-1.464-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0 1 12 6.836c.85.004 1.705.115 2.504.337 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.167 22 16.418 22 12c0-5.523-4.477-10-10-10z"/>
    </svg>
  );
}

function ProviderIcon({ provider, size = 16 }: { provider: string; size?: number }) {
  switch (provider) {
    case 'discord': return <DiscordIcon size={size} />;
    case 'google': return <GoogleIcon size={size} />;
    case 'github': return <GitHubIcon size={size} />;
    default: return <SignIn size={size} />;
  }
}

export function LoginButton() {
  const { isLoading } = useAuth();
  const [providers, setProviders] = useState<string[]>([]);
  const [showPicker, setShowPicker] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  // Fetch configured providers
  useEffect(() => {
    fetch('/api/auth/login')
      .then(res => res.json())
      .then(data => {
        if (data.mode === 'oauth' && data.providers) {
          setProviders(data.providers);
        }
      })
      .catch(() => {
        // Fallback to discord only
        setProviders(['discord']);
      });
  }, []);

  // Close picker on outside click
  useEffect(() => {
    if (!showPicker) return;
    const handleClick = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showPicker]);

  const handleProviderClick = useCallback((provider: string) => {
    setIsConnecting(true);
    setShowPicker(false);
    // Redirect to provider OAuth
    window.location.href = `/api/auth/${provider}?callbackUrl=${encodeURIComponent(window.location.pathname)}`;
  }, []);

  const showLoading = isLoading || isConnecting;

  // Single provider — direct button (no picker)
  if (providers.length === 1) {
    const provider = providers[0];
    const info = PROVIDER_INFO[provider] || { name: provider, color: '#666' };

    return (
      <button
        onClick={() => handleProviderClick(provider)}
        disabled={showLoading}
        className="btn-discord btn group relative overflow-hidden whitespace-nowrap !px-4 !py-2 !text-sm"
      >
        <ProviderIcon provider={provider} size={16} />
        <span className="relative z-10">
          {showLoading ? (
            <span className="flex items-center gap-2">
              <SpinnerGap size={16} weight="bold" className="animate-spin" />
              Connecting...
            </span>
          ) : (
            `Login with ${info.name}`
          )}
        </span>
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          style={{ background: `linear-gradient(to right, ${info.color}, ${info.color}dd)` }} />
      </button>
    );
  }

  // Multiple providers — button with dropdown
  return (
    <div className="relative" ref={pickerRef}>
      <button
        onClick={() => setShowPicker(!showPicker)}
        disabled={showLoading}
        className="btn-primary btn group relative overflow-hidden whitespace-nowrap !px-4 !py-2 !text-sm"
      >
        <SignIn size={16} weight="bold" className="relative z-10" />
        <span className="relative z-10">
          {showLoading ? (
            <span className="flex items-center gap-2">
              <SpinnerGap size={16} weight="bold" className="animate-spin" />
              Connecting...
            </span>
          ) : (
            'Sign In'
          )}
        </span>
      </button>

      {showPicker && (
        <div className="absolute right-0 mt-2 w-48 max-w-[calc(100vw-2rem)] glass rounded-xl border border-[var(--border-primary)] shadow-xl p-1.5 space-y-0.5 z-50 animate-slide-down">
          {providers.map((provider) => {
            const info = PROVIDER_INFO[provider] || { name: provider, color: '#666' };
            return (
              <button
                key={provider}
                onClick={() => handleProviderClick(provider)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all"
              >
                <ProviderIcon provider={provider} size={18} />
                Continue with {info.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
