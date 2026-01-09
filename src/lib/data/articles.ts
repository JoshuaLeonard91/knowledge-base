/**
 * Fallback Article Data
 *
 * This data is used when Google Docs CMS is not configured.
 * Configure Google Docs/Sheets integration to add your articles.
 */

import { Article, ArticleCategory } from '@/types';

export const categories: ArticleCategory[] = [
  {
    id: 'getting-started',
    name: 'Getting Started',
    description: 'Begin your journey from bot noob to bot wizard',
    icon: 'Rocket',
  },
  {
    id: 'integrations',
    name: 'Integrations',
    description: 'Connect all the things to all the other things',
    icon: 'Plug',
  },
  {
    id: 'troubleshooting',
    name: 'Troubleshooting',
    description: 'When things go boom instead of zoom',
    icon: 'Wrench',
  },
  {
    id: 'permissions',
    name: 'Permissions & Security',
    description: 'Who can do what and why they probably shouldn\'t',
    icon: 'Shield',
  },
  {
    id: 'advanced',
    name: 'Advanced Wizardry',
    description: 'For those who laughed at the "Are you sure?" prompts',
    icon: 'Code',
  },
  {
    id: 'billing',
    name: 'Billing & Plans',
    description: 'The "please take our money" section',
    icon: 'CreditCard',
  },
];

