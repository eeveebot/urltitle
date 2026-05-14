'use strict';

// URL Title module
// Listens for messages containing URLs and fetches their titles

import { createRequire } from 'node:module';
import { NatsClient, log, createNatsConnection, registerGracefulShutdown, createModuleMetrics, loadModuleConfig, RateLimitConfig, sendChatMessage, registerHelp, HelpEntry,
  registerStatsHandlers, registerBroadcast, initializeSystemMetrics, setupHttpServer,
  NatsSubscriptionResult,
} from '@eeveebot/libeevee';
import { fetch } from 'undici';
import { colorizeUrlTitle, colorizeYouTubeTitle } from './utils/colorize.mjs';

const metrics = createModuleMetrics('urltitle');

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
const natsSubscriptions: Array<Promise<NatsSubscriptionResult>> = [];

// Initialize system metrics
initializeSystemMetrics('urltitle');

// Setup HTTP server for metrics and health checks
setupHttpServer({
  port: process.env.HTTP_API_PORT || '9000',
  serviceName: 'urltitle',
  natsClients: natsClients,
});

//
// Do whatever teardown is necessary before calling common handler
registerGracefulShutdown(natsClients);

//
// Setup NATS connection
const nats = await createNatsConnection();
natsClients.push(nats);

// Load configuration at startup
const urlTitleConfig = loadModuleConfig<UrlTitleConfig>({});

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
 * Check if URL is a YouTube video, short, or live stream
 * @param url URL to check
 * @returns Object with video ID and type if URL is a YouTube video, null otherwise
 */
function getYouTubeVideoId(
  url: string
): { id: string; type: 'video' | 'short' | 'live' } | null {
  // Regex for standard YouTube videos
  const youtubeRegex =
    /(?:youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?/\s]{11})/;

  // Regex for YouTube Shorts
  const shortsRegex = /youtube\.com\/shorts\/([^"&?/\s]{11})/;

  // Regex for YouTube Live streams
  const liveRegex = /youtube\.com\/live\/([^"&?/\s]{11})/;

  // Check for standard videos
  const videoMatch = url.match(youtubeRegex);
  if (videoMatch) {
    return { id: videoMatch[1], type: 'video' };
  }

  // Check for Shorts
  const shortsMatch = url.match(shortsRegex);
  if (shortsMatch) {
    return { id: shortsMatch[1], type: 'short' };
  }

  // Check for Live streams
  const liveMatch = url.match(liveRegex);
  if (liveMatch) {
    return { id: liveMatch[1], type: 'live' };
  }

  return null;
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
    channelTitle: string;
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
 * @param type Type of YouTube content (video, short, live)
 * @returns Formatted video details or null if failed
 */
async function fetchYouTubeDetails(
  videoId: string,
  platform: string = 'irc',
  type: 'video' | 'short' | 'live' = 'video'
): Promise<string | null> {
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
        const creator = snippet.channelTitle;
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

        // Add special indicator for Shorts and Live streams
        let typeIndicator = '';
        if (type === 'short') {
          typeIndicator = ' #[SHORT]';
        } else if (type === 'live') {
          typeIndicator = ' #[LIVE]';
        }

        // Create structured output with individual elements
        const youtubeElements = {
          title: title,
          creator: creator,
          date: date,
          views: views,
          likes: likes,
          duration: duration,
        };

        // Create formatted output with infographic elements
        const youtubeInfo = `${title}${typeIndicator} | 👤 ${creator} | 📅 ${date} | 👁️ ${views} | 👍 ${likes} | ⏱️ ${duration}`;

        // Colorize the YouTube info based on platform
        const coloredYoutubeInfo = colorizeYouTubeTitle(
          youtubeInfo,
          platform,
          youtubeElements
        );

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
    /https?:\/\/(?:[-\w.])+(?::[0-9]+)?(?:\/(?:[\w/_.-])*(?:\?(?:[\w&=%._-])*)?(?:#(?:[\w.-])*)?)?/g;
  const matches = text.match(urlRegex);
  return matches ? matches : [];
}

/**
 * Fetch title from URL with caching
 * @param url URL to fetch title from
 * @param platform Platform identifier for colorization
 * @returns Title of the page or null if failed
 */
async function fetchUrlTitle(
  url: string,
  platform: string = 'irc'
): Promise<string | null> {
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
    const videoInfo = getYouTubeVideoId(url);
    if (videoInfo && youtubeApiKey) {
      const youtubeDetails = await fetchYouTubeDetails(
        videoInfo.id,
        platform,
        videoInfo.type
      );
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
        .replace(/&mdash;/g, '-')
        .replace(/&amp;/g, '&')
        .replace(/&apos;/g, "'")
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

// Register broadcast at startup using registerBroadcast helper
const urltitleBroadcastSubs = await registerBroadcast(nats, {
  broadcastUUID: urlTitleBroadcastUUID,
  broadcastDisplayName: urlTitleBroadcastDisplayName,
  messageFilterRegex: 'https?://',
}, metrics);
natsSubscriptions.push(...urltitleBroadcastSubs);

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
          const coloredTitle = colorizeUrlTitle(
            `Title: ${title}`,
            data.platform
          );

          await sendChatMessage(nats, {
            channel: data.channel,
            network: data.network,
            instance: data.instance,
            platform: data.platform,
            text: coloredTitle,
            trace: data.trace,
          }, metrics);

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

// (control.registerBroadcasts subscriptions are now handled by registerBroadcast helper)

// Subscribe to stats.uptime and stats.emit.request
const statsSubs = registerStatsHandlers({ nats, moduleName: 'urltitle', startTime: moduleStartTime, metrics });
natsSubscriptions.push(...statsSubs);

// Help information for urltitle module
const urltitleHelp: HelpEntry[] = [
  {
    command: 'urltitle',
    descr:
      'Automatically fetches and displays titles for URLs posted in chat. No command needed - works automatically.',
    params: [],
  },
];

// Register help information (publishes immediately and subscribes to help.updateRequest)
const helpSubs = await registerHelp(nats, 'urltitle', urltitleHelp, metrics);
natsSubscriptions.push(...helpSubs);
