'use client';

/**
 * Dashboard Settings Page
 *
 * Allows tenant owners to change their portal's color theme
 * and configure ticket form field visibility.
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

  // Ticket form settings
  const [savedTicketSettings, setSavedTicketSettings] = useState({ showServerIdField: false, showDiscordUserIdField: false });
  const [ticketSettings, setTicketSettings] = useState({ showServerIdField: false, showDiscordUserIdField: false });
  const [isSavingTickets, setIsSavingTickets] = useState(false);

  const hasThemeChanges = selectedTheme !== savedTheme;
  const hasTicketChanges = ticketSettings.showServerIdField !== savedTicketSettings.showServerIdField
    || ticketSettings.showDiscordUserIdField !== savedTicketSettings.showDiscordUserIdField;

  // Fetch current theme + ticket settings
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const [themeRes, ticketRes] = await Promise.all([
          fetch('/api/dashboard/settings/theme'),
          fetch('/api/dashboard/settings/tickets'),
        ]);

        if (themeRes.ok) {
          const data = await themeRes.json();
          setSavedTheme(data.theme || 'dark');
          setSelectedTheme(data.theme || 'dark');
        }

        if (ticketRes.ok) {
          const data = await ticketRes.json();
          const settings = {
            showServerIdField: data.showServerIdField ?? false,
            showDiscordUserIdField: data.showDiscordUserIdField ?? false,
          };
          setSavedTicketSettings(settings);
          setTicketSettings(settings);
        }
      } catch {
        setError('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
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

  const handleTicketDiscard = () => {
    setTicketSettings(savedTicketSettings);
    setSuccess(null);
    setError(null);
  };

  const handleTicketSave = async () => {
    setIsSavingTickets(true);
    setError(null);
    setSuccess(null);

    try {
      const csrfRes = await fetch('/api/auth/session');
      const csrfData = await csrfRes.json();

      const res = await fetch('/api/dashboard/settings/tickets', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrf,
        },
        body: JSON.stringify(ticketSettings),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save ticket settings');
      }

      setSavedTicketSettings(ticketSettings);
      setSuccess('Ticket form settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save ticket settings');
      setTicketSettings(savedTicketSettings);
    } finally {
      setIsSavingTickets(false);
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
      <h1 className="text-2xl font-bold mb-1 text-[var(--text-primary)]">Settings</h1>
      <p className="text-[var(--text-secondary)] text-sm mb-6">Customize your portal appearance and ticket form.</p>

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
        {hasThemeChanges && (
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

      {/* Ticket Form Section */}
      <FloatingPanel className="mt-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Ticket Form</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Control which optional fields appear on your ticket submission form.
        </p>

        <div className="space-y-4">
          <label className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] cursor-pointer select-none">
            <div>
              <p className="font-medium text-[var(--text-primary)]">Show Discord Server ID field</p>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                Ask users for their Discord server ID when submitting a ticket.
              </p>
            </div>
            <input
              type="checkbox"
              checked={ticketSettings.showServerIdField}
              onChange={(e) => {
                setTicketSettings(prev => ({ ...prev, showServerIdField: e.target.checked }));
                setSuccess(null);
                setError(null);
              }}
              disabled={isSavingTickets}
              className="h-5 w-5 rounded border-[var(--border-primary)] accent-[var(--accent-primary)] cursor-pointer"
            />
          </label>

          <label className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-primary)] cursor-pointer select-none">
            <div>
              <p className="font-medium text-[var(--text-primary)]">Show Discord User ID field</p>
              <p className="text-sm text-[var(--text-muted)] mt-0.5">
                Allow non-Discord users to provide their Discord user ID for DM notifications.
              </p>
            </div>
            <input
              type="checkbox"
              checked={ticketSettings.showDiscordUserIdField}
              onChange={(e) => {
                setTicketSettings(prev => ({ ...prev, showDiscordUserIdField: e.target.checked }));
                setSuccess(null);
                setError(null);
              }}
              disabled={isSavingTickets}
              className="h-5 w-5 rounded border-[var(--border-primary)] accent-[var(--accent-primary)] cursor-pointer"
            />
          </label>
        </div>

        {/* Actions */}
        {hasTicketChanges && (
          <div className="flex items-center gap-3 mt-6 pt-6 border-t border-white/[0.06]">
            <button
              onClick={handleTicketSave}
              disabled={isSavingTickets}
              className="px-5 py-2.5 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] text-white font-medium rounded-lg transition disabled:opacity-50"
            >
              {isSavingTickets ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={handleTicketDiscard}
              disabled={isSavingTickets}
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
