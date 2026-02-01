/**
 * GitHub Stats Card Renderer
 * Renders an SVG card showing user's GitHub statistics.
 */

import { Theme, getTheme } from "../themes/index.js";
import { UserStats } from "../types/index.js";
import { kFormatter } from "../common/fmt.js";

export interface StatsCardOptions {
  theme?: string;
  show_icons?: boolean;
  hide_border?: boolean;
  hide_rank?: boolean;
  card_width?: number;
  include_all_commits?: boolean;
  show?: string[]; // ['reviews', 'prs_merged', 'prs_merged_percentage']
  line_height?: number;
  text_bold?: boolean;
  disable_animations?: boolean;
}

// Card dimensions
const CARD_MIN_WIDTH = 287;
const CARD_DEFAULT_WIDTH = 287;
const RANK_CARD_MIN_WIDTH = 420;
const RANK_CARD_DEFAULT_WIDTH = 450;

// Icons for stats
const icons = {
  star: `<path fill-rule="evenodd" d="M8 .25a.75.75 0 01.673.418l1.882 3.815 4.21.612a.75.75 0 01.416 1.279l-3.046 2.97.719 4.192a.75.75 0 01-1.088.791L8 12.347l-3.766 1.98a.75.75 0 01-1.088-.79l.72-4.194L.818 6.374a.75.75 0 01.416-1.28l4.21-.611L7.327.668A.75.75 0 018 .25z"/>`,
  commits: `<path fill-rule="evenodd" d="M1.643 3.143L.427 1.927A.25.25 0 000 2.104V5.75c0 .138.112.25.25.25h3.646a.25.25 0 00.177-.427L2.715 4.215a6.5 6.5 0 11-1.18 4.458.75.75 0 10-1.493.154 8.001 8.001 0 101.6-5.684zM7.75 4a.75.75 0 01.75.75v2.992l2.028.812a.75.75 0 01-.557 1.392l-2.5-1A.75.75 0 017 8.25v-3.5A.75.75 0 017.75 4z"/>`,
  prs: `<path fill-rule="evenodd" d="M7.177 3.073L9.573.677A.25.25 0 0110 .854v4.792a.25.25 0 01-.427.177L7.177 3.427a.25.25 0 010-.354zM3.75 2.5a.75.75 0 100 1.5.75.75 0 000-1.5zm-2.25.75a2.25 2.25 0 113 2.122v5.256a2.251 2.251 0 11-1.5 0V5.372A2.25 2.25 0 011.5 3.25zM11 2.5h-1V4h1a1 1 0 011 1v5.628a2.251 2.251 0 101.5 0V5A2.5 2.5 0 0011 2.5zm1 10.25a.75.75 0 111.5 0 .75.75 0 01-1.5 0zM3.75 12a.75.75 0 100 1.5.75.75 0 000-1.5z"/>`,
  issues: `<path fill-rule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm9 3a1 1 0 11-2 0 1 1 0 012 0zm-.25-6.25a.75.75 0 00-1.5 0v3.5a.75.75 0 001.5 0v-3.5z"/>`,
  contribs: `<path fill-rule="evenodd" d="M2 2.5A2.5 2.5 0 014.5 0h8.75a.75.75 0 01.75.75v12.5a.75.75 0 01-.75.75h-2.5a.75.75 0 110-1.5h1.75v-2h-8a1 1 0 00-.714 1.7.75.75 0 01-1.072 1.05A2.495 2.495 0 012 11.5v-9zm10.5-1V9h-8c-.356 0-.694.074-1 .208V2.5a1 1 0 011-1h8zM5 12.25v3.25a.25.25 0 00.4.2l1.45-1.087a.25.25 0 01.3 0L8.6 15.7a.25.25 0 00.4-.2v-3.25a.25.25 0 00-.25-.25h-3.5a.25.25 0 00-.25.25z"/>`,
  reviews: `<path fill-rule="evenodd" d="M1.5 2.75a.25.25 0 01.25-.25h12.5a.25.25 0 01.25.25v8.5a.25.25 0 01-.25.25h-6.5a.75.75 0 00-.53.22L4.5 14.44v-2.19a.75.75 0 00-.75-.75h-2a.25.25 0 01-.25-.25v-8.5zM1.75 1A1.75 1.75 0 000 2.75v8.5C0 12.216.784 13 1.75 13H3v1.543a1.457 1.457 0 002.487 1.03L8.061 13h6.189A1.75 1.75 0 0016 11.25v-8.5A1.75 1.75 0 0014.25 1H1.75zm5.03 3.47a.75.75 0 010 1.06L5.31 7l1.47 1.47a.75.75 0 01-1.06 1.06l-2-2a.75.75 0 010-1.06l2-2a.75.75 0 011.06 0zm2.44 0a.75.75 0 000 1.06L10.69 7 9.22 8.47a.75.75 0 001.06 1.06l2-2a.75.75 0 000-1.06l-2-2a.75.75 0 00-1.06 0z"/>`,
  prs_merged: `<path fill-rule="evenodd" d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5 4.5a.75.75 0 100-1.5.75.75 0 000 1.5z"/>`,
  prs_merged_percentage: `<path fill-rule="evenodd" d="M5 3.254V3.25v.005a.75.75 0 110-.005v.004zm.45 1.9a2.25 2.25 0 10-1.95.218v5.256a2.25 2.25 0 101.5 0V7.123A5.735 5.735 0 009.25 9h1.378a2.251 2.251 0 100-1.5H9.25a4.25 4.25 0 01-3.8-2.346zM12.75 9a.75.75 0 100-1.5.75.75 0 000 1.5zm-8.5 4.5a.75.75 0 100-1.5.75.75 0 000 1.5z"/>`,
};

