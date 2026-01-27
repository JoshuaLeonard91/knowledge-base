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

export default function IntegrationsPage() {
  const router = useRouter();
  const { siteName } = usePlatform();

  // Loading states
  const [isLoading, setIsLoading] = useState(true);

  // Integration statuses
  const [hygraphStatus, setHygraphStatus] = useState<IntegrationStatus | null>(null);
  const [jiraStatus, setJiraStatus] = useState<IntegrationStatus | null>(null);

  // Form states
  const [hygraphForm, setHygraphForm] = useState({ endpoint: '', token: '' });
  const [jiraForm, setJiraForm] = useState({ jiraUrl: '', email: '', apiToken: '', serviceDeskId: '', projectKey: '' });

  // UI states
  const [activeForm, setActiveForm] = useState<'hygraph' | 'jira' | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Fetch all statuses
  const fetchStatuses = async () => {
    try {
      const [hygraphRes, jiraRes] = await Promise.all([
        fetch('/api/dashboard/integrations/hygraph'),
        fetch('/api/dashboard/integrations/jira'),
      ]);

      if (hygraphRes.status === 401) {
        router.push('/signup');
        return;
      }

      const [hygraphData, jiraData] = await Promise.all([
        hygraphRes.json(),
        jiraRes.json(),
      ]);

      setHygraphStatus(hygraphData);
      setJiraStatus(jiraData);
    } catch (err) {
      console.error('Failed to fetch statuses:', err);
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

  // Delete integration
  const deleteIntegration = async (type: 'hygraph' | 'jira') => {
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

      setSuccess(`${type === 'hygraph' ? 'Hygraph' : 'Jira'} disconnected`);
      fetchStatuses();
    } catch (err) {
      setError('Failed to disconnect');
    } finally {
      setIsDeleting(null);
    }
  };

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
        </div>
      </main>
    </div>
  );
}
