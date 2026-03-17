declare module 'irc-colors' {
  // Simple approach - each function returns a string but also has all the methods attached
  type ColorFunction = {
    (str: string): string;
  } & IrcColorMethods;

  interface IrcColorMethods {
    // Foreground colors
    white: ColorFunction;
    black: ColorFunction;
    navy: ColorFunction;
    green: ColorFunction;
    red: ColorFunction;
    brown: ColorFunction;
    maroon: ColorFunction;
    purple: ColorFunction;
    violet: ColorFunction;
    olive: ColorFunction;
    yellow: ColorFunction;
    lightgreen: ColorFunction;
    lime: ColorFunction;
    teal: ColorFunction;
    bluecyan: ColorFunction;
    cyan: ColorFunction;
    aqua: ColorFunction;
    blue: ColorFunction;
    royal: ColorFunction;
    pink: ColorFunction;
    lightpurple: ColorFunction;
    fuchsia: ColorFunction;
    gray: ColorFunction;
    grey: ColorFunction;
    lightgray: ColorFunction;
    lightgrey: ColorFunction;
    silver: ColorFunction;

    // Background colors
    bgwhite: ColorFunction;
    bgblack: ColorFunction;
    bgnavy: ColorFunction;
    bggreen: ColorFunction;
    bgred: ColorFunction;
    bgbrown: ColorFunction;
    bgmaroon: ColorFunction;
    bgpurple: ColorFunction;
    bgviolet: ColorFunction;
    bgolive: ColorFunction;
    bgyellow: ColorFunction;
    bglightgreen: ColorFunction;
    bglime: ColorFunction;
    bgteal: ColorFunction;
    bgbluecyan: ColorFunction;
    bgcyan: ColorFunction;
    bgaqua: ColorFunction;
    bgblue: ColorFunction;
    bgroyal: ColorFunction;
    bgpink: ColorFunction;
    bglightpurple: ColorFunction;
    bgfuchsia: ColorFunction;
    bggray: ColorFunction;
    bggrey: ColorFunction;
    bglightgray: ColorFunction;
    bglightgrey: ColorFunction;
    bgsilver: ColorFunction;

    // Styles
    normal: ColorFunction;
    underline: ColorFunction;
    bold: ColorFunction;
    italic: ColorFunction;
    inverse: ColorFunction;
    strikethrough: ColorFunction;
    monospace: ColorFunction;

    // Custom functions
    rainbow(str: string, colorArr?: string[]): string;

    // Extra functions (these don't chain)
    stripColors(str: string): string;
    stripStyle(str: string): string;
    stripColorsAndStyle(str: string): string;
  }

  // Main export
  const ircColors: IrcColorMethods & {
    global: () => void;
  };

  export default ircColors;
}