/**
 * Calculate the progress value for the rank circle animation.
 */
function calculateCircleProgress(value: number): number {
  const radius = 40;
  const c = Math.PI * (radius * 2);

  const clamped = Math.max(0, Math.min(value, 100));
  return ((100 - clamped) / 100) * c;
}

/**
 * Get CSS styles for the card.
 */
function getStyles(
  textColor: string,
  iconColor: string,
  ringColor: string,
  showIcons: boolean,
  progress: number,
  disableAnimations: boolean
): string {
  const progressAnimation = disableAnimations
    ? ""
    : `
    @keyframes rankAnimation {
      from {
        stroke-dashoffset: ${calculateCircleProgress(0)};
      }
      to {
        stroke-dashoffset: ${calculateCircleProgress(progress)};
      }
    }
  `;

  const animationDisabler = disableAnimations
    ? `* { animation-duration: 0s !important; animation-delay: 0s !important; }`
    : "";

  return `
    ${animationDisabler}
    .stat {
      font: 600 14px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
      fill: ${textColor};
    }
    @supports(-moz-appearance: auto) {
      .stat { font-size: 12px; }
    }
    .stagger {
      opacity: 0;
      animation: fadeInAnimation 0.3s ease-in-out forwards;
    }
    .rank-text {
      font: 800 24px 'Segoe UI', Ubuntu, Sans-Serif;
      fill: ${textColor};
    }
    .rank-percentile-header {
      font-size: 14px;
    }
    .rank-percentile-text {
      font-size: 16px;
    }
    .not_bold { font-weight: 400 }
    .bold { font-weight: 700 }
    .icon {
      fill: ${iconColor};
      display: ${showIcons ? "block" : "none"};
    }
    .rank-circle-rim {
      stroke: ${ringColor};
      fill: none;
      stroke-width: 6;
      opacity: 0.2;
    }
    .rank-circle {
      stroke: ${ringColor};
      stroke-dasharray: 250;
      fill: none;
      stroke-width: 6;
      stroke-linecap: round;
      opacity: 0.8;
      animation: rankAnimation 1s forwards ease-in-out;
    }
    @keyframes fadeInAnimation {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    ${progressAnimation}
  `;
}

/**
 * Create a stat text node.
 */
function createTextNode(
  icon: string,
  label: string,
  value: number,
  id: string,
  index: number,
  showIcons: boolean,
  bold: boolean,
  unitSymbol?: string
): string {
  const kValue = id === "prs_merged_percentage" ? value : kFormatter(value);
  const staggerDelay = (index + 3) * 150;
  const labelOffset = showIcons ? `x="25"` : "";

  const iconSvg = showIcons
    ? `<svg data-testid="icon" class="icon" viewBox="0 0 16 16" version="1.1" width="16" height="16">${icon}</svg>`
    : "";

  return `
    <g class="stagger" style="animation-delay: ${staggerDelay}ms" transform="translate(25, 0)">
      ${iconSvg}
      <text class="stat ${bold ? "bold" : "not_bold"}" ${labelOffset} y="12.5">${label}:</text>
      <text
        class="stat ${bold ? "bold" : "not_bold"}"
        x="${showIcons ? 220 : 200}"
        y="12.5"
        data-testid="${id}"
      >${kValue}${unitSymbol ? ` ${unitSymbol}` : ""}</text>
    </g>
  `;
}

/**
 * Render rank icon based on the rank level.
 */
function renderRankIcon(level: string, percentile: number): string {
  // Circle is centered at cx="-10" cy="8" with radius 40
  // Position text at the circle's center x, with y offsets for vertical centering
  return `
    <text x="-10" y="0" text-anchor="middle" class="rank-text rank-percentile-header">Top</text>
    <text x="-10" y="18" text-anchor="middle" class="rank-text rank-percentile-text">${Math.round(percentile)}%</text>
  `;
}

/**
 * Renders the GitHub stats card.
 */
