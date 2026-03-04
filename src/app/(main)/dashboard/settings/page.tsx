'use client';

/**
 * Dashboard Settings Page
 *
 * Allows tenant owners to change their portal's color theme.
 * Theme preview is shown within the selector cards — no global DOM mutation needed.
 */

import { useState, useEffect } from 'react';
import { useDashboard } from '@/components/dashboard/DashboardContext';
import { FloatingPanel } from '@/components/dashboard/FloatingPanel';
import { ThemeSelector } from '@/components/dashboard/ThemeSelector';

export default function SettingsPage() {
  const { isLoading: contextLoading } = useDashboard();

  const [isLoading, setIsLoading] = useState(true);
  const [savedTheme, setSavedTheme] = useState('dark');
  const [selectedTheme, setSelectedTheme] = useState('dark');
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = selectedTheme !== savedTheme;

  // Fetch current theme
  useEffect(() => {
    const fetchTheme = async () => {
      try {
        const res = await fetch('/api/dashboard/settings/theme');
        if (!res.ok) return;
        const data = await res.json();
        setSavedTheme(data.theme || 'dark');
        setSelectedTheme(data.theme || 'dark');
      } catch {
        setError('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };
    fetchTheme();
  }, []);

  const handleSelect = (themeId: string) => {
    setSelectedTheme(themeId);
    setSuccess(null);
    setError(null);
  };

  const handleDiscard = () => {
    setSelectedTheme(savedTheme);
    setSuccess(null);
    setError(null);
  };

  const handleSave = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const csrfRes = await fetch('/api/auth/session');
      const csrfData = await csrfRes.json();

      const res = await fetch('/api/dashboard/settings/theme', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrf,
        },
        body: JSON.stringify({ theme: selectedTheme }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save theme');
      }

      setSavedTheme(selectedTheme);
      setSuccess('Theme saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save theme');
      setSelectedTheme(savedTheme);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || contextLoading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-32 bg-[var(--bg-tertiary)] rounded" />
          <div className="h-4 w-64 bg-[var(--bg-tertiary)] rounded" />
          <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 mt-8">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-40 bg-[var(--bg-tertiary)] rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-[var(--text-primary)]">Appearance</h1>
      <p className="text-[var(--text-secondary)] text-sm mb-6">Customize your portal appearance.</p>

      {/* Success */}
      {success && (
        <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
          <p className="text-green-400 text-sm">{success}</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* Theme Section */}
      <FloatingPanel>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Color Theme</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Choose a color theme for your portal. The theme applies to your tenant subdomain.
        </p>

        <ThemeSelector
          selectedTheme={selectedTheme}
          onSelect={handleSelect}
          disabled={isSaving}
        />

        {/* Actions */}
        {hasChanges && (
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/[0.06]">
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="px-5 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleDiscard}
              disabled={isSaving}
              className="px-5 py-2.5 text-[var(--text-secondary)] hover:text-[var(--text-primary)] font-medium rounded-lg transition"
            >
              Discard
            </button>
            <span className="text-sm text-[var(--text-muted)] ml-auto">Unsaved changes</span>
          </div>
        )}
      </FloatingPanel>
    </div>
  );
}
