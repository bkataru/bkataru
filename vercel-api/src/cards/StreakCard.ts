/**
 * GitHub Streak Card Renderer
 * Renders an SVG card showing user's contribution streak statistics.
 * Ported from scripts/generate_widgets.ts
 */

import { getTheme } from "../themes";

export interface StreakCardOptions {
  theme?: string;
  card_width?: number;
  hide_border?: boolean;
}

export interface StreakData {
  totalContributions: number;
  currentStreak: number;
  longestStreak: number;
}

/**
 * Calculate streak data from daily contribution counts.
 *
 * @param contributions - Array of daily contribution counts (oldest to newest)
 * @param totalContributions - Optional pre-calculated total (from GitHub API), defaults to sum of contributions
 * @returns StreakData with totalContributions, currentStreak, and longestStreak
 */
export function calculateStreaks(
  contributions: number[],
  totalContributions?: number
): StreakData {
  const total = totalContributions ?? contributions.reduce((sum, c) => sum + c, 0);

  // Calculate current streak (from most recent day backwards)
  let currentStreak = 0;
  for (let i = contributions.length - 1; i >= 0; i--) {
    // Skip today if no contributions yet (could be early in the day)
    if (i === contributions.length - 1 && contributions[i] === 0) {
      continue;
    }
    if (contributions[i] > 0) {
      currentStreak++;
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 0;
  for (const count of contributions) {
    if (count > 0) {
      tempStreak++;
      if (tempStreak > longestStreak) {
        longestStreak = tempStreak;
      }
    } else {
      tempStreak = 0;
    }
  }

  return {
    totalContributions: total,
    currentStreak,
    longestStreak,
  };
}

/**
 * Renders the GitHub streak stats card.
 * Uses inline styles only (no CSS animations) for consistent cross-platform rendering.
 *
 * Layout: 3 balanced columns
 * - Left: Total Contributions (past year)
 * - Center: Current Streak with ring progress indicator
 * - Right: Longest Streak
 */
export function renderStreakCard(
  data: StreakData,
  options: StreakCardOptions = {}
): string {
  const { theme = "github_dark", card_width = 930, hide_border = false } = options;

  const themeColors = getTheme(theme);
  const titleColor = `#${themeColors.title_color}`;
  const textColor = `#${themeColors.text_color}`;
  const bgColor = `#${themeColors.bg_color}`;
  const borderColor = `#${themeColors.border_color}`;
  const ringColor = `#${themeColors.ring_color || themeColors.title_color}`;

  // Ring geometry
  const ringRadius = 44;
  const ringStroke = 6;
  const ringCircumference = 2 * Math.PI * ringRadius;

  const progressPercent =
    data.longestStreak > 0
      ? Math.min(100, (data.currentStreak / data.longestStreak) * 100)
      : 0;
  const ringDashOffset =
    ringCircumference - (progressPercent / 100) * ringCircumference;

  // Layout: 3 balanced columns
  const width = card_width;
  const height = 210;
  const midX = Math.round(width / 2);

  const leftX = 140;
  const rightX = width - 140;

  // Border style
  const borderStyle = hide_border
    ? `stroke="none"`
    : `stroke="${borderColor}"`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="6" fill="${bgColor}" ${borderStyle}/>

  <!-- Title -->
  <text x="25" y="36" font-family="Segoe UI, Ubuntu, sans-serif" font-size="18" font-weight="600" fill="${titleColor}">GitHub Streak</text>

  <!-- Total Contributions (Left Column) -->
  <text x="${leftX}" y="94" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="600" fill="${textColor}" text-anchor="middle">Total Contributions</text>
  <text x="${leftX}" y="128" font-family="Segoe UI, Ubuntu, sans-serif" font-size="30" font-weight="800" fill="${titleColor}" text-anchor="middle">${data.totalContributions.toLocaleString()}</text>
  <text x="${leftX}" y="152" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="400" fill="${textColor}" text-anchor="middle">Past Year</text>

  <!-- Current Streak (Center Column) -->
  <text x="${midX}" y="70" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="600" fill="${textColor}" text-anchor="middle">Current Streak</text>
  <circle cx="${midX}" cy="128" r="${ringRadius}" fill="none" stroke="${ringColor}" stroke-width="${ringStroke}" opacity="0.18"/>
  <circle cx="${midX}" cy="128" r="${ringRadius}" fill="none" stroke="${ringColor}" stroke-width="${ringStroke}" stroke-linecap="round" stroke-dasharray="${ringCircumference.toFixed(2)}" stroke-dashoffset="${ringDashOffset.toFixed(2)}" transform="rotate(-90 ${midX} 128)"/>
  <text x="${midX}" y="138" font-family="Segoe UI, Ubuntu, sans-serif" font-size="30" font-weight="800" fill="${titleColor}" text-anchor="middle">${data.currentStreak}</text>
  <text x="${midX}" y="160" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="400" fill="${textColor}" text-anchor="middle">days</text>

  <!-- Longest Streak (Right Column) -->
  <text x="${rightX}" y="94" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="600" fill="${textColor}" text-anchor="middle">Longest Streak</text>
  <text x="${rightX}" y="128" font-family="Segoe UI, Ubuntu, sans-serif" font-size="30" font-weight="800" fill="${titleColor}" text-anchor="middle">${data.longestStreak}</text>
  <text x="${rightX}" y="152" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="400" fill="${textColor}" text-anchor="middle">days</text>
</svg>`;

  return svg;
}

export default renderStreakCard;
