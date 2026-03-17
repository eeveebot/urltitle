import * as ircColors from 'irc-colors';
import { log } from '@eeveebot/libeevee';

// Handle both ES module and CommonJS imports
const ircColorsObj =
  (ircColors as unknown as { default?: typeof ircColors }).default || ircColors;

// Available irc-colors for URL titles
// Using a more defensive approach to avoid runtime errors
const safeColorFunctions: Record<
  string,
  ((text: string) => string) | undefined
> = {
  blue: ircColorsObj.blue,
  cyan: ircColorsObj.cyan,
  green: ircColorsObj.green,
  yellow: ircColorsObj.yellow,
  purple: ircColorsObj.purple,
  red: ircColorsObj.red,
};

// Background color function (black)
const bgBlackFunction = ircColorsObj.bgBlack;

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
      // Use blue color for URL titles (consistent with existing implementation)
      const colorFunction = safeColorFunctions.blue;
      
      // Safety check to ensure we have a valid function
      if (typeof colorFunction === 'function') {
        let coloredText = colorFunction(text);
        
        // Apply black background if bgBlack function is available
        if (typeof bgBlackFunction === 'function') {
          coloredText = bgBlackFunction(coloredText);
        }
        
        log.debug('Successfully colorized URL title for IRC', {
          producer: 'urltitle',
          originalText: text,
          coloredText: coloredText,
        });
        
        return coloredText;
      } else {
        log.error('Blue color function is not available', {
          producer: 'urltitle',
        });
        return text;
      }
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
            safeColorFunctions.cyan ? safeColorFunctions.cyan(parts[0]) : parts[0],
            safeColorFunctions.yellow ? safeColorFunctions.yellow(parts[1]) : parts[1],
            safeColorFunctions.green ? safeColorFunctions.green(parts[2]) : parts[2],
            safeColorFunctions.red ? safeColorFunctions.red(parts[3]) : parts[3],
            safeColorFunctions.purple ? safeColorFunctions.purple(parts[4]) : parts[4]
          ];
          
          let coloredText = coloredParts.join(' | ');
          
          // Apply black background if bgBlack function is available
          if (typeof bgBlackFunction === 'function') {
            coloredText = bgBlackFunction(coloredText);
          }
          
          log.debug('Successfully colorized YouTube title elements for IRC', {
            producer: 'urltitle',
            originalTitle: title,
            coloredText: coloredText,
          });
          
          return coloredText;
        }
      }
      
      // Fallback to simple colorization if elements not provided
      const colorFunction = safeColorFunctions.cyan;
      
      // Safety check to ensure we have a valid function
      if (typeof colorFunction === 'function') {
        let coloredText = colorFunction(title);
        
        // Apply black background if bgBlack function is available
        if (typeof bgBlackFunction === 'function') {
          coloredText = bgBlackFunction(coloredText);
        }
        
        log.debug('Successfully colorized YouTube title for IRC', {
          producer: 'urltitle',
          originalTitle: title,
          coloredText: coloredText,
        });
        
        return coloredText;
      } else {
        log.error('Cyan color function is not available', {
          producer: 'urltitle',
        });
        return title;
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