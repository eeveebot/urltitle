import { colorizeForPlatform, colorizeByType } from '@eeveebot/libeevee';

/**
 * Colorize URL title text based on platform
 */
export function colorizeUrlTitle(text: string, platform: string): string {
  return colorizeForPlatform(text, platform, 'blue');
}

interface YouTubeElements {
  title: string;
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
    if (parts.length === 5) {
      const coloredParts = [
        colorizeForPlatform(parts[0], platform, 'cyan'),
        colorizeForPlatform(parts[1], platform, 'yellow'),
        colorizeForPlatform(parts[2], platform, 'green'),
        colorizeForPlatform(parts[3], platform, 'red'),
        colorizeForPlatform(parts[4], platform, 'purple'),
      ];
      return coloredParts.join(' | ');
    }
  }

  return colorizeForPlatform(title, platform, 'cyan');
}
