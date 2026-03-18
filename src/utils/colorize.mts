import { ircColors, log } from '@eeveebot/libeevee';

/**
 * Colorize URL title text based on platform
 * @param text Text to colorize
 * @param platform Platform identifier
 * @returns Colorized text if platform is IRC, otherwise original text
 */
export function colorizeUrlTitle(text: string, platform: string): string {
  log.debug('colorizeUrlTitle called', {
    producer: 'urltitle',
    text: text,
    platform: platform,
  });

  // Only apply colorization for IRC platform
  if (platform === 'irc') {
    try {
      const coloredText = ircColors.blue(text);
      return coloredText;
    } catch (error) {
      log.error('Failed to colorize URL title for IRC', {
        producer: 'urltitle',
        text: text,
        error: error instanceof Error ? error.message : String(error),
      });
      return text;
    }
  }

  log.debug('Returning original text for non-IRC platform', {
    producer: 'urltitle',
    text: text,
    platform: platform,
  });

  // Return original text for non-IRC platforms
  return text;
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
 * @param title Formatted YouTube video title with elements
 * @param platform Platform identifier
 * @param elements Individual YouTube elements for granular colorization
 * @returns Colorized title if platform is IRC, otherwise original title
 */
export function colorizeYouTubeTitle(
  title: string,
  platform: string,
  elements?: YouTubeElements
): string {
  log.debug('colorizeYouTubeTitle called', {
    producer: 'urltitle',
    title: title,
    platform: platform,
  });

  // Only apply colorization for IRC platform
  if (platform === 'irc') {
    try {
      // If we have individual elements, apply different colors to each
      if (elements) {
        // Split the title into parts
        const parts = title.split(' | ');
        if (parts.length === 5) {
          // Apply different colors to each element:
          // Title - cyan, Date - yellow, Views - green, Likes - red, Duration - purple
          const coloredParts = [
            ircColors.cyan(parts[0]),
            ircColors.yellow(parts[1]),
            ircColors.green(parts[2]),
            ircColors.red(parts[3]),
            ircColors.purple(parts[4]),
          ];

          const coloredText = coloredParts.join(' | ');
          return coloredText;
        }
      } else {
        const coloredText = ircColors.cyan(title);
        return coloredText;
      }
    } catch (error) {
      log.error('Failed to colorize YouTube title for IRC', {
        producer: 'urltitle',
        title: title,
        error: error instanceof Error ? error.message : String(error),
      });
      return title;
    }
  }

  log.debug('Returning original title for non-IRC platform', {
    producer: 'urltitle',
    title: title,
    platform: platform,
  });

  // Return original title for non-IRC platforms
  return title;
}
