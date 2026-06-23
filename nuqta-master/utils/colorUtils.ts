/**
 * Color Utility Functions
 * Helper functions for color manipulation and gradient generation
 */

/**
 * Converts hex color to RGB object
 */
export const hexToRgb = (hex: string): { r: number; g: number; b: number } | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
};

/**
 * Converts RGB values to hex string
 */
export const rgbToHex = (r: number, g: number, b: number): string => {
  return '#' + [r, g, b].map(x => {
    const hex = Math.max(0, Math.min(255, Math.round(x))).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
};

/**
 * Adjusts hex color brightness
 * @param hex - Hex color string (e.g., "#00C06A")
 * @param percent - Percentage to adjust (-100 to 100, negative = darker, positive = lighter)
 * @returns Adjusted hex color
 */
export const adjustBrightness = (hex: string, percent: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;

  const amt = Math.round(2.55 * percent);
  const r = Math.max(0, Math.min(255, rgb.r + amt));
  const g = Math.max(0, Math.min(255, rgb.g + amt));
  const b = Math.max(0, Math.min(255, rgb.b + amt));

  return rgbToHex(r, g, b);
};

/**
 * Darkens a hex color by percentage
 * @param hex - Hex color string
 * @param percent - Percentage to darken (0-100)
 */
export const darken = (hex: string, percent: number): string => {
  return adjustBrightness(hex, -Math.abs(percent));
};

/**
 * Lightens a hex color by percentage
 * @param hex - Hex color string
 * @param percent - Percentage to lighten (0-100)
 */
export const lighten = (hex: string, percent: number): string => {
  return adjustBrightness(hex, Math.abs(percent));
};

/**
 * Generates gradient colors from a primary color
 * Returns [primary, darker shade, darkest navy]
 * @param primaryColor - Primary hex color
 * @returns Tuple of 3 gradient colors
 */
export const generateCategoryGradient = (primaryColor: string): [string, string, string] => {
  return [
    primaryColor,
    darken(primaryColor, 20),
    '#0B2240', // Consistent dark navy for all categories
  ];
};

/**
 * Gets a semi-transparent version of a color
 * @param hex - Hex color string
 * @param opacity - Opacity value (0-1)
 * @returns RGBA string
 */
export const withOpacity = (hex: string, opacity: number): string => {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${opacity})`;
};

/**
 * Determines if a color is light or dark
 * @param hex - Hex color string
 * @returns true if light, false if dark
 */
export const isLightColor = (hex: string): boolean => {
  const rgb = hexToRgb(hex);
  if (!rgb) return true;

  // Using perceived brightness formula
  const brightness = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
  return brightness > 128;
};

/**
 * Gets appropriate text color (black or white) based on background
 * @param backgroundColor - Background hex color
 * @returns '#FFFFFF' for dark backgrounds, '#000000' for light backgrounds
 */
export const getContrastTextColor = (backgroundColor: string): string => {
  return isLightColor(backgroundColor) ? '#000000' : '#FFFFFF';
};

export default {
  hexToRgb,
  rgbToHex,
  adjustBrightness,
  darken,
  lighten,
  generateCategoryGradient,
  withOpacity,
  isLightColor,
  getContrastTextColor,
};
