'use client';

/**
 * Integrations Page
 *
 * Configure third-party integrations:
 * - Hygraph CMS (endpoint + token)
 * - Jira Service Desk (URL + email + token)
 *
 * Security:
 * - Credentials are encrypted before storage
 * - Credentials are NEVER displayed back
 * - Only delete action available after setup
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePlatform } from '../../PlatformProvider';

interface IntegrationStatus {
  configured: boolean;
  hasTenant: boolean;
  connectedAt?: string;
}

interface DiscordBotStatus {
  configured: boolean;
  hasTenant: boolean;
  enabled: boolean;
  guildId: string | null;
  connected: boolean;
  connectedAt: string | null;
}

interface StaffMappingItem {
  id: string;
  discordUserId: string;
  jiraAccountId: string;
  displayName: string | null;
}

export default function IntegrationsPage() {
  const router = useRouter();
  const { siteName } = usePlatform();

  // Loading states
  const [isLoading, setIsLoading] = useState(true);

  // Integration statuses
  const [hygraphStatus, setHygraphStatus] = useState<IntegrationStatus | null>(null);
  const [jiraStatus, setJiraStatus] = useState<IntegrationStatus | null>(null);
  const [discordBotStatus, setDiscordBotStatus] = useState<DiscordBotStatus | null>(null);

  // Form states
  const [hygraphForm, setHygraphForm] = useState({ endpoint: '', token: '' });
  const [jiraForm, setJiraForm] = useState({ jiraUrl: '', email: '', apiToken: '', serviceDeskId: '', projectKey: '' });
  const [discordBotForm, setDiscordBotForm] = useState({ botToken: '', guildId: '' });
  const [staffMappings, setStaffMappings] = useState<StaffMappingItem[]>([]);
  const [staffForm, setStaffForm] = useState({ displayName: '', discordUserId: '', jiraAccountId: '' });
  const [isSavingStaff, setIsSavingStaff] = useState(false);
  const [isDeletingStaff, setIsDeletingStaff] = useState<string | null>(null);

  // UI states
  const [activeForm, setActiveForm] = useState<'hygraph' | 'jira' | 'discord-bot' | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch all statuses
  const fetchStatuses = async () => {
    try {
      const [hygraphRes, jiraRes, discordBotRes] = await Promise.all([
        fetch('/api/dashboard/integrations/hygraph'),
        fetch('/api/dashboard/integrations/jira'),
        fetch('/api/dashboard/integrations/discord-bot'),
      ]);

      if (hygraphRes.status === 401) {
        router.push('/signup');
        return;
      }

      const [hygraphData, jiraData, discordBotData] = await Promise.all([
        hygraphRes.json(),
        jiraRes.json(),
        discordBotRes.json(),
      ]);

      setHygraphStatus(hygraphData);
      setJiraStatus(jiraData);
      setDiscordBotStatus(discordBotData);
    } catch (err) {
      console.error('Failed to fetch integration statuses');
      setError('Failed to load integration statuses');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStatuses();
  }, [router]);

  // Get CSRF token
  const getCsrfToken = async (): Promise<string> => {
    const res = await fetch('/api/auth/session');
    const data = await res.json();
    return data.csrf;
  };

  // Validate Hygraph
  const validateHygraph = async (): Promise<boolean> => {
    setIsValidating(true);
    setError(null);

    try {
      const csrf = await getCsrfToken();
      const res = await fetch('/api/dashboard/integrations/hygraph/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify(hygraphForm),
      });

      const data = await res.json();

      if (!data.valid) {
        setError(data.error || 'Invalid credentials');
        return false;
      }

      setSuccess('Connection successful!');
      return true;
    } catch (err) {
      setError('Validation failed');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  // Save Hygraph
  const saveHygraph = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate first
      const isValid = await validateHygraph();
      if (!isValid) {
        setIsSaving(false);
        return;
      }

      const csrf = await getCsrfToken();
      const res = await fetch('/api/dashboard/integrations/hygraph', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify(hygraphForm),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to save');
        return;
      }

      setSuccess('Hygraph connected successfully!');
      setActiveForm(null);
      setHygraphForm({ endpoint: '', token: '' });
      fetchStatuses();
    } catch (err) {
      setError('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Validate Jira
  const validateJira = async (): Promise<boolean> => {
    setIsValidating(true);
    setError(null);

    try {
      const csrf = await getCsrfToken();
      const res = await fetch('/api/dashboard/integrations/jira/validate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify(jiraForm),
      });

      const data = await res.json();

      if (!data.valid) {
        setError(data.error || 'Invalid credentials');
        return false;
      }

      setSuccess('Connection successful!');
      return true;
    } catch (err) {
      setError('Validation failed');
      return false;
    } finally {
      setIsValidating(false);
    }
  };

  // Save Jira
  const saveJira = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      // Validate first
      const isValid = await validateJira();
      if (!isValid) {
        setIsSaving(false);
        return;
      }

      const csrf = await getCsrfToken();
      const res = await fetch('/api/dashboard/integrations/jira', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify(jiraForm),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to save');
        return;
      }

      setSuccess('Jira connected successfully!');
      setActiveForm(null);
      setJiraForm({ jiraUrl: '', email: '', apiToken: '', serviceDeskId: '', projectKey: '' });
      fetchStatuses();
    } catch (err) {
      setError('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Save Discord Bot
  const saveDiscordBot = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(null);

    try {
      const csrf = await getCsrfToken();
      const res = await fetch('/api/dashboard/integrations/discord-bot', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify({ botToken: discordBotForm.botToken, guildId: discordBotForm.guildId, enabled: true }),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to save');
        return;
      }

      if (data.warning) {
        setSuccess(data.warning);
      } else {
        setSuccess('Discord Bot connected successfully!');
      }
      setActiveForm(null);
      setDiscordBotForm({ botToken: '', guildId: '' });
      fetchStatuses();
    } catch (err) {
      setError('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  // Delete integration
  const deleteIntegration = async (type: 'hygraph' | 'jira' | 'discord-bot') => {
    setIsDeleting(type);
    setError(null);

    try {
      const csrf = await getCsrfToken();
      const res = await fetch(`/api/dashboard/integrations/${type}`, {
        method: 'DELETE',
        headers: {
          'X-CSRF-Token': csrf,
        },
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to disconnect');
        return;
      }

      const names: Record<string, string> = { hygraph: 'Hygraph', jira: 'Jira', 'discord-bot': 'Discord Bot' };
      setSuccess(`${names[type]} disconnected`);
      fetchStatuses();
    } catch (err) {
      setError('Failed to disconnect');
    } finally {
      setIsDeleting(null);
    }
  };

  // Fetch staff mappings
  const fetchStaffMappings = async () => {
    try {
      const res = await fetch('/api/dashboard/integrations/discord-bot/staff');
      if (res.ok) {
        const data = await res.json();
        setStaffMappings(data.mappings || []);
      }
    } catch {
      // Silently fail — staff mappings are optional
    }
  };

  // Add staff mapping
  const addStaffMapping = async () => {
    setIsSavingStaff(true);
    setError(null);

    try {
      const csrf = await getCsrfToken();
      const res = await fetch('/api/dashboard/integrations/discord-bot/staff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrf,
        },
        body: JSON.stringify(staffForm),
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to add staff mapping');
        return;
      }

      setStaffForm({ displayName: '', discordUserId: '', jiraAccountId: '' });
      fetchStaffMappings();
      setSuccess('Staff mapping added');
    } catch {
      setError('Failed to add staff mapping');
    } finally {
      setIsSavingStaff(false);
    }
  };

  // Delete staff mapping
  const deleteStaffMapping = async (mappingId: string) => {
    setIsDeletingStaff(mappingId);
    setError(null);

    try {
      const csrf = await getCsrfToken();
      const res = await fetch(`/api/dashboard/integrations/discord-bot/staff?id=${mappingId}`, {
        method: 'DELETE',
        headers: { 'X-CSRF-Token': csrf },
      });

      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to remove staff mapping');
        return;
      }

      fetchStaffMappings();
    } catch {
      setError('Failed to remove staff mapping');
    } finally {
      setIsDeletingStaff(null);
    }
  };

  // Fetch staff mappings when both discord + jira are connected
  useEffect(() => {
    if (discordBotStatus?.configured && jiraStatus?.configured) {
      fetchStaffMappings();
    }
  }, [discordBotStatus?.configured, jiraStatus?.configured]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0a0a0f] to-[#12121a]">
      {/* Header */}
      <header className="border-b border-white/10 bg-[#0a0a0f]/80 backdrop-blur-sm sticky top-0 z-50">
        <nav className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/dashboard" className="text-xl font-bold text-white">
            {siteName}
          </Link>
          <Link href="/dashboard" className="text-white/60 hover:text-white transition">
            &larr; Back to Dashboard
          </Link>
        </nav>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto py-12 px-6">
        <h1 className="text-3xl font-bold mb-2">Integrations</h1>
        <p className="text-white/60 mb-8">Connect third-party services to your portal.</p>

        {/* Success/Error Messages */}
        {success && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <p className="text-green-400 text-sm flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {success}
            </p>
          </div>
        )}

        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <div className="space-y-6">
          {/* Hygraph Card */}
          <div className="bg-[#16161f] rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-purple-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-purple-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Hygraph CMS</h3>
                  <p className="text-sm text-white/60">Content management for your portal</p>
                </div>
              </div>
              <span className={`px-3 py-1 text-sm rounded-full ${
                hygraphStatus?.configured
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {hygraphStatus?.configured ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            {/* Connected State */}
            {hygraphStatus?.configured && activeForm !== 'hygraph' && (
              <div className="px-6 pb-6">
                <p className="text-sm text-white/60 mb-4">
                  Connected on {hygraphStatus.connectedAt ? new Date(hygraphStatus.connectedAt).toLocaleDateString() : 'Unknown'}
                </p>
                <button
                  onClick={() => deleteIntegration('hygraph')}
                  disabled={isDeleting === 'hygraph'}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {isDeleting === 'hygraph' ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            )}

            {/* Setup Form */}
            {!hygraphStatus?.configured && activeForm !== 'hygraph' && (
              <div className="px-6 pb-6">
                <button
                  onClick={() => { setActiveForm('hygraph'); setError(null); setSuccess(null); }}
                  className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg text-sm font-medium transition"
                >
                  Connect Hygraph
                </button>
              </div>
            )}

            {activeForm === 'hygraph' && (
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Endpoint URL</label>
                  <input
                    type="url"
                    value={hygraphForm.endpoint}
                    onChange={(e) => setHygraphForm({ ...hygraphForm, endpoint: e.target.value })}
                    placeholder="https://api-xx.hygraph.com/v2/..."
                    className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">API Token</label>
                  <input
                    type="password"
                    value={hygraphForm.token}
                    onChange={(e) => setHygraphForm({ ...hygraphForm, token: e.target.value })}
                    placeholder="eyJhbGciOiJSUzI1NiIs..."
                    className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-purple-500/50"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={validateHygraph}
                    disabled={isValidating || !hygraphForm.endpoint || !hygraphForm.token}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {isValidating ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    onClick={saveHygraph}
                    disabled={isSaving || !hygraphForm.endpoint || !hygraphForm.token}
                    className="px-4 py-2 bg-purple-600 hover:bg-purple-500 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setActiveForm(null); setHygraphForm({ endpoint: '', token: '' }); setError(null); }}
                    className="px-4 py-2 text-white/60 hover:text-white text-sm transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Jira Card */}
          <div className="bg-[#16161f] rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-blue-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-blue-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M11.571 11.513H0a5.218 5.218 0 0 0 5.232 5.215h2.13v2.057A5.215 5.215 0 0 0 12.575 24V12.518a1.005 1.005 0 0 0-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 0 0 5.215 5.214h2.129v2.058a5.218 5.218 0 0 0 5.215 5.214V6.758a1.001 1.001 0 0 0-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 0 0 5.215 5.215h2.129v2.057A5.215 5.215 0 0 0 24 12.483V1.005A1.005 1.005 0 0 0 23.013 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Jira Service Desk</h3>
                  <p className="text-sm text-white/60">Ticket management integration</p>
                </div>
              </div>
              <span className={`px-3 py-1 text-sm rounded-full ${
                jiraStatus?.configured
                  ? 'bg-green-500/20 text-green-400'
                  : 'bg-yellow-500/20 text-yellow-400'
              }`}>
                {jiraStatus?.configured ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            {/* Connected State */}
            {jiraStatus?.configured && activeForm !== 'jira' && (
              <div className="px-6 pb-6">
                <p className="text-sm text-white/60 mb-4">
                  Connected on {jiraStatus.connectedAt ? new Date(jiraStatus.connectedAt).toLocaleDateString() : 'Unknown'}
                </p>
                <button
                  onClick={() => deleteIntegration('jira')}
                  disabled={isDeleting === 'jira'}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {isDeleting === 'jira' ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            )}

            {/* Setup Form */}
            {!jiraStatus?.configured && activeForm !== 'jira' && (
              <div className="px-6 pb-6">
                <button
                  onClick={() => { setActiveForm('jira'); setError(null); setSuccess(null); }}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 rounded-lg text-sm font-medium transition"
                >
                  Connect Jira
                </button>
              </div>
            )}

            {activeForm === 'jira' && (
              <div className="px-6 pb-6 space-y-4">
                <div>
                  <label className="block text-sm text-white/60 mb-2">Jira URL</label>
                  <input
                    type="text"
                    value={jiraForm.jiraUrl}
                    onChange={(e) => setJiraForm({ ...jiraForm, jiraUrl: e.target.value })}
                    placeholder="yoursite.atlassian.net"
                    className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Email</label>
                  <input
                    type="email"
                    value={jiraForm.email}
                    onChange={(e) => setJiraForm({ ...jiraForm, email: e.target.value })}
                    placeholder="you@example.com"
                    className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">API Token</label>
                  <input
                    type="password"
                    value={jiraForm.apiToken}
                    onChange={(e) => setJiraForm({ ...jiraForm, apiToken: e.target.value })}
                    placeholder="Your Atlassian API token"
                    className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Service Desk ID (optional)</label>
                    <input
                      type="text"
                      value={jiraForm.serviceDeskId}
                      onChange={(e) => setJiraForm({ ...jiraForm, serviceDeskId: e.target.value })}
                      placeholder="1"
                      className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-white/60 mb-2">Project Key (optional)</label>
                    <input
                      type="text"
                      value={jiraForm.projectKey}
                      onChange={(e) => setJiraForm({ ...jiraForm, projectKey: e.target.value })}
                      placeholder="SUPPORT"
                      className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500/50"
                    />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={validateJira}
                    disabled={isValidating || !jiraForm.jiraUrl || !jiraForm.email || !jiraForm.apiToken}
                    className="px-4 py-2 bg-white/5 hover:bg-white/10 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {isValidating ? 'Testing...' : 'Test Connection'}
                  </button>
                  <button
                    onClick={saveJira}
                    disabled={isSaving || !jiraForm.jiraUrl || !jiraForm.email || !jiraForm.apiToken}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : 'Save'}
                  </button>
                  <button
                    onClick={() => { setActiveForm(null); setJiraForm({ jiraUrl: '', email: '', apiToken: '', serviceDeskId: '', projectKey: '' }); setError(null); }}
                    className="px-4 py-2 text-white/60 hover:text-white text-sm transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Discord Bot Card */}
          <div className="bg-[#16161f] rounded-2xl border border-white/10 overflow-hidden">
            <div className="p-6 flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-indigo-500/10 rounded-xl flex items-center justify-center">
                  <svg className="w-6 h-6 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-semibold">Discord Bot</h3>
                  <p className="text-sm text-white/60">Ticket creation & notifications via Discord</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {discordBotStatus?.configured && (
                  <span className={`px-3 py-1 text-xs rounded-full ${
                    discordBotStatus.connected
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-orange-500/20 text-orange-400'
                  }`}>
                    {discordBotStatus.connected ? 'Online' : 'Offline'}
                  </span>
                )}
                <span className={`px-3 py-1 text-sm rounded-full ${
                  discordBotStatus?.configured
                    ? 'bg-green-500/20 text-green-400'
                    : 'bg-yellow-500/20 text-yellow-400'
                }`}>
                  {discordBotStatus?.configured ? 'Connected' : 'Not Connected'}
                </span>
              </div>
            </div>

            {/* Connected State */}
            {discordBotStatus?.configured && activeForm !== 'discord-bot' && (
              <div className="px-6 pb-6">
                <div className="text-sm text-white/60 mb-4 space-y-1">
                  <p>Guild ID: <span className="text-white/80 font-mono">{discordBotStatus.guildId}</span></p>
                  <p>
                    Connected on {discordBotStatus.connectedAt ? new Date(discordBotStatus.connectedAt).toLocaleDateString() : 'Unknown'}
                  </p>
                </div>
                <button
                  onClick={() => deleteIntegration('discord-bot')}
                  disabled={isDeleting === 'discord-bot'}
                  className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {isDeleting === 'discord-bot' ? 'Disconnecting...' : 'Disconnect'}
                </button>
              </div>
            )}

            {/* Setup Form */}
            {!discordBotStatus?.configured && activeForm !== 'discord-bot' && (
              <div className="px-6 pb-6">
                <button
                  onClick={() => { setActiveForm('discord-bot'); setError(null); setSuccess(null); }}
                  className="px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-sm font-medium transition"
                >
                  Connect Discord Bot
                </button>
              </div>
            )}

            {/* Staff Mappings — visible when Discord Bot + Jira both connected */}
            {discordBotStatus?.configured && jiraStatus?.configured && activeForm !== 'discord-bot' && (
              <div className="px-6 pb-6 border-t border-white/5 pt-4">
                <h4 className="text-sm font-semibold text-white/80 mb-3">Staff Mappings</h4>
                <p className="text-xs text-white/40 mb-4">
                  Map Discord users to Jira accounts so they can use <code className="text-indigo-400">/claim</code> to assign tickets.
                </p>

                {/* Existing mappings */}
                {staffMappings.length > 0 && (
                  <div className="space-y-2 mb-4">
                    {staffMappings.map((m) => (
                      <div key={m.id} className="flex items-center justify-between bg-[#0a0a0f] rounded-lg px-3 py-2">
                        <div className="flex items-center gap-3 text-sm">
                          <span className="text-white/70">{m.displayName || 'Unnamed'}</span>
                          <span className="text-white/30">|</span>
                          <span className="font-mono text-xs text-white/50">{m.discordUserId}</span>
                          <span className="text-white/30">→</span>
                          <span className="font-mono text-xs text-white/50">{m.jiraAccountId}</span>
                        </div>
                        <button
                          onClick={() => deleteStaffMapping(m.id)}
                          disabled={isDeletingStaff === m.id}
                          className="text-red-400/60 hover:text-red-400 text-xs transition disabled:opacity-50"
                        >
                          {isDeletingStaff === m.id ? '...' : 'Remove'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new mapping form */}
                <div className="grid grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={staffForm.displayName}
                    onChange={(e) => setStaffForm({ ...staffForm, displayName: e.target.value })}
                    placeholder="Display name"
                    className="px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50"
                  />
                  <input
                    type="text"
                    value={staffForm.discordUserId}
                    onChange={(e) => setStaffForm({ ...staffForm, discordUserId: e.target.value })}
                    placeholder="Discord User ID"
                    className="px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50"
                  />
                  <input
                    type="text"
                    value={staffForm.jiraAccountId}
                    onChange={(e) => setStaffForm({ ...staffForm, jiraAccountId: e.target.value })}
                    placeholder="Jira Account ID"
                    className="px-3 py-2 bg-[#0a0a0f] border border-white/10 rounded-lg text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <button
                  onClick={addStaffMapping}
                  disabled={isSavingStaff || !staffForm.discordUserId || !staffForm.jiraAccountId}
                  className="mt-2 px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  {isSavingStaff ? 'Adding...' : 'Add Staff'}
                </button>
              </div>
            )}

            {activeForm === 'discord-bot' && (
              <div className="px-6 pb-6 space-y-4">
                <div className="p-3 bg-indigo-500/5 border border-indigo-500/10 rounded-lg">
                  <p className="text-xs text-white/50">
                    Create a bot at{' '}
                    <a href="https://discord.com/developers/applications" target="_blank" rel="noopener noreferrer" className="text-indigo-400 hover:underline">
                      discord.com/developers/applications
                    </a>
                    . Enable the <strong className="text-white/70">Server Members Intent</strong> and <strong className="text-white/70">Message Content Intent</strong> under Privileged Gateway Intents. Copy the bot token and your server&apos;s Guild ID.
                  </p>
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Bot Token</label>
                  <input
                    type="password"
                    value={discordBotForm.botToken}
                    onChange={(e) => setDiscordBotForm({ ...discordBotForm, botToken: e.target.value })}
                    placeholder="Your Discord bot token"
                    className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div>
                  <label className="block text-sm text-white/60 mb-2">Guild ID (Server ID)</label>
                  <input
                    type="text"
                    value={discordBotForm.guildId}
                    onChange={(e) => setDiscordBotForm({ ...discordBotForm, guildId: e.target.value })}
                    placeholder="123456789012345678"
                    className="w-full px-4 py-3 bg-[#0a0a0f] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
                <div className="flex gap-3">
                  <button
                    onClick={saveDiscordBot}
                    disabled={isSaving || !discordBotForm.botToken || !discordBotForm.guildId}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded-lg text-sm font-medium transition disabled:opacity-50"
                  >
                    {isSaving ? 'Connecting...' : 'Save & Connect'}
                  </button>
                  <button
                    onClick={() => { setActiveForm(null); setDiscordBotForm({ botToken: '', guildId: '' }); setError(null); }}
                    className="px-4 py-2 text-white/60 hover:text-white text-sm transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
