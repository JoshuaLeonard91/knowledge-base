/**
 * OAuth Provider Configuration
 *
 * Centralized config for all supported OAuth providers.
 * Providers are only available if their env vars are set.
 */

export interface OAuthProviderConfig {
  id: string;
  name: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scopes: string[];
  clientId: string;
  clientSecret: string;
  /** Extra params for the authorize URL (e.g. Google needs access_type=offline) */
  extraAuthorizeParams?: Record<string, string>;
  /** Extract normalized user data from the provider's user info response */
  extractUser: (data: Record<string, unknown>) => {
    providerId: string;
    username: string;
    email: string | null;
    avatar: string | null;
  };
}

function getDiscordProvider(): OAuthProviderConfig | null {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return {
    id: 'discord',
    name: 'Discord',
    authorizeUrl: 'https://discord.com/api/oauth2/authorize',
    tokenUrl: 'https://discord.com/api/oauth2/token',
    userInfoUrl: 'https://discord.com/api/users/@me',
    scopes: ['identify', 'guilds'],
    clientId,
    clientSecret,
    extractUser: (data) => ({
      providerId: data.id as string,
      username: (data.global_name as string) || (data.username as string),
      email: (data.email as string) || null,
      avatar: data.avatar
        ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.png`
        : null,
    }),
  };
}

function getGoogleProvider(): OAuthProviderConfig | null {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return {
    id: 'google',
    name: 'Google',
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
    scopes: ['openid', 'email', 'profile'],
    clientId,
    clientSecret,
    extraAuthorizeParams: {
      access_type: 'offline',
      prompt: 'consent',
    },
    extractUser: (data) => ({
      providerId: data.id as string,
      username: (data.name as string) || (data.email as string) || 'User',
      email: (data.email as string) || null,
      avatar: (data.picture as string) || null,
    }),
  };
}

function getGitHubProvider(): OAuthProviderConfig | null {
  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  return {
    id: 'github',
    name: 'GitHub',
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    scopes: ['read:user', 'user:email'],
    clientId,
    clientSecret,
    extractUser: (data) => ({
      providerId: String(data.id),
      username: (data.name as string) || (data.login as string),
      email: (data.email as string) || null,
      avatar: (data.avatar_url as string) || null,
    }),
  };
}

/** Get a provider config by ID, or null if not configured */
export function getProvider(name: string): OAuthProviderConfig | null {
  switch (name) {
    case 'discord': return getDiscordProvider();
    case 'google': return getGoogleProvider();
    case 'github': return getGitHubProvider();
    default: return null;
  }
}

/** Check if a provider is configured (env vars present) */
export function isProviderConfigured(name: string): boolean {
  return getProvider(name) !== null;
}

/** Get list of all configured provider IDs */
export function getConfiguredProviders(): string[] {
  return ['discord', 'google', 'github'].filter(isProviderConfigured);
}
