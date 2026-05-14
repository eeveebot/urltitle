import { colorizeForPlatform } from '@eeveebot/libeevee';

/**
 * Colorize URL title text based on platform
 */
export function colorizeUrlTitle(text: string, platform: string): string {
  return colorizeForPlatform(text, platform, 'blue');
}

interface YouTubeElements {
  title: string;
  creator: string;
  date: string;
  views: string;
  likes: string;
  duration: string;
}

/**
 * Colorize YouTube title with enhanced formatting and individual colors per element
 */
export function colorizeYouTubeTitle(
  title: string,
  platform: string,
  elements?: YouTubeElements
): string {
  if (platform !== 'irc') return title;

  if (elements) {
    const parts = title.split(' | ');
    if (parts.length === 6) {
      const coloredParts = [
        colorizeForPlatform(parts[0], platform, 'cyan'),       // title
        colorizeForPlatform(parts[1], platform, 'brown'),      // creator
        colorizeForPlatform(parts[2], platform, 'yellow'),     // date
        colorizeForPlatform(parts[3], platform, 'green'),      // views
        colorizeForPlatform(parts[4], platform, 'red'),        // likes
        colorizeForPlatform(parts[5], platform, 'purple'),     // duration
      ];
      return coloredParts.join(' | ');
    }
  }

  return colorizeForPlatform(title, platform, 'cyan');
}
