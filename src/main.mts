'use strict';

// URL Title module
// Listens for messages containing URLs and fetches their titles

import { createRequire } from 'node:module';
import fs from 'node:fs';
import * as yaml from 'js-yaml';
import { NatsClient, log } from '@eeveebot/libeevee';
import { fetch } from 'undici';
import { colorizeUrlTitle, colorizeYouTubeTitle } from './utils/colorize.mjs';

const require = createRequire(import.meta.url);
const YouTube = require('youtube-node');

// Record module startup time for uptime tracking
const moduleStartTime = Date.now();

// Periodic cache cleanup function
function cleanupExpiredCache(): void {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [url, entry] of titleCache.entries()) {
    if (now - entry.timestamp >= CACHE_DURATION) {
      titleCache.delete(url);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    log.debug('Cleaned expired cache entries', {
      producer: 'urltitle',
      count: cleanedCount,
    });
  }
}

// Run cache cleanup every 5 minutes
setInterval(cleanupExpiredCache, 5 * 60 * 1000);

const urlTitleBroadcastUUID = 'b8f0c9a4-5e1d-4f2a-9c3b-7d8e1f2a3b4c';
const urlTitleBroadcastDisplayName = 'urltitle';

// Rate limit configuration interface
interface RateLimitConfig {
  mode: 'enqueue' | 'drop';
  level: 'channel' | 'user' | 'global';
  limit: number;
  interval: string; // e.g., "30s", "1m", "5m"
}

// URL Title module configuration interface
interface UrlTitleConfig {
  ratelimit?: RateLimitConfig;
  enabled?: boolean;
}

// Cache entry interface
interface CacheEntry {
  title: string;
  timestamp: number;
}

// In-memory cache for URL titles
const titleCache = new Map<string, CacheEntry>();
const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

const natsClients: InstanceType<typeof NatsClient>[] = [];
const natsSubscriptions: Array<Promise<string | boolean>> = [];

/**
 * Load urltitle configuration from YAML file
 * @returns UrlTitleConfig parsed from YAML file
 */
function loadUrlTitleConfig(): UrlTitleConfig {
  // Get the config file path from environment variable
  const configPath = process.env.MODULE_CONFIG_PATH;
  if (!configPath) {
    log.warn('MODULE_CONFIG_PATH not set, using default config', {
      producer: 'urltitle',
    });
    return { enabled: true };
  }

  try {
    // Read the YAML file
    const configFile = fs.readFileSync(configPath, 'utf8');

    // Parse the YAML content
    const config = yaml.load(configFile) as UrlTitleConfig;

    log.info('Loaded urltitle configuration', {
      producer: 'urltitle',
      configPath,
    });

    return config;
  } catch (error) {
    log.error('Failed to load urltitle configuration, using defaults', {
      producer: 'urltitle',
      configPath,
      error: error instanceof Error ? error.message : String(error),
    });
    return { enabled: true };
  }
}

//
// Do whatever teardown is necessary before calling common handler
process.on('SIGINT', () => {
  natsClients.forEach((natsClient) => {
    void natsClient.drain();
  });
});

process.on('SIGTERM', () => {
  natsClients.forEach((natsClient) => {
    void natsClient.drain();
  });
});

//
// Setup NATS connection

// Get host and token
const natsHost = process.env.NATS_HOST || false;
if (!natsHost) {
  const msg = 'environment variable NATS_HOST is not set.';
  throw new Error(msg);
}

const natsToken = process.env.NATS_TOKEN || false;
if (!natsToken) {
  const msg = 'environment variable NATS_TOKEN is not set.';
  throw new Error(msg);
}

const nats = new NatsClient({
  natsHost: natsHost as string,
  natsToken: natsToken as string,
});
natsClients.push(nats);
await nats.connect();

// Load configuration at startup
const urlTitleConfig = loadUrlTitleConfig();

// Check if module is enabled
if (urlTitleConfig.enabled === false) {
  log.info('URL Title module is disabled, exiting', {
    producer: 'urltitle',
  });
  process.exit(0);
}

// Initialize YouTube client
const youtube = new YouTube();
const youtubeApiKey = process.env.YOUTUBE_API_KEY;
if (youtubeApiKey) {
  youtube.setKey(youtubeApiKey);
}

