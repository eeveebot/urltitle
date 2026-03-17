declare module 'irc-colors' {
  export function white(text: string): string;
  export function black(text: string): string;
  export function navy(text: string): string;
  export function green(text: string): string;
  export function red(text: string): string;
  export function brown(text: string): string;
  export function purple(text: string): string;
  export function olive(text: string): string;
  export function yellow(text: string): string;
  export function lightgreen(text: string): string;
  export function teal(text: string): string;
  export function cyan(text: string): string;
  export function blue(text: string): string;
  export function pink(text: string): string;
  export function gray(text: string): string;
  export function lightgray(text: string): string;
  export function aqua(text: string): string;
  export function bluecyan(text: string): string;
  export function maroon(text: string): string;
  export function violet(text: string): string;
  export function lime(text: string): string;
  export function royal(text: string): string;
  export function fuchsia(text: string): string;
  export function grey(text: string): string;
  export function silver(text: string): string;
  
  // Background colors
  export function bgwhite(text: string): string;
  export function bgblack(text: string): string;
  export function bgnavy(text: string): string;
  export function bggreen(text: string): string;
  export function bgred(text: string): string;
  export function bgbrown(text: string): string;
  export function bgpurple(text: string): string;
  export function bgolive(text: string): string;
  export function bgyellow(text: string): string;
  export function bglightgreen(text: string): string;
  export function bgteal(text: string): string;
  export function bgcyan(text: string): string;
  export function bgblue(text: string): string;
  export function bgpink(text: string): string;
  export function bggray(text: string): string;
  export function bglightgray(text: string): string;
  export function bgaqua(text: string): string;
  export function bgbluecyan(text: string): string;
  export function bgmaroon(text: string): string;
  export function bgviolet(text: string): string;
  export function bglime(text: string): string;
  export function bgroyal(text: string): string;
  export function bgfuchsia(text: string): string;
  export function bggrey(text: string): string;
  export function bgsilver(text: string): string;
  
  // Styles
  export function bold(text: string): string;
  export function underline(text: string): string;
  export function italic(text: string): string;
  export function inverse(text: string): string;
  export function strikethrough(text: string): string;
  export function monospace(text: string): string;
  export function normal(text: string): string;
  
  // Additional utilities
  export function rainbow(text: string): string;
  export function stripColors(text: string): string;
  export function stripStyle(text: string): string;
  export function stripColorsAndStyle(text: string): string;
  export function global(): void;
  
  // Default export
  const ircColors: {
    white: (text: string) => string;
    black: (text: string) => string;
    navy: (text: string) => string;
    green: (text: string) => string;
    red: (text: string) => string;
    brown: (text: string) => string;
    purple: (text: string) => string;
    olive: (text: string) => string;
    yellow: (text: string) => string;
    lightgreen: (text: string) => string;
    teal: (text: string) => string;
    cyan: (text: string) => string;
    blue: (text: string) => string;
    pink: (text: string) => string;
    gray: (text: string) => string;
    lightgray: (text: string) => string;
    aqua: (text: string) => string;
    bluecyan: (text: string) => string;
    maroon: (text: string) => string;
    violet: (text: string) => string;
    lime: (text: string) => string;
    royal: (text: string) => string;
    fuchsia: (text: string) => string;
    grey: (text: string) => string;
    silver: (text: string) => string;
    
    // Background colors
    bgwhite: (text: string) => string;
    bgblack: (text: string) => string;
    bgnavy: (text: string) => string;
    bggreen: (text: string) => string;
    bgred: (text: string) => string;
    bgbrown: (text: string) => string;
    bgpurple: (text: string) => string;
    bgolive: (text: string) => string;
    bgyellow: (text: string) => string;
    bglightgreen: (text: string) => string;
    bgteal: (text: string) => string;
    bgcyan: (text: string) => string;
    bgblue: (text: string) => string;
    bgpink: (text: string) => string;
    bggray: (text: string) => string;
    bglightgray: (text: string) => string;
    bgaqua: (text: string) => string;
    bgbluecyan: (text: string) => string;
    bgmaroon: (text: string) => string;
    bgviolet: (text: string) => string;
    bglime: (text: string) => string;
    bgroyal: (text: string) => string;
    bgfuchsia: (text: string) => string;
    bggrey: (text: string) => string;
    bgsilver: (text: string) => string;
    
    // Styles
    bold: (text: string) => string;
    underline: (text: string) => string;
    italic: (text: string) => string;
    inverse: (text: string) => string;
    strikethrough: (text: string) => string;
    monospace: (text: string) => string;
    normal: (text: string) => string;
    
    // Additional utilities
    rainbow: (text: string) => string;
    stripColors: (text: string) => string;
    stripStyle: (text: string) => string;
    stripColorsAndStyle: (text: string) => string;
    global: () => void;
  };
  
  export default ircColors;
}