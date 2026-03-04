'use client';

/**
 * Dashboard Ticket Form Settings Page
 *
 * Allows tenant owners to configure which optional fields
 * appear on the ticket submission form.
 */

import { useState, useEffect } from 'react';
import { useDashboard } from '@/components/dashboard/DashboardContext';
import { FloatingPanel } from '@/components/dashboard/FloatingPanel';

export default function TicketFormSettingsPage() {
  const { isLoading: contextLoading } = useDashboard();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [savedSettings, setSavedSettings] = useState({ showServerIdField: false, showDiscordUserIdField: false });
  const [settings, setSettings] = useState({ showServerIdField: false, showDiscordUserIdField: false });

  const hasChanges = settings.showServerIdField !== savedSettings.showServerIdField
    || settings.showDiscordUserIdField !== savedSettings.showDiscordUserIdField;

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/dashboard/settings/tickets');
        if (!res.ok) return;
        const data = await res.json();
        const s = {
          showServerIdField: data.showServerIdField ?? false,
          showDiscordUserIdField: data.showDiscordUserIdField ?? false,
        };
        setSavedSettings(s);
        setSettings(s);
      } catch {
        setError('Failed to load settings');
      } finally {
        setIsLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleDiscard = () => {
    setSettings(savedSettings);
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

      const res = await fetch('/api/dashboard/settings/tickets', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfData.csrf,
        },
        body: JSON.stringify(settings),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to save settings');
      }

      setSavedSettings(settings);
      setSuccess('Ticket form settings saved successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      setSettings(savedSettings);
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
          <div className="mt-8 space-y-4">
            <div className="h-20 bg-[var(--bg-tertiary)] rounded-xl" />
            <div className="h-20 bg-[var(--bg-tertiary)] rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-1 text-[var(--text-primary)]">Ticket Form</h1>
      <p className="text-[var(--text-secondary)] text-sm mb-6">Control which optional fields appear on the ticket submission form.</p>

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

      <FloatingPanel>
        <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-1">Field Visibility</h2>
        <p className="text-sm text-[var(--text-secondary)] mb-6">
          Toggle Discord-related fields on or off for your ticket form.
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
              checked={settings.showServerIdField}
              onChange={(e) => {
                setSettings(prev => ({ ...prev, showServerIdField: e.target.checked }));
                setSuccess(null);
                setError(null);
              }}
              disabled={isSaving}
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
              checked={settings.showDiscordUserIdField}
              onChange={(e) => {
                setSettings(prev => ({ ...prev, showDiscordUserIdField: e.target.checked }));
                setSuccess(null);
                setError(null);
              }}
              disabled={isSaving}
              className="h-5 w-5 rounded border-[var(--border-primary)] accent-[var(--accent-primary)] cursor-pointer"
            />
          </label>
        </div>

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