/**
 * Check if URL is a YouTube video
 * @param url URL to check
 * @returns YouTube video ID if URL is a YouTube video, null otherwise
 */
function getYouTubeVideoId(url: string): string | null {
  const youtubeRegex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;
  const match = url.match(youtubeRegex);
  return match ? match[1] : null;
}

/**
 * Format duration from ISO 8601 format to human readable format
 * @param duration ISO 8601 duration string
 * @returns Formatted duration string
 */
function formatDuration(duration: string): string {
  // Remove PT prefix
  const dur = duration.replace('PT', '');

  // Extract hours, minutes, seconds
  const hoursMatch = dur.match(/(\d+)H/);
  const minutesMatch = dur.match(/(\d+)M/);
  const secondsMatch = dur.match(/(\d+)S/);

  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;
  const seconds = secondsMatch ? parseInt(secondsMatch[1], 10) : 0;

  // Format as HH:MM:SS or MM:SS
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  } else {
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

/**
 * Format large numbers with K (thousands) or M (millions) suffix
 * @param num Number to format
 * @returns Formatted number string
 */
function formatNumber(num: number): string {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(1) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'K';
  } else {
    return num.toString();
  }
}

/**
 * Format date to a more readable format
 * @param date ISO date string
 * @returns Formatted date string
 */