export const articles: Article[] = [
  // ============ GETTING STARTED ============
  {
    slug: 'welcome-to-the-chaos',
    title: 'Welcome to the Chaos: Your First Bot Setup',
    category: 'getting-started',
    topic: 'First Steps',
    keywords: ['setup', 'beginner', 'first bot', 'installation', 'quickstart', 'new user'],
    excerpt: 'Congratulations on deciding to mass message people automatically! Here\'s how to do it responsibly.',
    icon: 'Rocket',
    readTime: 5,
    relatedSlugs: ['bot-tokens-secrets', 'permissions-101', 'why-is-my-bot-offline'],
    content: `# Welcome to the Chaos: Your First Bot Setup

So you've decided to create a Discord bot. Maybe you want to automate moderation, play music, or just make your server 47% more chaotic. Whatever your reasons, we're here to help (and slightly judge).

## Before We Begin

Let's make sure you have everything you need:

- A Discord account (if you don't have one, how did you get here?)
- A server where you have admin permissions (your cat's fan server counts)
- Basic knowledge of how to click buttons
- Coffee (optional but recommended)

## Step 1: Create Your Bot Application

Head over to the Discord Developer Portal. Yes, it sounds scary. No, it won't bite.

1. Click "New Application"
2. Name your bot something creative (please not "Test Bot 47")
3. Accept that you're now responsible for a digital life form

### The Dashboard of Destiny

Once created, you'll see a dashboard with more tabs than your browser. Don't panic. We only need a few:

- **General Information**: Where you pretend to write a description
- **Bot**: Where the magic happens
- **OAuth2**: Where permissions go to become complicated

## Step 2: Invite Your Bot

Navigate to OAuth2 > URL Generator. Select:

- \`bot\` scope (because it's a bot, duh)
- \`applications.commands\` (for those fancy slash commands)

Then pick permissions. Pro tip: "Administrator" is tempting but it's like giving your toddler the car keys.

## Step 3: First Signs of Life

Once invited, your bot will appear offline. This is normal. It's not ghosting you—it just needs code to run.

\`\`\`javascript
// Your bot's first words
client.on('ready', () => {
  console.log('I am alive! ALIVE!');
});
\`\`\`

## What's Next?

Now that your bot exists, you'll want to:

- Keep your token secret (seriously, we have a whole article about this)
- Set up proper permissions
- Learn why your bot randomly disconnects at 3 AM

Welcome to the club. There's no going back now.`
  },
  {
    slug: 'bot-tokens-secrets',
    title: 'Bot Tokens: The Secret You Can\'t Tell Anyone (Especially GitHub)',
    category: 'getting-started',
    topic: 'Security',
    keywords: ['token', 'secret', 'security', 'api key', 'environment variables', 'leaked'],
    excerpt: 'Your bot token is like your password, except when it leaks, strangers spam anime in your server.',
    icon: 'Key',
    readTime: 4,
    relatedSlugs: ['welcome-to-the-chaos', 'permissions-101', 'someone-hacked-my-bot'],
    content: `# Bot Tokens: The Secret You Can't Tell Anyone

Your bot token is the most important thing you'll never show anyone. It's like a password, but worse—because when it leaks, someone can impersonate your bot and send messages like "I LOVE PINEAPPLE ON PIZZA" to every server it's in.

## What Is a Token?

A token is a long string of characters that looks like a cat walked across your keyboard:

\`\`\`
MTIzNDU2Nzg5MDEyMzQ1Njc4.Gh8xKz.AbCdEfGhIjKlMnOpQrStUvWxYz123456
\`\`\`

This is NOT a real token. If it were, we'd be in trouble.

## The Cardinal Rules of Tokens

### Rule 1: Never Commit Tokens to Git

GitHub has bots that scan for Discord tokens. The irony of bots hunting bots isn't lost on us. If you commit a token:

1. Discord will revoke it within seconds
2. You'll feel shame
3. You'll have to regenerate it
4. Your commits will forever show your mistake

### Rule 2: Use Environment Variables

\`\`\`bash
# .env file (add to .gitignore!)
DISCORD_TOKEN=your_super_secret_token_here
\`\`\`

\`\`\`javascript
// Your code
const token = process.env.DISCORD_TOKEN;
// Look ma, no hardcoded secrets!
\`\`\`

### Rule 3: Regenerate If Exposed

Think your token might be compromised? Don't think. Regenerate.

Bot Settings > Reset Token > Cry a little > Move on

## Common Ways People Leak Tokens

- Pushing to public GitHub repos
- Sharing screenshots with token visible
- Streaming while token is on screen
- Posting in Discord asking "why doesn't this work?"
- That one guy who put it in his bot's about me

## What Happens If Your Token Leaks

Best case: Nothing, you caught it in time.

Worst case: Someone uses your bot to:
- Mass DM server members
- Delete channels
- Post things that get your bot banned
- Change your bot's name to "I Got Hacked LOL"

Stay safe out there, token guardian.`
  },
  {
    slug: 'dashboard-for-humans',
    title: 'The Dashboard: A Guide for Humans',
    category: 'getting-started',
    topic: 'Navigation',
    keywords: ['dashboard', 'interface', 'navigation', 'ui', 'settings', 'overview'],
    excerpt: 'A comprehensive tour of buttons you\'ll click once and forget exist.',
    icon: 'Layout',
    readTime: 3,
    relatedSlugs: ['welcome-to-the-chaos', 'managing-multiple-bots'],
    content: `# The Dashboard: A Guide for Humans

Welcome to the dashboard—your command center for bot management. It has buttons, graphs, and at least three features you'll never use.

## The Home Tab

This is where you land after logging in. It shows:

- Your bots (hopefully at least one)
- Server count (your measure of success)
- A graph that goes up (dopamine)

### Quick Stats

The numbers at the top tell you things like:

- **Servers**: How many places trust your code
- **Users**: How many people your bot can annoy
- **Commands Used**: Proof that someone cares

## Navigation Menu

On the left, you'll find:

### Bots
Where your digital children live. Click to manage, configure, or question your life choices.

### Servers
A list of servers your bots inhabit. Sorted by "most likely to kick your bot first."

### Settings
The danger zone. Here you can:
- Change your password
- Enable 2FA (please do this)
- Delete everything (please don't do this)

## The Parts You'll Actually Use

Let's be honest. You'll use:

1. The bot list
2. The "restart bot" button
3. The logs (when things break)

Everything else is for people who read documentation for fun.

## Pro Tips

- Bookmark the logs page. You'll need it.
- The dark mode toggle is bottom left. You're welcome.
- If you can't find something, it's probably in Settings > Advanced > Why Is This Here?`
  },
  {
    slug: 'managing-multiple-bots',
    title: 'Managing Multiple Bots Without Losing Your Mind',
    category: 'getting-started',
    topic: 'Organization',
    keywords: ['multiple bots', 'organization', 'management', 'scaling', 'naming'],
    excerpt: 'Because one bot is never enough, and ten is definitely too many.',
    icon: 'Stack',
    readTime: 4,
    relatedSlugs: ['dashboard-for-humans', 'welcome-to-the-chaos', 'rate-limits-the-fun-police'],
    content: `# Managing Multiple Bots Without Losing Your Mind

You started with one bot. Now you have seven. This guide won't ask why. It'll just help you cope.

## Naming Conventions

Please, for the love of all that is holy, use a naming convention:

### Good Names
- ModBot-Production
- ModBot-Development
- MusicBot-Server1
- TestBot-DoNotUse

### Bad Names
- Bot
- Bot2
- asdfasdf
- final_bot_FINAL_v2_REAL

## Organization Strategies

### The Folder Method

Group your bots by function:
\`\`\`
/bots
  /moderation
    - automod-bot
    - ban-hammer
  /fun
    - meme-bot
    - game-bot
  /why-do-i-have-this
    - test-bot-47
\`\`\`

### The Spreadsheet Method

Make a spreadsheet. Yes, really. Track:

| Bot Name | Purpose | Servers | Last Updated | Works? |
|----------|---------|---------|--------------|--------|
| ModBot | Moderation | 47 | Yesterday | Yes |
| MusicBot | Music | 12 | 2 months ago | Maybe |
| TestBot | ??? | 1 | ??? | No |

## Common Mistakes

### Mistake 1: Using the Same Token

Each bot needs its own token. They're not like Netflix passwords.

### Mistake 2: Forgetting Which Is Which

You will, at some point, shut down the wrong bot. It's a rite of passage.

### Mistake 3: Not Labeling Test Bots

"Which one is production again?" - You, at 2 AM

## The Nuclear Option

If you have more than 10 bots and can't remember what half of them do: delete the mysterious ones. If no one complains within a week, they weren't important.`
  },

  // ============ INTEGRATIONS ============
  {
    slug: 'webhook-wizardry',
    title: 'Webhook Wizardry: Making Services Talk to Each Other',
    category: 'integrations',
    topic: 'Webhooks',
    keywords: ['webhook', 'integration', 'automation', 'notifications', 'api', 'connect'],
    excerpt: 'Turn your Discord channel into a notification hurricane from every service imaginable.',
    icon: 'ShareNetwork',
    readTime: 6,
    relatedSlugs: ['api-authentication-decoded', 'rate-limits-the-fun-police', 'why-is-nothing-happening'],
    content: `# Webhook Wizardry: Making Services Talk to Each Other

Webhooks are like carrier pigeons, but faster and less likely to poop on things. They let external services send messages directly to your Discord channels.

## What's a Webhook?

A webhook is a URL that accepts data and posts it to Discord. It's the "don't call us, we'll call you" of APIs.

\`\`\`
https://discord.com/api/webhooks/123456789/AbCdEf...
\`\`\`

Anyone with this URL can post to your channel. Choose wisely who you share it with.

## Creating a Webhook

### Step 1: Channel Settings

1. Right-click a channel
2. Edit Channel
3. Integrations
4. Webhooks
5. New Webhook

### Step 2: Customize It

Give your webhook:
- A name (like "GitHub Notifications" or "Chaos Pipe")
- An avatar (optional but fun)
- Copy the URL (and guard it with your life)

## Popular Webhook Integrations

### GitHub

Get notified when someone:
- Pushes code (every 5 minutes if it's that developer)
- Opens a PR (finally)
- Closes issues (lies, issues never close)

### Monitoring Services

Get alerts when:
- Your server is down
- Your bot is dead
- Everything is on fire

### Custom Integrations

Post to Discord from:
- Your own scripts
- Zapier/IFTTT
- A Raspberry Pi checking if your fridge is open

## Webhook Message Anatomy

\`\`\`json
{
  "content": "Hello from the other side",
  "username": "Custom Bot Name",
  "avatar_url": "https://example.com/avatar.png",
  "embeds": [{
    "title": "Fancy Embed",
    "description": "Look how professional this looks",
    "color": 5814783
  }]
}
\`\`\`

## Security Warnings

### Do NOT:
- Share webhook URLs publicly
- Post webhook URLs to GitHub
- Give webhook URLs to people you don't trust

### If Compromised:
1. Delete the webhook immediately
2. Create a new one
3. Update your integrations
4. Wonder who hurt you

## Troubleshooting

**Nothing happens when I send data**
- Check if the webhook still exists
- Verify your JSON is valid
- Make sure you're using POST, not GET

**Messages appear weird**
- Discord has formatting rules
- Embeds have character limits
- Some markdown doesn't work in embeds`
  },
  {
    slug: 'api-authentication-decoded',
    title: 'API Authentication: Decoded (Finally)',
    category: 'integrations',
    topic: 'Authentication',
    keywords: ['api', 'authentication', 'oauth', 'bearer token', 'authorization', 'api key'],
    excerpt: 'Understanding the difference between all the ways computers say "trust me bro."',
    icon: 'Lock',
    readTime: 7,
    relatedSlugs: ['bot-tokens-secrets', 'webhook-wizardry', 'rate-limits-the-fun-police'],
    content: `# API Authentication: Decoded (Finally)

APIs need to know who's making requests. This is authentication—the digital equivalent of a bouncer checking IDs, except the bouncer is a server and the ID is a string of characters.

## Types of Authentication

### 1. API Keys

The simplest form. Like a house key, but digital and slightly less likely to end up in your couch cushions.

\`\`\`bash
curl -H "X-API-Key: your_api_key_here" https://api.example.com/data
\`\`\`

**Pros:** Easy to use
**Cons:** Easy to leak

### 2. Bearer Tokens

Fancier keys. "Bearer" because whoever bears (holds) the token gets access.

\`\`\`bash
curl -H "Authorization: Bearer eyJhbGc..." https://api.example.com/data
\`\`\`

**Pros:** Can expire, can contain data
**Cons:** Confusing name, still can be leaked

### 3. OAuth 2.0

The complicated one. Involves:
- Client IDs
- Client Secrets
- Redirect URIs
- Scopes
- Access Tokens
- Refresh Tokens
- Headaches

\`\`\`
User: I want to log in with Discord
Your App: Hey Discord, can this user log in?
Discord: User, do you approve?
User: Yes
Discord: Here's a code
Your App: *exchanges code for token*
Your App: Now I know who you are!
\`\`\`

## The Authorization Header

Most APIs want this header:

\`\`\`
Authorization: <type> <credentials>
\`\`\`

Common types:
- \`Bearer\`: For tokens
- \`Basic\`: For username:password (base64 encoded)
- \`Bot\`: Discord-specific for bot tokens

## Discord-Specific Auth

### For Bots
\`\`\`
Authorization: Bot YOUR_BOT_TOKEN
\`\`\`

### For Users (OAuth)
\`\`\`
Authorization: Bearer USER_ACCESS_TOKEN
\`\`\`

### For Webhooks
No auth needed! The URL IS the auth (which is why you protect it).

## Common Mistakes

### Mistake 1: Wrong Header Name
\`\`\`bash
# Wrong
-H "Auth: Bearer token"

# Right
-H "Authorization: Bearer token"
\`\`\`

### Mistake 2: Forgetting "Bearer"
\`\`\`bash
# Wrong
-H "Authorization: eyJhbGc..."

# Right
-H "Authorization: Bearer eyJhbGc..."
\`\`\`

### Mistake 3: Using Bot Token as Bearer
Bot tokens go with "Bot", not "Bearer". They're picky like that.

## When Things Go Wrong

| Error | Meaning | Fix |
|-------|---------|-----|
| 401 Unauthorized | Invalid credentials | Check your token |
| 403 Forbidden | Valid creds, no permission | Check scopes/roles |
| 400 Bad Request | Malformed request | Check header format |

Remember: when in doubt, regenerate your token and try again.`
  },
  {
    slug: 'connecting-spotify-without-tears',
    title: 'Connecting Spotify Without Tears',
    category: 'integrations',
    topic: 'Third-Party',
    keywords: ['spotify', 'music', 'integration', 'oauth', 'streaming', 'playlist'],
    excerpt: 'Share your questionable music taste with your entire server.',
    icon: 'Megaphone',
    readTime: 5,
    relatedSlugs: ['api-authentication-decoded', 'webhook-wizardry', 'why-is-nothing-happening'],
    content: `# Connecting Spotify Without Tears

Want to show everyone what you're listening to? Or maybe you want your bot to share playlists. Either way, here's how to connect Spotify without crying (much).

## Why Connect Spotify?

- Display currently playing tracks
- Share playlists automatically
- Prove you have superior music taste
- Start arguments about whether lo-fi hip hop counts as a personality

## The Setup Process

### Step 1: Spotify Developer Account

Go to Spotify Developer Dashboard and create an app:

1. Click "Create App"
2. Name it something professional (or "Music Bot Thing", we don't judge)
3. Set your redirect URI
4. Get your Client ID and Secret

### Step 2: Authentication Flow

Spotify uses OAuth 2.0 (see our authentication article for why this is complicated).

\`\`\`
1. User clicks "Connect Spotify"
2. Redirected to Spotify login
3. User approves permissions
4. Spotify redirects back with code
5. Exchange code for access token
6. Store token securely
7. Refresh when expired
8. Question why this took 47 steps
\`\`\`

## Scopes You'll Need

\`\`\`
user-read-currently-playing  // What's playing now
user-read-playback-state     // Is it paused?
user-read-recently-played    // History
playlist-read-private        // Their playlists
\`\`\`

Don't request more than you need. It's creepy.

## Displaying Now Playing

\`\`\`javascript
const track = await spotify.getCurrentlyPlaying();

const embed = {
  title: track.name,
  description: \`by \${track.artist}\`,
  thumbnail: track.albumArt,
  footer: "They're vibing right now"
};
\`\`\`

## Common Issues

### "The access token expired"
Tokens only last 1 hour. Use refresh tokens:

\`\`\`javascript
if (tokenExpired) {
  const newToken = await spotify.refreshAccessToken();
  // Store the new token
}
\`\`\`

### "User not connected"
They need to go through OAuth first. Show a connect button.

### "Rate limited"
You're asking too often. Spotify isn't Shazam—chill.

## Privacy Considerations

Before sharing someone's music:
- Make sure they opted in
- Let them disconnect easily
- Don't expose their guilty pleasure playlists

Nobody needs to know about their 3 AM "Sad Songs" playlist.`
  },
  {
    slug: 'rate-limits-the-fun-police',
    title: 'Rate Limits: The Fun Police of APIs',
    category: 'integrations',
    topic: 'Best Practices',
    keywords: ['rate limit', 'api', 'throttle', '429', 'cooldown', 'requests'],
    excerpt: 'Why Discord sometimes tells your bot to calm down and take a breather.',
    icon: 'Warning',
    readTime: 5,
    relatedSlugs: ['api-authentication-decoded', 'why-is-my-bot-offline', 'webhook-wizardry'],
    content: `# Rate Limits: The Fun Police of APIs

Imagine if you could send infinite requests to Discord. Now imagine everyone doing that. The servers would catch fire. Rate limits exist to prevent digital arson.

## What Are Rate Limits?

Rate limits cap how many requests you can make in a time period. Go over, and you get a timeout.

\`\`\`
HTTP/1.1 429 Too Many Requests
Retry-After: 5
\`\`\`

The API equivalent of "Sir, this is a Wendy's. Please wait 5 seconds."

## Discord's Rate Limits

### Global Limits
- 50 requests per second (global)
- Why would you need more? Seriously?

### Per-Route Limits
Different endpoints have different limits:

| Action | Limit | Window |
|--------|-------|--------|
| Send Message | 5 | per 5s per channel |
| Edit Message | 5 | per 5s |
| Delete Message | 5 | per 1s |
| Bulk Delete | 1 | per 1s |
| Add Reaction | 1 | per 0.25s |

### The Emoji Tax

Adding reactions is heavily limited because someone, somewhere, thought it would be funny to react with 50 emojis instantly.

## Handling Rate Limits

### The Wrong Way
\`\`\`javascript
// Please don't
while (true) {
  sendMessage("Spam!");
}
\`\`\`

### The Right Way
\`\`\`javascript
// Respect the 429
if (response.status === 429) {
  const retryAfter = response.headers['retry-after'];
  await sleep(retryAfter * 1000);
  // Try again
}
\`\`\`

### The Best Way
Use a library that handles this automatically. They exist. Use them.

## Rate Limit Headers

Discord tells you where you stand:

\`\`\`
X-RateLimit-Limit: 5
X-RateLimit-Remaining: 4
X-RateLimit-Reset: 1234567890.123
X-RateLimit-Bucket: abc123
\`\`\`

Read these. They're trying to help.

## The Hall of Shame

Things that will get you rate limited fast:

1. Deleting messages in a loop without delay
2. Mass-reacting to messages
3. Updating a message every 0.1 seconds
4. Whatever you're thinking of doing—probably that too

## When You Hit a Limit

1. **Don't panic** - It's temporary
2. **Wait** - Use the Retry-After header
3. **Reduce requests** - Batch operations when possible
4. **Cache data** - Don't fetch what you already have

## Pro Tips

- Implement exponential backoff
- Queue your requests
- Track your own limits locally
- When in doubt, slow down

The API will thank you. Your bot won't get banned. Everyone wins.`
  },

  // ============ TROUBLESHOOTING ============
  {
    slug: 'why-is-my-bot-offline',
    title: 'Why Is My Bot Offline? A Journey of Self-Discovery',
    category: 'troubleshooting',
    topic: 'Connection Issues',
    keywords: ['offline', 'connection', 'disconnect', 'down', 'not working', 'dead'],
    excerpt: 'Your bot shows offline and you\'re questioning everything. Let\'s figure this out together.',
    icon: 'WifiOff',
    readTime: 6,
    relatedSlugs: ['bot-tokens-secrets', 'someone-hacked-my-bot', 'rate-limits-the-fun-police'],
    content: `# Why Is My Bot Offline? A Journey of Self-Discovery

You've launched your bot. It's showing offline. You're staring at your code wondering what you did to deserve this. Let's troubleshoot.

## The Quick Checks

### 1. Is Your Code Running?

This seems obvious but:
- Did you save the file?
- Did you actually start the bot?
- Is the terminal still open?
- Did your computer go to sleep?

\`\`\`bash
# Check if process is running
ps aux | grep node
\`\`\`

### 2. Is Your Token Valid?

Tokens get invalidated when:
- You regenerate them
- Discord detects a leak
- You accidentally made it public
- Mercury is in retrograde (not really, but it feels like it)

### 3. Is Your Internet Working?

Open Google. Did it load? Good. It's not the internet.

(If Google didn't load, you have bigger problems.)

## The Not-So-Quick Checks

### Check Your Intents

Discord requires you to declare what data you need:

\`\`\`javascript
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    // Add what you need, but no more
  ]
});
\`\`\`

Missing intents = silent failure.

### Check for Errors

Your bot might be crashing silently:

\`\`\`javascript
client.on('error', console.error);
client.on('warn', console.warn);

process.on('unhandledRejection', error => {
  console.error('Unhandled rejection:', error);
});
\`\`\`

### Check Discord Status

Is Discord itself down? Check status.discord.com.

If Discord is down, make tea and wait.

## The Error Message Decoder

| Error | Translation | Fix |
|-------|-------------|-----|
| "Invalid token" | Token is wrong | Regenerate token |
| "Disallowed intents" | Need to enable in dev portal | Enable required intents |
| "Connection reset" | Network hiccup | Try again |
| "ECONNREFUSED" | Can't reach Discord | Check firewall/network |

## Still Offline?

### Nuclear Option 1: Full Restart
\`\`\`bash
# Kill everything
pkill -f "node"

# Start fresh
node index.js
\`\`\`

### Nuclear Option 2: New Token

1. Go to Discord Developer Portal
2. Regenerate token
3. Update your environment
4. Pray

### Nuclear Option 3: Start Over

Sometimes, you just need to:
1. Delete node_modules
2. \`npm install\`
3. Question your career choices
4. Try again

## Prevention Tips

- Set up proper error logging
- Use a process manager (pm2, forever)
- Monitor uptime externally
- Accept that bots will sometimes die

Your bot will go offline again. It's not if, it's when. But now you'll know what to do.`
  },
  {
    slug: 'someone-hacked-my-bot',
    title: 'Help! Someone Hacked My Bot!',
    category: 'troubleshooting',
    topic: 'Security',
    keywords: ['hacked', 'compromised', 'breach', 'security', 'attacked', 'spam'],
    excerpt: 'Your bot is posting things you didn\'t write. Time for damage control.',
    icon: 'Warning',
    readTime: 5,
    relatedSlugs: ['bot-tokens-secrets', 'permissions-101', 'why-is-my-bot-offline'],
    content: `# Help! Someone Hacked My Bot!

Your bot is sending weird messages. Channels are getting deleted. Panic is setting in. Here's your action plan.

## STEP 1: Regenerate Your Token (DO THIS NOW)

Stop reading. Go to Discord Developer Portal. Regenerate your token. Now.

Seriously. Do it.

Done? Good. The attacker can no longer control your bot.

## STEP 2: Assess the Damage

### Check Recent Activity

What did the attacker do?
- Send messages?
- Delete channels?
- Ban users?
- Add webhooks?

### Check Bot Permissions

Did they elevate permissions? Check the bot's role in affected servers.

### Check for Added Webhooks

Attackers often add webhooks for persistent access:
1. Go to Server Settings > Integrations > Webhooks
2. Delete any you don't recognize
3. All of them. Delete all of them if unsure.

## STEP 3: Notify Server Owners

If your bot is in multiple servers:

\`\`\`
Hey, [Bot Name] was compromised.
We've secured it, but please:
1. Check for unauthorized webhooks
2. Review recent bot actions in your audit log
3. Let us know if anything seems wrong
\`\`\`

## STEP 4: Figure Out How It Happened

### Common Leak Sources

| Source | How to Check |
|--------|--------------|
| GitHub | Search your repos for the token |
| Screenshot | Check recent screenshots you shared |
| Stream | Were you streaming while token was visible? |
| Shared device | Did someone else have access? |
| Phishing | Did you enter your token anywhere weird? |

### Run a GitHub Search

\`\`\`
https://github.com/search?q=YOUR_TOKEN_HERE&type=code
\`\`\`

If it shows up, your commit history will forever remember this day.

## STEP 5: Prevent Future Hacks

### Use Environment Variables
\`\`\`bash
# .env (add to .gitignore!)
TOKEN=your_new_token
\`\`\`

### Enable 2FA Everywhere

- Discord account: YES
- GitHub: YES
- Hosting provider: YES
- Everything: YES

### Audit Your Code

Make sure tokens aren't:
- Hardcoded
- In comments
- In commit messages
- Anywhere visible

## The Recovery Checklist

- [ ] Token regenerated
- [ ] Old token removed from code
- [ ] New token in secure location
- [ ] Environment variables set up
- [ ] .gitignore includes .env
- [ ] Check for unauthorized webhooks
- [ ] Check for unauthorized roles
- [ ] Server owners notified
- [ ] Deep breaths taken

## If Servers Banned Your Bot

You'll need to:
1. Contact server owners directly
2. Explain what happened
3. Show what you've done to fix it
4. Hope they give you another chance

It happens. Learn from it. Move forward.`
  },
  {
    slug: 'why-is-nothing-happening',
    title: 'I Did Everything Right But Nothing Is Happening',
    category: 'troubleshooting',
    topic: 'Debugging',
    keywords: ['not working', 'nothing happens', 'silent failure', 'debug', 'troubleshoot', 'help'],
    excerpt: 'The code runs. There are no errors. But also nothing happens. Welcome to programming.',
    icon: 'Question',
    readTime: 5,
    relatedSlugs: ['why-is-my-bot-offline', 'common-error-messages', 'permissions-101'],
    content: `# I Did Everything Right But Nothing Is Happening

No errors. No crashes. No output. Just... silence. This is the worst kind of bug.

## The Silent Failure Debugging Guide

### Step 1: Add Console Logs (Yes, Really)

\`\`\`javascript
console.log("1. Starting bot...");
client.login(token);
console.log("2. Login called");

client.on('ready', () => {
  console.log("3. Bot is ready!");
});

client.on('messageCreate', message => {
  console.log("4. Message received:", message.content);
});
\`\`\`

Which numbers print? That's where to look.

### Step 2: Check Event Names

Typos in event names fail silently:

\`\`\`javascript
// Wrong (fails silently)
client.on('mesageCreate', ...)

// Right
client.on('messageCreate', ...)
\`\`\`

Discord won't tell you "mesageCreate" isn't a thing. It'll just never trigger.

### Step 3: Check Intents

Modern Discord requires intents. Without the right ones, you get nothing:

\`\`\`javascript
// If you need to receive messages
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // REQUIRED for message content
  ]
});
\`\`\`

### Step 4: Check for Awaits

Forgot an await? Your code might be running before data arrives:

\`\`\`javascript
// Wrong
const user = client.users.fetch(id);
console.log(user.username); // undefined

// Right
const user = await client.users.fetch(id);
console.log(user.username); // Works!
\`\`\`

## Common Silent Failures

### Bot Ignoring Itself
\`\`\`javascript
// This prevents infinite loops but also
// means your test commands from bot won't work
if (message.author.bot) return;
\`\`\`

### Wrong Channel/Guild Check
\`\`\`javascript
// Are you in the right channel?
console.log("Listening in:", channel.id);
console.log("Message in:", message.channel.id);
\`\`\`

### Permissions
Your bot might not have permission to see or respond in that channel. Check:
- Read Messages
- Send Messages
- View Channel

### The Privileged Intent Trap

Some intents require approval in the Developer Portal:
- MESSAGE_CONTENT (for message text)
- GUILD_MEMBERS (for member info)
- GUILD_PRESENCES (for status)

If not enabled = silent failure.

## The Debugging Checklist

- [ ] Console.log added at key points
- [ ] Event names spelled correctly
- [ ] Intents properly declared
- [ ] Privileged intents enabled in portal
- [ ] All async operations awaited
- [ ] Bot has required permissions
- [ ] You're testing in the right server
- [ ] You're not accidentally ignoring yourself

## When All Else Fails

1. Delete node_modules
2. npm install
3. Restart everything
4. Try a minimal test case
5. Ask for help with your minimal test case
6. Realize the bug was obvious all along`
  },
  {
    slug: 'common-error-messages',
    title: 'Discord Error Messages: A Translation Guide',
    category: 'troubleshooting',
    topic: 'Errors',
    keywords: ['error', 'exception', 'crash', 'bug', '401', '403', '404', 'message'],
    excerpt: 'What Discord really means when it says "Unknown Message" for the 47th time.',
    icon: 'FileText',
    readTime: 6,
    relatedSlugs: ['why-is-nothing-happening', 'rate-limits-the-fun-police', 'why-is-my-bot-offline'],
    content: `# Discord Error Messages: A Translation Guide

Discord's error messages range from helpful to cryptic to "what does that even mean?" Let's translate.

## HTTP Error Codes

### 400 Bad Request
**Discord says:** "The request was improperly formatted"
**Actually means:** Your JSON is wrong or missing required fields

\`\`\`javascript
// Common causes:
// - Empty message content
// - Message over 2000 characters
// - Invalid embed structure
\`\`\`

### 401 Unauthorized
**Discord says:** "Authentication failed"
**Actually means:** Your token is wrong, expired, or you're using the wrong auth type

\`\`\`javascript
// Check:
// - Token is correct
// - Using "Bot" prefix, not "Bearer"
// - Token hasn't been regenerated
\`\`\`

### 403 Forbidden
**Discord says:** "You don't have permission"
**Actually means:** Bot can see the thing but can't interact with it

Common causes:
- Bot missing permissions
- Trying to moderate someone higher in hierarchy
- Server-level restrictions

### 404 Not Found
**Discord says:** "Resource not found"
**Actually means:** The thing doesn't exist OR you can't see it

\`\`\`javascript
// This could mean:
// - Wrong ID
// - Message was deleted
// - Channel was deleted
// - Bot isn't in that server
\`\`\`

### 429 Too Many Requests
**Discord says:** "You are being rate limited"
**Actually means:** Slow down, speedster

(See our rate limits article for details)

## Discord-Specific Errors

### "Unknown Message"
The message was deleted before your bot could interact with it. Someone's faster than you.

### "Unknown Channel"
Either:
- Wrong channel ID
- Channel was deleted
- Bot can't see the channel

### "Invalid Form Body"
Your request data is malformed:
\`\`\`javascript
// Common issues:
embed.title = ""; // Empty string not allowed
embed.description = "a".repeat(5000); // Over limit
embed.color = "red"; // Should be a number
\`\`\`

### "Missing Permissions"
Check the bot has:
1. The permission in its role
2. The permission in that specific channel
3. Permission hierarchy isn't blocking it

### "Missing Access"
Bot literally cannot see the channel. Check:
- "View Channel" permission
- Category permissions
- Role visibility

### "Cannot execute on a DM channel"
You're trying to do server stuff in DMs:
- Kick/ban
- Manage channels
- Anything server-specific

## Error Code Reference

| Code | Name | Fix |
|------|------|-----|
| 10003 | Unknown Channel | Check channel ID |
| 10004 | Unknown Guild | Check server ID |
| 10008 | Unknown Message | Message was deleted |
| 30001 | Max Guilds | Bot is in 100 servers (verify first) |
| 40001 | Unauthorized | Check token |
| 50001 | Missing Access | Check permissions |
| 50013 | Missing Permissions | Bot needs the permission |
| 50035 | Invalid Form Body | Check your request data |

## Debugging Strategy

\`\`\`javascript
try {
  await message.delete();
} catch (error) {
  console.error('Error code:', error.code);
  console.error('Error message:', error.message);

  if (error.code === 10008) {
    // Message already deleted, no problem
  } else if (error.code === 50001) {
    // Can't access - log and move on
  } else {
    // Something unexpected
    throw error;
  }
}
\`\`\`

## The Golden Rule

When you get an error:
1. Read the error message (fully)
2. Check the error code
3. Verify IDs are correct
4. Verify permissions
5. Then ask for help

That order. Always that order.`
  },

  // ============ PERMISSIONS ============
  {
    slug: 'permissions-101',
    title: 'Discord Permissions 101: A Survival Guide',
    category: 'permissions',
    topic: 'Basics',
    keywords: ['permissions', 'roles', 'access', 'security', 'admin', 'moderator'],
    excerpt: 'Understanding the 40+ permissions Discord offers and why your bot probably doesn\'t need Administrator.',
    icon: 'Shield',
    readTime: 7,
    relatedSlugs: ['bot-tokens-secrets', 'welcome-to-the-chaos', 'role-hierarchy-explained'],
    content: `# Discord Permissions 101: A Survival Guide

Discord has over 40 permissions. Your bot needs maybe 5. Here's how to figure out which ones.

## The Principle of Least Privilege

Give your bot the minimum permissions it needs. Nothing more.

### Why Not Just Use Administrator?

"But Administrator is easier!"

Sure. It also means if your bot is compromised, the attacker can:
- Delete all channels
- Ban all members
- Destroy the entire server

Is that worth saving 5 minutes of permission configuration?

## Essential Permissions

### For Most Bots
\`\`\`
View Channels       - See channels
Send Messages       - Talk
Embed Links         - Pretty embeds
Attach Files        - Upload images
Read Message History - See old messages
Add Reactions       - React to things
Use Slash Commands  - Modern commands
\`\`\`

### For Moderation Bots
Add:
\`\`\`
Kick Members
Ban Members
Manage Messages    - Delete messages
Manage Roles       - Below bot's role only!
\`\`\`

### For Music Bots
Add:
\`\`\`
Connect            - Join voice
Speak              - Play audio
\`\`\`

## Permission Categories

### General Permissions
| Permission | What It Does | Danger Level |
|------------|--------------|--------------|
| Administrator | Everything | EXTREME |
| View Audit Log | See who did what | Low |
| Manage Server | Change server settings | High |
| Manage Roles | Create/edit roles | High |
| Manage Channels | Create/edit channels | High |

### Text Permissions
| Permission | What It Does | Danger Level |
|------------|--------------|--------------|
| Send Messages | Basic chatting | Low |
| Manage Messages | Delete any message | Medium |
| Mention @everyone | Ping everyone | Medium |
| Manage Threads | Control threads | Medium |

### Voice Permissions
| Permission | What It Does | Danger Level |
|------------|--------------|--------------|
| Connect | Join voice channels | Low |
| Speak | Transmit audio | Low |
| Mute Members | Mute others | Medium |
| Move Members | Drag people around | Medium |

## How Permissions Stack

### Role Hierarchy
1. Server Owner (all permissions, always)
2. Roles (top to bottom)
3. @everyone (base permissions)

Your bot can only manage roles BELOW its highest role.

### Channel Overrides
Channel-specific permissions override role permissions:
- Green checkmark = Allowed
- Red X = Denied
- Gray slash = Inherit from role

## Common Permission Mistakes

### Mistake 1: Bot Role Too Low
Your bot can't kick someone with a higher role. Put the bot role high in the list.

### Mistake 2: Channel Overrides Blocking Bot
The role has permission, but a channel override denies it. Check both!

### Mistake 3: Forgetting Embed Links
Without "Embed Links", your embeds appear as links instead of pretty boxes.

### Mistake 4: Category vs Channel Permissions
Categories have separate permissions. Channels can inherit or override.

## Checking Permissions in Code

\`\`\`javascript
// Before trying an action
const botPermissions = channel.permissionsFor(client.user);

if (!botPermissions.has('ManageMessages')) {
  return message.reply("I need Manage Messages permission!");
}
\`\`\`

## The Permission Calculator

Discord Developer Portal has a permissions calculator:
1. Select needed permissions
2. Copy the number
3. Use in OAuth2 URL

\`\`\`
https://discord.com/oauth2/authorize?client_id=...&permissions=274878024704&scope=bot
\`\`\`

That number (274878024704) represents your selected permissions.

## Quick Reference

**My bot needs to:**
- Send messages only → \`Send Messages\`
- Delete spam → \`Manage Messages\`
- Kick people → \`Kick Members\`
- Play music → \`Connect\` + \`Speak\`
- Do everything → Stop. Reconsider. Pick specific ones.`
  },
  {
    slug: 'role-hierarchy-explained',
    title: 'Role Hierarchy: Why Your Bot Can\'t Ban the Admin',
    category: 'permissions',
    topic: 'Roles',
    keywords: ['role', 'hierarchy', 'position', 'moderator', 'admin', 'order'],
    excerpt: 'The reason your moderation command failed, explained with excessive analogies.',
    icon: 'Crown',
    readTime: 4,
    relatedSlugs: ['permissions-101', 'common-error-messages', 'someone-hacked-my-bot'],
    content: `# Role Hierarchy: Why Your Bot Can't Ban the Admin

You tried to ban someone. Discord said no. Welcome to role hierarchy.

## The Hierarchy Rule

A role can only affect roles BELOW it in the list. This applies to:
- Bots
- Moderators
- Admins
- Everyone except the server owner

## Visual Representation

\`\`\`
👑 Server Owner (untouchable)
    ↓
🔴 Administrator
    ↓
🤖 Your Bot ←── Can only affect below
    ↓
🟡 Moderator
    ↓
🟢 Member
    ↓
⚪ @everyone
\`\`\`

Your bot can moderate Moderator, Member, and @everyone. It CANNOT touch Administrator or the Owner.

## Common Scenarios

### Scenario 1: Bot Can't Kick Mod
**Problem:** Bot role is below Moderator role
**Solution:** Move bot role above Moderator

### Scenario 2: Bot Can't Assign Role
**Problem:** Target role is above or equal to bot's role
**Solution:** Move bot role higher

### Scenario 3: Bot Can Ban Some But Not All
**Problem:** Some users have higher roles
**Solution:** That's... actually working correctly

## How to Check Role Position

Server Settings > Roles > Drag to reorder

The list order matters:
- Top = Most powerful
- Bottom = Least powerful

## Code Check

\`\`\`javascript
const botMember = message.guild.members.me;
const targetMember = message.mentions.members.first();

// Check if bot can moderate target
if (targetMember.roles.highest.position >= botMember.roles.highest.position) {
  return message.reply("I can't moderate someone with equal or higher roles!");
}

// Safe to proceed
await targetMember.kick();
\`\`\`

## Special Cases

### Server Owner
The owner is immune to everything. They own the server. They answer to no one (except Discord ToS).

### Administrator Permission
Having Administrator doesn't put you above anyone in hierarchy. Role position still matters for:
- Being kicked/banned by bots
- Role assignment
- Nickname changes

### @everyone
The floor. Everything else is above it.

## The Hierarchy Checklist

Before a moderation action:
- [ ] Is target the server owner? (Can't touch them)
- [ ] Is target's highest role above bot's? (Can't touch them)
- [ ] Is target's highest role equal to bot's? (Can't touch them)
- [ ] Is target's highest role below bot's? (You may proceed)

## Tips for Bot Operators

1. **Put bot role near the top**
   But below your admin roles, so admins can manage the bot.

2. **Create a dedicated bot role**
   Don't use managed roles (auto-created by Discord).

3. **Document required position**
   Tell server owners where to put the role.

4. **Handle failures gracefully**
   When you can't act, explain why:

\`\`\`javascript
"I cannot moderate {user} because their role is higher than mine."
\`\`\``
  },

  // ============ ADVANCED ============
  {
    slug: 'sharding-when-you-outgrow-one-process',
    title: 'Sharding: When One Process Isn\'t Enough',
    category: 'advanced',
    topic: 'Scaling',
    keywords: ['sharding', 'scaling', 'performance', 'guilds', 'servers', 'large bot'],
    excerpt: 'Your bot is in 2,500+ servers. Congratulations and also I\'m sorry.',
    icon: 'Database',
    readTime: 8,
    relatedSlugs: ['rate-limits-the-fun-police', 'managing-multiple-bots', 'caching-strategies'],
    content: `# Sharding: When One Process Isn't Enough

Your bot has grown. It's in thousands of servers. One process can't handle it anymore. It's time to shard.

## What Is Sharding?

Sharding splits your bot across multiple processes, each handling a portion of servers.

\`\`\`
Without Sharding:
[Single Bot] ←── 5000 servers = 💀

With Sharding:
[Shard 0] ←── 2500 servers
[Shard 1] ←── 2500 servers
Each shard = happy
\`\`\`

## When Do You Need Sharding?

Discord REQUIRES sharding at 2,500 servers. But you might want it earlier if:
- Memory usage is high
- Events are lagging
- You enjoy complexity (masochist)

## How Sharding Works

### The Shard Manager
\`\`\`javascript
const { ShardingManager } = require('discord.js');

const manager = new ShardingManager('./bot.js', {
  token: process.env.TOKEN,
  totalShards: 'auto', // Discord calculates
});

manager.on('shardCreate', shard => {
  console.log(\`Launched shard \${shard.id}\`);
});

manager.spawn();
\`\`\`

### Each Shard
\`\`\`javascript
// In bot.js
client.on('ready', () => {
  console.log(\`Shard \${client.shard.ids[0]} ready!\`);
  console.log(\`Serving \${client.guilds.cache.size} servers\`);
});
\`\`\`

## Shard Communication

Shards are isolated. They can't directly access each other's data.

### Wrong: Direct Access
\`\`\`javascript
// This only gets current shard's count
const count = client.guilds.cache.size; // Wrong!
\`\`\`

### Right: Broadcast Eval
\`\`\`javascript
// This gets ALL shards' counts
const counts = await client.shard.fetchClientValues('guilds.cache.size');
const total = counts.reduce((a, b) => a + b, 0);
\`\`\`

## Common Sharding Patterns

### Getting Total Users
\`\`\`javascript
const results = await client.shard.broadcastEval(
  client => client.guilds.cache.reduce((acc, guild) => acc + guild.memberCount, 0)
);
const totalUsers = results.reduce((a, b) => a + b, 0);
\`\`\`

### Finding a Specific Guild
\`\`\`javascript
const guild = await client.shard.broadcastEval(
  (client, { guildId }) => client.guilds.cache.get(guildId)?.name,
  { context: { guildId: '123456789' } }
);
// Returns array, find the non-null one
\`\`\`

## Sharding Problems

### Problem 1: Data Inconsistency
Each shard has its own cache. If you're storing data globally, use:
- Redis
- Database
- IPC (Inter-Process Communication)

### Problem 2: Rate Limits
Shards share rate limits. Coordinate carefully.

### Problem 3: Restarts
When one shard restarts, users on that shard experience downtime.

### Problem 4: Debugging
\`\`\`
"It works on shard 0 but not shard 1"
- You, at 3 AM
\`\`\`

## Sharding Architecture

\`\`\`
                    ┌─────────────┐
                    │   Manager   │
                    └─────────────┘
                          │
       ┌──────────────────┼──────────────────┐
       ↓                  ↓                  ↓
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Shard 0   │   │   Shard 1   │   │   Shard 2   │
│ Guilds 0-99 │   │Guilds 100-199   │Guilds 200-299
└─────────────┘   └─────────────┘   └─────────────┘
       │                  │                  │
       └──────────────────┼──────────────────┘
                          ↓
                    ┌─────────────┐
                    │   Database  │
                    └─────────────┘
\`\`\`

## Tips for Shard Success

1. **Design for sharding early**
   Even if you don't need it yet.

2. **Centralize your data**
   Use a database, not in-memory.

3. **Test with multiple shards locally**
   Don't wait until production.

4. **Monitor each shard**
   They fail independently.

5. **Handle shard disconnects gracefully**

## The Reality

Sharding adds complexity. But if you're at 2,500+ servers, you've already accepted a certain amount of chaos in your life. Embrace it.`
  },
  {
    slug: 'caching-strategies',
    title: 'Caching Strategies for Bots That Actually Scale',
    category: 'advanced',
    topic: 'Performance',
    keywords: ['cache', 'memory', 'performance', 'optimization', 'redis', 'scaling'],
    excerpt: 'Because fetching the same user 1,000 times per second is not a viable strategy.',
    icon: 'ArrowsClockwise',
    readTime: 6,
    relatedSlugs: ['sharding-when-you-outgrow-one-process', 'rate-limits-the-fun-police'],
    content: `# Caching Strategies for Bots That Actually Scale

Every API call takes time. Every API call counts against rate limits. Caching is how you stop making unnecessary calls.

## What to Cache

### Always Cache
- User data (names, avatars)
- Guild/server information
- Role information
- Channel data

### Sometimes Cache
- Message content (if needed)
- Reaction data
- Presence data (memory heavy!)

### Never Cache
- Tokens
- Sensitive user data
- Anything that changes constantly

## Discord.js Built-in Cache

Discord.js caches automatically, but you can control it:

\`\`\`javascript
const client = new Client({
  intents: [...],
  makeCache: Options.cacheWithLimits({
    MessageManager: 100,        // Keep last 100 messages per channel
    GuildMemberManager: 200,    // Keep 200 members per guild
    PresenceManager: 0,         // Don't cache presences
  }),
});
\`\`\`

## Cache Strategies

### Strategy 1: LRU (Least Recently Used)
Keep frequently accessed items, evict old ones:

\`\`\`javascript
const LRU = require('lru-cache');

const userCache = new LRU({
  max: 500,           // Maximum 500 items
  ttl: 1000 * 60 * 5, // 5 minute expiration
});

async function getUser(id) {
  if (userCache.has(id)) {
    return userCache.get(id);
  }

  const user = await client.users.fetch(id);
  userCache.set(id, user);
  return user;
}
\`\`\`

### Strategy 2: Redis for Shared Cache
When sharding, use Redis so all shards share data:

\`\`\`javascript
const Redis = require('ioredis');
const redis = new Redis();

async function getCachedGuild(id) {
  const cached = await redis.get(\`guild:\${id}\`);
  if (cached) return JSON.parse(cached);

  const guild = await client.guilds.fetch(id);
  await redis.setex(\`guild:\${id}\`, 300, JSON.stringify(guild));
  return guild;
}
\`\`\`

### Strategy 3: Tiered Caching
Check multiple levels:

\`\`\`javascript
async function getData(key) {
  // Level 1: Memory (fastest)
  if (memoryCache.has(key)) {
    return memoryCache.get(key);
  }

  // Level 2: Redis (shared)
  const redisData = await redis.get(key);
  if (redisData) {
    memoryCache.set(key, JSON.parse(redisData));
    return JSON.parse(redisData);
  }

  // Level 3: Database (slowest)
  const dbData = await database.find(key);
  await redis.setex(key, 300, JSON.stringify(dbData));
  memoryCache.set(key, dbData);
  return dbData;
}
\`\`\`

## Cache Invalidation

The hardest problem in computer science (besides naming things):

### Time-Based Expiration
\`\`\`javascript
// Data expires after 5 minutes
cache.set(key, value, { ttl: 1000 * 60 * 5 });
\`\`\`

### Event-Based Invalidation
\`\`\`javascript
client.on('guildUpdate', (oldGuild, newGuild) => {
  cache.delete(\`guild:\${newGuild.id}\`);
});
\`\`\`

### Manual Invalidation
\`\`\`javascript
// After updating data
await database.update(userId, newData);
cache.delete(\`user:\${userId}\`);
\`\`\`

## Memory Management

### Monitoring Memory
\`\`\`javascript
setInterval(() => {
  const used = process.memoryUsage();
  console.log(\`Memory: \${Math.round(used.heapUsed / 1024 / 1024)}MB\`);
}, 60000);
\`\`\`

### Clearing Caches When Needed
\`\`\`javascript
if (memoryUsage > threshold) {
  client.guilds.cache.sweep(g => g.members.cache.size < 10);
  console.log('Swept inactive guild member caches');
}
\`\`\`

## Common Mistakes

### Mistake 1: Caching Forever
Without TTL, your cache grows until it crashes.

### Mistake 2: Not Invalidating
Stale data causes bugs that are hard to reproduce.

### Mistake 3: Caching Too Much
Not everything needs caching. Profile first.

### Mistake 4: Cache Stampede
When cache expires, 1000 requests all fetch simultaneously. Use locking:

\`\`\`javascript
const locks = new Map();

async function getWithLock(key, fetchFn) {
  if (cache.has(key)) return cache.get(key);

  if (!locks.has(key)) {
    locks.set(key, fetchFn().then(data => {
      cache.set(key, data);
      locks.delete(key);
      return data;
    }));
  }

  return locks.get(key);
}
\`\`\``
  },

  // ============ BILLING ============
  {
    slug: 'pricing-plans-explained',
    title: 'Pricing Plans: An Honest Breakdown',
    category: 'billing',
    topic: 'Plans',
    keywords: ['pricing', 'plans', 'subscription', 'cost', 'free', 'premium'],
    excerpt: 'What you get, what you don\'t, and why the "unlimited" plan has limits.',
    icon: 'CreditCard',
    readTime: 4,
    relatedSlugs: ['payment-methods', 'how-to-cancel'],
    content: `# Pricing Plans: An Honest Breakdown

Let's talk money. Here's what each plan actually gives you.

## Plan Comparison

| Feature | Free | Pro | Enterprise |
|---------|------|-----|------------|
| Servers | 3 | 25 | Unlimited* |
| Commands | 10 | Unlimited | Unlimited |
| Custom Branding | No | Yes | Yes |
| Priority Support | No | Email | Dedicated |
| Uptime SLA | None | 99% | 99.9% |
| Price | $0 | $9/mo | Contact Us |

*Unlimited means "we'll email you if you go crazy"

## Free Tier

Perfect for:
- Personal servers
- Testing
- Small communities
- Cheapskates (we don't judge)

Limitations:
- 3 servers max
- Basic commands only
- Community support only
- "Powered by Us" branding

## Pro Tier ($9/month)

Perfect for:
- Growing communities
- Multiple servers
- Actually caring about uptime

Includes:
- 25 servers
- All commands
- Remove our branding
- Email support (48hr response)
- Analytics dashboard
- Priority queuing

## Enterprise Tier (Custom Pricing)

Perfect for:
- Large organizations
- Compliance requirements
- Needing someone to yell at

Includes:
- Unlimited servers
- Custom development
- Dedicated support human
- SLA guarantees
- Invoice billing
- The warm feeling of giving us money

## Hidden Costs (There Are None)

We don't have:
- Setup fees
- Per-user charges
- Overage fees
- Hidden "platform fees"
- Your firstborn child (industry standard)

## FAQ

**Can I change plans anytime?**
Yes. Upgrade instantly, downgrade at period end.

**What happens if I downgrade?**
Features disable. Your data stays for 30 days.

**Is there a free trial for Pro?**
14 days. No credit card required.

**Do you offer refunds?**
Within 7 days, full refund. After that, prorated.

**Non-profit discount?**
Yes! 50% off. Contact us with verification.

## The Honest Take

Free tier is genuinely usable. We make money from Pro/Enterprise, not by hobbling Free into uselessness.

Pro is worth it if you're running multiple servers or need reliability.

Enterprise is for companies with budgets and requirements.

Pick what fits. Upgrade when you need to.`
  },
  {
    slug: 'payment-methods',
    title: 'Payment Methods & Billing FAQ',
    category: 'billing',
    topic: 'Payments',
    keywords: ['payment', 'credit card', 'paypal', 'invoice', 'billing', 'receipt'],
    excerpt: 'All the ways you can give us money, and what happens when you do.',
    icon: 'CreditCard',
    readTime: 3,
    relatedSlugs: ['pricing-plans-explained', 'how-to-cancel'],
    content: `# Payment Methods & Billing FAQ

Let's talk about the boring-but-necessary stuff: how billing works.

## Accepted Payment Methods

### Credit/Debit Cards
- Visa
- Mastercard
- American Express
- Discover
- Most cards with numbers on them

### Other Methods
- PayPal
- Apple Pay (if you're fancy)
- Google Pay
- Bank transfer (Enterprise only)
- Cryptocurrency (just kidding... unless?)

## Billing Cycle

### Monthly Plans
- Charged on signup date each month
- Example: Sign up Jan 15 → Charged Feb 15, Mar 15, etc.

### Annual Plans
- One payment upfront
- 2 months free (basically)
- Charged on anniversary date

## Invoices & Receipts

All invoices are:
- Emailed automatically
- Available in dashboard
- Suitable for expense reports
- Including all legally required info

Access them: Dashboard > Billing > Invoices

## Common Questions

**Why did my payment fail?**
- Card expired
- Insufficient funds
- Bank blocked it (call them)
- Wrong billing address

**Can I change payment method?**
Yes. Dashboard > Billing > Payment Methods

**Can I get a receipt for past payments?**
Yes. All receipts are in your dashboard.

**Do you store my card details?**
No. Stripe handles all payment data. We never see your full card number.

**Will you charge me without warning?**
We email 7 days before renewals. And again 3 days before. And again at charge time. You'll know.

## Failed Payment Process

Day 1: Payment fails → We email you
Day 3: Retry → Email if fails
Day 7: Final retry → Service paused if fails
Day 30: No payment → Account downgraded

We give you plenty of chances. Just update your card.

## Enterprise Billing

Enterprise clients get:
- Custom contracts
- Net-30 invoicing
- Purchase orders accepted
- An actual human to talk to

Contact sales@example.com for enterprise billing.

## Tax Information

We charge:
- No tax in most places (we're a software service)
- VAT in EU (reverse charge may apply)
- GST in Australia
- Whatever your country requires

Tax receipts are included in invoices.`
  },
  {
    slug: 'how-to-cancel',
    title: 'How to Cancel (Without a Phone Call or Guilt Trip)',
    category: 'billing',
    topic: 'Cancellation',
    keywords: ['cancel', 'subscription', 'refund', 'downgrade', 'close account'],
    excerpt: 'We made it easy because we\'re not monsters.',
    icon: 'Warning',
    readTime: 2,
    relatedSlugs: ['pricing-plans-explained', 'payment-methods'],
    content: `# How to Cancel (Without a Phone Call or Guilt Trip)

We're sad to see you go, but we won't make it weird. Here's how to cancel.

## Cancellation Steps

1. Go to Dashboard
2. Click "Billing"
3. Click "Cancel Subscription"
4. Confirm you want to cancel
5. Done

No phone call. No "retention specialist." No guilt trip.

## What Happens After Cancellation

### Immediately
- Nothing changes
- You keep access until period ends

### At Period End
- Downgrade to Free tier
- Paid features disabled
- Your data remains (30 days)

### After 30 Days
- Configuration data deleted
- Usage stats deleted
- You're free

## Refund Policy

| Situation | Refund |
|-----------|--------|
| Within 7 days | Full refund |
| 7-30 days | Prorated |
| After 30 days | No refund |

Request refunds: Dashboard > Billing > Request Refund

## Before You Go

### Export Your Data
Dashboard > Settings > Export Data

This gives you:
- Configuration
- Logs
- Usage statistics

### Check for Alternatives

Maybe you don't need to cancel:
- **Too expensive?** Try downgrading first
- **Missing feature?** Let us know
- **Switching services?** We'd love feedback

## If You Come Back

Your account remembers you. If you resubscribe within 30 days:
- Settings restored
- Data intact
- No setup needed

After 30 days, you start fresh.

## Feedback (Optional)

We'd appreciate knowing why you're leaving. But no pressure.

Exit survey: 1 minute, optional, anonymous.

It actually helps us improve. Or vent. Venting is fine too.

## Final Note

Thanks for being a customer. Seriously.

We hope your needs change and you come back. If not, we wish you well.

No hard feelings. This is a button, not a breakup.`
  },
];

// Sort articles by category for easier browsing
articles.sort((a, b) => {
  const catOrder = categories.findIndex(c => c.id === a.category) - categories.findIndex(c => c.id === b.category);
  if (catOrder !== 0) return catOrder;
  return a.title.localeCompare(b.title);
});

export function getArticlesByCategory(category: Article['category']): Article[] {
  return articles.filter(a => a.category === category);
}

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find(a => a.slug === slug);
}

export function searchArticles(query: string): Article[] {
  const lowerQuery = query.toLowerCase();
  return articles
    .map(article => {
      let score = 0;
      if (article.title.toLowerCase().includes(lowerQuery)) score += 10;
      if (article.excerpt.toLowerCase().includes(lowerQuery)) score += 5;
      if (article.keywords.some(k => k.toLowerCase().includes(lowerQuery))) score += 8;
      return { article, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ article }) => article);
}

export function getRelatedArticles(slug: string): Article[] {
  const article = getArticleBySlug(slug);
  if (!article) return [];
  return article.relatedSlugs
    .map(s => getArticleBySlug(s))
    .filter((a): a is Article => a !== undefined);
}