export function renderStatsCard(
  stats: UserStats,
  options: StatsCardOptions = {}
): string {
  const {
    theme = "github_dark",
    show_icons = false,
    hide_border = false,
    hide_rank = false,
    card_width,
    include_all_commits = false,
    show = [],
    line_height = 25,
    text_bold = true,
    disable_animations = false,
  } = options;

  const themeColors = getTheme(theme);
  const titleColor = `#${themeColors.title_color}`;
  const textColor = `#${themeColors.text_color}`;
  const iconColor = `#${themeColors.icon_color}`;
  const bgColor = `#${themeColors.bg_color}`;
  const borderColor = `#${themeColors.border_color}`;
  const ringColor = `#${themeColors.ring_color || themeColors.title_color}`;

  // Build stats array
  const statItems: {
    icon: string;
    label: string;
    value: number;
    id: string;
    unitSymbol?: string;
  }[] = [];

  statItems.push({
    icon: icons.star,
    label: "Total Stars Earned",
    value: stats.totalStars,
    id: "stars",
  });

  statItems.push({
    icon: icons.commits,
    label: include_all_commits ? "Total Commits" : "Total Commits (last year)",
    value: stats.totalCommits,
    id: "commits",
  });

  statItems.push({
    icon: icons.prs,
    label: "Total PRs",
    value: stats.totalPRs,
    id: "prs",
  });

  if (show.includes("prs_merged")) {
    statItems.push({
      icon: icons.prs_merged,
      label: "PRs Merged",
      value: stats.totalPRsMerged,
      id: "prs_merged",
    });
  }

  if (show.includes("prs_merged_percentage")) {
    statItems.push({
      icon: icons.prs_merged_percentage,
      label: "PRs Merged %",
      value: parseFloat(stats.mergedPRsPercentage.toFixed(2)),
      id: "prs_merged_percentage",
      unitSymbol: "%",
    });
  }

  if (show.includes("reviews")) {
    statItems.push({
      icon: icons.reviews,
      label: "Total Reviews",
      value: stats.totalReviews,
      id: "reviews",
    });
  }

  statItems.push({
    icon: icons.issues,
    label: "Total Issues",
    value: stats.totalIssues,
    id: "issues",
  });

  statItems.push({
    icon: icons.contribs,
    label: "Contributed to (last year)",
    value: stats.contributedTo,
    id: "contribs",
  });

  // Calculate dimensions
  const lheight = line_height;
  let height = Math.max(
    45 + (statItems.length + 1) * lheight,
    hide_rank ? 0 : statItems.length ? 150 : 180
  );

  const iconWidth = show_icons && statItems.length ? 17 : 0;
  const minCardWidth = hide_rank
    ? CARD_MIN_WIDTH
    : statItems.length
      ? RANK_CARD_MIN_WIDTH
      : CARD_MIN_WIDTH;
  const defaultCardWidth = hide_rank
    ? CARD_DEFAULT_WIDTH
    : statItems.length
      ? RANK_CARD_DEFAULT_WIDTH
      : CARD_DEFAULT_WIDTH;

  let width = card_width
    ? isNaN(card_width)
      ? defaultCardWidth
      : card_width
    : defaultCardWidth;

  width = Math.max(width, minCardWidth) + iconWidth;

  // Progress for rank circle
  const progress = 100 - stats.rank.percentile;
  const cssStyles = getStyles(
    textColor,
    iconColor,
    ringColor,
    show_icons,
    progress,
    disable_animations
  );

  // Create stat text nodes - each node is wrapped in a transform for vertical positioning
  const statNodes = statItems
    .map((stat, index) => {
      const node = createTextNode(
        stat.icon,
        stat.label,
        stat.value,
        stat.id,
        index,
        show_icons,
        text_bold,
        stat.unitSymbol
      );
      return `<g transform="translate(0, ${index * lheight})">${node}</g>`;
    })
    .join("");

  // Render rank circle
  const rankXTranslation = width - 95;
  // Calculate vertical center of stats content area
  // Stats start at y=55 and each stat is lheight pixels tall
  // The rank circle is centered at cy=8 within its group
  const statsStartY = 55;
  const statsHeight = statItems.length * lheight;
  const statsCenterY = statsStartY + statsHeight / 2;
  const rankCircleCenterOffset = 8; // cy="8" in the circle element
  const rankYTranslation = statsCenterY - rankCircleCenterOffset;
  const rankCircle = hide_rank
    ? ""
    : `
    <g data-testid="rank-circle" transform="translate(${rankXTranslation}, ${rankYTranslation})">
      <circle class="rank-circle-rim" cx="-10" cy="8" r="40" />
      <circle class="rank-circle" cx="-10" cy="8" r="40" />
      <g class="rank-text">
        ${renderRankIcon(stats.rank.level, stats.rank.percentile)}
      </g>
    </g>`;

  // Card title
  const apostrophe = /s$/i.test(stats.name.trim()) ? "" : "s";
  const title = `${stats.name}'${apostrophe} GitHub Stats`;

  // Border style
  const borderStyle = hide_border
    ? ""
    : `stroke="${borderColor}" stroke-width="1"`;

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>${cssStyles}</style>
  
  <rect x="0.5" y="0.5" rx="4.5" width="${width - 1}" height="${height - 1}" fill="${bgColor}" ${borderStyle}/>
  
  <g transform="translate(25, 35)">
    <g transform="translate(0, 0)">
      <text x="0" y="0" class="stat bold" style="font-size: 18px; fill: ${titleColor};">${title}</text>
    </g>
  </g>
  
  <g transform="translate(0, 55)">
    ${statNodes}
  </g>
  
  ${rankCircle}
</svg>`.trim();
}

export default renderStatsCard;
