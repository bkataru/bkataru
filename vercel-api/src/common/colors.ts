/**
 * Checks if a string is a valid hex color.
 *
 * @param hexColor - String to check.
 * @returns True if the given string is a valid hex color.
 */
export function isValidHexColor(hexColor: string): boolean {
  return /^([A-Fa-f0-9]{8}|[A-Fa-f0-9]{6}|[A-Fa-f0-9]{3}|[A-Fa-f0-9]{4})$/.test(
    hexColor
  );
}

/**
 * Check if the given colors array is a valid gradient.
 * First element should be the rotation angle, rest should be valid hex colors.
 *
 * @param colors - Array of colors.
 * @returns True if the given array is a valid gradient.
 */
export function isValidGradient(colors: string[]): boolean {
  return (
    colors.length > 2 &&
    colors.slice(1).every((color) => isValidHexColor(color))
  );
}

/**
 * Retrieves a gradient if color has more than one valid hex codes else a single color.
 *
 * @param color - The color to parse.
 * @param fallback - The fallback color.
 * @returns The gradient or color.
 */
export function fallbackColor(
  color: string | undefined,
  fallback: string
): string | string[] {
  if (!color) {
    return fallback;
  }

  const colors = color.split(",");
  if (colors.length > 1 && isValidGradient(colors)) {
    return colors;
  }

  return isValidHexColor(color) ? `#${color}` : fallback;
}

/**
 * Get CSS for enabling or disabling animations.
 *
 * @param animations - Whether animations are enabled.
 * @returns CSS string for animation control.
 */
export function getAnimationStyle(animations: boolean): string {
  if (!animations) {
    return `* { animation-duration: 0s !important; animation-delay: 0s !important; }`;
  }
  return "";
}

/**
 * Card colors interface.
 */
export interface CardColors {
  titleColor: string;
  iconColor: string;
  textColor: string;
  bgColor: string | string[];
  borderColor: string;
  ringColor: string;
}