function formatDate(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

// YouTube API response types
interface YouTubeVideoItem {
  id: string;
  snippet: {
    title: string;
    publishedAt: string;
  };
  statistics: {
    viewCount?: string;
    likeCount?: string;
    dislikeCount?: string;
    commentCount?: string;
  };
  contentDetails: {
    duration?: string;
  };
}

interface YouTubeResponse {
  items: YouTubeVideoItem[];
}

/**
 * Fetch YouTube video details
 * @param videoId YouTube video ID
 * @param platform Platform identifier for colorization
 * @returns Formatted video details or null if failed
 */
async function fetchYouTubeDetails(videoId: string, platform: string = 'irc'): Promise<string | null> {
  return new Promise((resolve) => {
    if (!youtubeApiKey) {
      resolve(null);
      return;
    }

    youtube.getById(videoId, (error: Error, result: YouTubeResponse) => {
      if (error) {
        log.debug('Failed to fetch YouTube video details', {
          producer: 'urltitle',
          videoId,
          error: error.message,
        });
        resolve(null);
        return;
      }

      try {
        const item = result.items[0];
        if (!item) {
          resolve(null);
          return;
        }

        const snippet = item.snippet;
        const statistics = item.statistics;
        const contentDetails = item.contentDetails;

        const title = snippet.title;
        const date = formatDate(snippet.publishedAt);
        const views = statistics.viewCount
          ? formatNumber(parseInt(statistics.viewCount, 10))
          : 'N/A';
        const likes = statistics.likeCount
          ? formatNumber(parseInt(statistics.likeCount, 10))
          : 'N/A';
        const duration = contentDetails.duration
          ? formatDuration(contentDetails.duration)
          : 'N/A';

        // Create structured output with individual elements
        const youtubeElements = {
          title: title,
          date: date,
          views: views,
          likes: likes,
          duration: duration
        };

        // Create formatted output with infographic elements
        const youtubeInfo = `${title} | 📅 ${date} | 👁️ ${views} | 👍 ${likes} | ⏱️ ${duration}`;

        // Colorize the YouTube info based on platform
        const coloredYoutubeInfo = colorizeYouTubeTitle(youtubeInfo, platform, youtubeElements);

        resolve(coloredYoutubeInfo);
      } catch (err) {
        log.debug('Error processing YouTube video details', {
          producer: 'urltitle',
          videoId,
          error: err instanceof Error ? err.message : String(err),
        });
        resolve(null);
      }
    });
  });
}

/**
 * Extract URLs from text
 * @param text Text to search for URLs
 * @returns Array of URLs found in text
 */
function extractUrls(text: string): string[] {
  // Regular expression to match URLs
  const urlRegex =
    /https?:\/\/(?:[-\w.])+(?::[0-9]+)?(?:\/(?:[\w/_.])*(?:\?(?:[\w&=%.])*)?(?:#(?:[\w.])*)?)?/g;
  const matches = text.match(urlRegex);
  return matches ? matches : [];
}

/**
 * Fetch title from URL with caching
 * @param url URL to fetch title from
 * @param platform Platform identifier for colorization
 * @returns Title of the page or null if failed
 */
async function fetchUrlTitle(url: string, platform: string = 'irc'): Promise<string | null> {
  try {
    // Add URL if it doesn't have a protocol
    let normalizedUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      normalizedUrl = `https://${url}`;
    }

    // Check cache first
    const cachedEntry = titleCache.get(normalizedUrl);
    if (cachedEntry) {
      const now = Date.now();
      if (now - cachedEntry.timestamp < CACHE_DURATION) {
        log.debug('Returning cached title for URL', {
          producer: 'urltitle',
          url: normalizedUrl,
        });
        return cachedEntry.title;
      } else {
        // Expired cache entry, remove it
        titleCache.delete(normalizedUrl);
      }
    }

    // Check if this is a YouTube URL first
    const videoId = getYouTubeVideoId(url);
    if (videoId && youtubeApiKey) {
      const youtubeDetails = await fetchYouTubeDetails(videoId, platform);
      if (youtubeDetails) {
        // YouTube details are already colorized in fetchYouTubeDetails
        // Cache the result
        titleCache.set(normalizedUrl, {
          title: youtubeDetails,
          timestamp: Date.now(),
        });
        return youtubeDetails;
      }
    }

    const response = await fetch(normalizedUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; eevee.bot URL Title Fetcher; +https://eevee.bot)',
      },
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    if (!response.ok) {
      log.debug('Failed to fetch URL', {
        producer: 'urltitle',
        url: normalizedUrl,
        status: response.status,
      });
      return null;
    }

    // Check content type to ensure it's HTML
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('text/html')) {
      log.debug('URL is not HTML content', {
        producer: 'urltitle',
        url: normalizedUrl,
        contentType,
      });
      return null;
    }

    // Read a reasonable amount of data (first 100KB should be enough for title)
    const html = await response.text();

    // Extract title using regex
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    if (titleMatch && titleMatch[1]) {
      // Decode HTML entities and trim whitespace
      let title = titleMatch[1]
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#x27;/g, "'")
        .replace(/&#x2F;/g, '/')
        .replace(/&#(\d+);/g, (match, dec) =>
          String.fromCharCode(parseInt(dec, 10))
        )
        .trim();

      // Limit title length to prevent spam
      if (title.length > 200) {
        title = title.substring(0, 200) + '...';
      }

      // Cache the result
      titleCache.set(normalizedUrl, {
        title: title,
        timestamp: Date.now(),
      });

      return title;
    }

    return null;
  } catch (error) {
    log.debug('Failed to fetch URL title', {
      producer: 'urltitle',
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
}

// Function to register the urltitle broadcast with the router
async function registerUrlTitleBroadcast(): Promise<void> {
  const broadcastRegistration = {
    type: 'broadcast.register',
    broadcastUUID: urlTitleBroadcastUUID,
    broadcastDisplayName: urlTitleBroadcastDisplayName,
    platform: '.*', // Match all platforms
    network: '.*', // Match all networks
    instance: '.*', // Match all instances
    channel: '.*', // Match all channels
    user: '.*', // Match all users
    messageFilterRegex: 'https?://', // Only messages containing URLs
    ttl: 120000, // 2 minutes TTL
  };

  try {
    await nats.publish(
      'broadcast.register',
      JSON.stringify(broadcastRegistration)
    );
    log.info('Registered urltitle broadcast with router', {
      producer: 'urltitle',
    });
  } catch (error) {
    log.error('Failed to register urltitle broadcast', {
      producer: 'urltitle',
      error: error,
    });
  }
}

// Register broadcast at startup
await registerUrlTitleBroadcast();

// Subscribe to broadcast messages
const urlTitleBroadcastSub = nats.subscribe(
  `broadcast.message.${urlTitleBroadcastUUID}`,
  async (subject, message) => {
    try {
      const data = JSON.parse(message.string());
      log.debug('Received broadcast.message for urltitle', {
        producer: 'urltitle',
        platform: data.platform,
        instance: data.instance,
        channel: data.channel,
        user: data.user,
        text: data.text,
      });

      // Extract URLs from the message
      const urls = extractUrls(data.text);

      // Process each URL
      for (const url of urls) {
        // Fetch the title for this URL
        const title = await fetchUrlTitle(url, data.platform);

        // If we got a title, send it to the channel
        if (title) {
          // Colorize the title based on platform
          const coloredTitle = colorizeUrlTitle(`Title: ${title}`, data.platform);
          
          const response = {
            channel: data.channel,
            network: data.network,
            instance: data.instance,
            platform: data.platform,
            text: coloredTitle,
            trace: data.trace,
            type: 'message.outgoing',
          };

          const outgoingTopic = `chat.message.outgoing.${data.platform}.${data.instance}.${data.channel}`;
          void nats.publish(outgoingTopic, JSON.stringify(response));

          // Break after first title to avoid spam
          break;
        }
      }
    } catch (error) {
      log.error('Failed to process urltitle broadcast', {
        producer: 'urltitle',
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);
natsSubscriptions.push(urlTitleBroadcastSub);

// Subscribe to control messages for re-registering broadcasts
const controlSubRegisterBroadcastUrlTitle = nats.subscribe(
  `control.registerBroadcasts.${urlTitleBroadcastDisplayName}`,
  () => {
    log.info(
      `Received control.registerBroadcasts.${urlTitleBroadcastDisplayName} control message`,
      {
        producer: 'urltitle',
      }
    );
    void registerUrlTitleBroadcast();
  }
);
natsSubscriptions.push(controlSubRegisterBroadcastUrlTitle);

const controlSubRegisterBroadcastAll = nats.subscribe(
  'control.registerBroadcasts',
  () => {
    log.info('Received control.registerBroadcasts control message', {
      producer: 'urltitle',
    });
    void registerUrlTitleBroadcast();
  }
);
natsSubscriptions.push(controlSubRegisterBroadcastAll);

// Subscribe to stats.uptime messages and respond with module uptime
const statsUptimeSub = nats.subscribe('stats.uptime', (subject, message) => {
  try {
    const data = JSON.parse(message.string());
    log.info('Received stats.uptime request', {
      producer: 'urltitle',
      replyChannel: data.replyChannel,
    });

    // Calculate uptime in milliseconds
    const uptime = Date.now() - moduleStartTime;

    // Send uptime back via the ephemeral reply channel
    const uptimeResponse = {
      module: 'urltitle',
      uptime: uptime,
      uptimeFormatted: `${Math.floor(uptime / 86400000)}d ${Math.floor((uptime % 86400000) / 3600000)}h ${Math.floor((uptime % 3600000) / 60000)}m ${Math.floor((uptime % 60000) / 1000)}s`,
    };

    if (data.replyChannel) {
      void nats.publish(data.replyChannel, JSON.stringify(uptimeResponse));
    }
  } catch (error) {
    log.error('Failed to process stats.uptime request', {
      producer: 'urltitle',
      error: error,
    });
  }
});
natsSubscriptions.push(statsUptimeSub);

// Help information for urltitle module
const urltitleHelp = [
  {
    command: 'urltitle',
    descr:
      'Automatically fetches and displays titles for URLs posted in chat. No command needed - works automatically.',
    params: [],
  },
];

// Function to publish help information
async function publishHelp(): Promise<void> {
  const helpUpdate = {
    from: 'urltitle',
    help: urltitleHelp,
  };

  try {
    await nats.publish('help.update', JSON.stringify(helpUpdate));
    log.info('Published urltitle help information', {
      producer: 'urltitle',
    });
  } catch (error) {
    log.error('Failed to publish urltitle help information', {
      producer: 'urltitle',
      error: error,
    });
  }
}

// Publish help information at startup
await publishHelp();

// Subscribe to help update requests
const helpUpdateRequestSub = nats.subscribe('help.updateRequest', () => {
  log.info('Received help.updateRequest message', {
    producer: 'urltitle',
  });
  void publishHelp();
});
natsSubscriptions.push(helpUpdateRequestSub);
