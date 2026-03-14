declare module 'irc-colors' {
  export function white(text: string): string;
  export function black(text: string): string;
  export function blue(text: string): string;
  export function green(text: string): string;
  export function red(text: string): string;
  export function brown(text: string): string;
  export function purple(text: string): string;
  export function orange(text: string): string;
  export function yellow(text: string): string;
  export function lightGreen(text: string): string;
  export function cyan(text: string): string;
  export function lightCyan(text: string): string;
  export function lightBlue(text: string): string;
  export function pink(text: string): string;
  export function gray(text: string): string;
  export function lightGray(text: string): string;
  
  // Background colors
  export function bgWhite(text: string): string;
  export function bgBlack(text: string): string;
  export function bgBlue(text: string): string;
  export function bgGreen(text: string): string;
  export function bgRed(text: string): string;
  export function bgBrown(text: string): string;
  export function bgPurple(text: string): string;
  export function bgOrange(text: string): string;
  export function bgYellow(text: string): string;
  export function bgLightGreen(text: string): string;
  export function bgCyan(text: string): string;
  export function bgLightCyan(text: string): string;
  export function bgLightBlue(text: string): string;
  export function bgPink(text: string): string;
  export function bgGray(text: string): string;
  export function bgLightGray(text: string): string;
  
  // Styles
  export function bold(text: string): string;
  export function underline(text: string): string;
  export function italic(text: string): string;
  export function inverse(text: string): string;
  
  // Additional utilities
  export function rainbow(text: string): string;
  export function random(text: string): string;
  export function stripColors(text: string): string;
  
  // Default export
  const ircColors: {
    white: (text: string) => string;
    black: (text: string) => string;
    blue: (text: string) => string;
    green: (text: string) => string;
    red: (text: string) => string;
    brown: (text: string) => string;
    purple: (text: string) => string;
    orange: (text: string) => string;
    yellow: (text: string) => string;
    lightGreen: (text: string) => string;
    cyan: (text: string) => string;
    lightCyan: (text: string) => string;
    lightBlue: (text: string) => string;
    pink: (text: string) => string;
    gray: (text: string) => string;
    lightGray: (text: string) => string;
    
    // Background colors
    bgWhite: (text: string) => string;
    bgBlack: (text: string) => string;
    bgBlue: (text: string) => string;
    bgGreen: (text: string) => string;
    bgRed: (text: string) => string;
    bgBrown: (text: string) => string;
    bgPurple: (text: string) => string;
    bgOrange: (text: string) => string;
    bgYellow: (text: string) => string;
    bgLightGreen: (text: string) => string;
    bgCyan: (text: string) => string;
    bgLightCyan: (text: string) => string;
    bgLightBlue: (text: string) => string;
    bgPink: (text: string) => string;
    bgGray: (text: string) => string;
    bgLightGray: (text: string) => string;
    
    // Styles
    bold: (text: string) => string;
    underline: (text: string) => string;
    italic: (text: string) => string;
    inverse: (text: string) => string;
    
    // Additional utilities
    rainbow: (text: string) => string;
    random: (text: string) => string;
    stripColors: (text: string) => string;
  };
  
  export default ircColors;
}