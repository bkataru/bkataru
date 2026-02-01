/**
 * Top Languages Card Renderer
 * Renders an SVG card showing user's most frequently used programming languages.
 * Default layout is 'donut' for visual appeal.
 */

import { getTheme } from "../themes/index.js";
import { LanguageData, Language } from "../types/index.js";

export interface TopLangsOptions {
  theme?: string;
  hide_border?: boolean;
  card_width?: number;
  layout?: "normal" | "compact" | "donut" | "donut-vertical" | "pie";
  langs_count?: number;
  hide?: string[]; // languages to hide
  disable_animations?: boolean;
  total_size?: number; // Total bytes across all languages (for subtitle)
  total_repos?: number; // Total number of repositories analyzed
}

// Constants
const DEFAULT_CARD_WIDTH = 300;
const MIN_CARD_WIDTH = 280;
const DEFAULT_LANG_COLOR = "#858585";
const CARD_PADDING = 25;
const MAXIMUM_LANGS_COUNT = 20;

const NORMAL_LAYOUT_DEFAULT_LANGS_COUNT = 5;
const COMPACT_LAYOUT_DEFAULT_LANGS_COUNT = 6;
const DONUT_LAYOUT_DEFAULT_LANGS_COUNT = 10;

/**
 * Convert degrees to radians.
 */
function degreesToRadians(angleInDegrees: number): number {
  return angleInDegrees * (Math.PI / 180.0);
}

/**
 * Convert polar coordinates to cartesian.
 */
function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
): { x: number; y: number } {
  const rads = degreesToRadians(angleInDegrees);
  return {
    x: centerX + radius * Math.cos(rads),
    y: centerY + radius * Math.sin(rads),
  };
}

/**
 * Clamp a value between min and max.
 */
function clampValue(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) {
    return min;
  }
  return Math.max(min, Math.min(value, max));
}

/**
 * Trim top languages and calculate total size.
 */
function trimTopLanguages(
  topLangs: LanguageData,
  langsCount: number,
  hide?: string[]
): { langs: Language[]; totalLanguageSize: number } {
  let langs = Object.values(topLangs);
  const langsToHide: Record<string, boolean> = {};

  const clampedCount = clampValue(langsCount, 1, MAXIMUM_LANGS_COUNT);

  if (hide) {
    hide.forEach((langName) => {
      langsToHide[langName.toLowerCase().trim()] = true;
    });
  }

  langs = langs
    .sort((a, b) => b.size - a.size)
    .filter((lang) => !langsToHide[lang.name.toLowerCase().trim()])
    .slice(0, clampedCount);

  const totalLanguageSize = langs.reduce((acc, curr) => acc + curr.size, 0);

  return { langs, totalLanguageSize };
}

/**
 * Get default languages count by layout.
 */
function getDefaultLanguagesCountByLayout(
  layout?: string
): number {
  if (layout === "compact") {
    return COMPACT_LAYOUT_DEFAULT_LANGS_COUNT;
  } else if (layout === "donut" || layout === "donut-vertical" || layout === "pie") {
    return DONUT_LAYOUT_DEFAULT_LANGS_COUNT;
  }
  return NORMAL_LAYOUT_DEFAULT_LANGS_COUNT;
}

/**
 * Calculate donut layout height.
 */
function calculateDonutLayoutHeight(totalLangs: number): number {
  return 215 + Math.max(totalLangs - 5, 0) * 32;
}

/**
 * Calculate vertical offset for donut center.
 */
function donutCenterTranslation(totalLangs: number): number {
  return -45 + Math.max(totalLangs - 5, 0) * 16;
}

/**
 * Create donut SVG paths for language percentages.
 */
function createDonutPaths(
  cx: number,
  cy: number,
  radius: number,
  percentages: number[]
): { d: string; percent: number }[] {
  const paths: { d: string; percent: number }[] = [];
  let startAngle = 0;
  let endAngle = 0;

  const totalPercent = percentages.reduce((acc, curr) => acc + curr, 0);

  for (let i = 0; i < percentages.length; i++) {
    const percent = parseFloat(
      ((percentages[i] / totalPercent) * 100).toFixed(2)
    );

    endAngle = 3.6 * percent + startAngle;
    const startPoint = polarToCartesian(cx, cy, radius, endAngle - 90);
    const endPoint = polarToCartesian(cx, cy, radius, startAngle - 90);
    const largeArc = endAngle - startAngle <= 180 ? 0 : 1;

    paths.push({
      percent,
      d: `M ${startPoint.x} ${startPoint.y} A ${radius} ${radius} 0 ${largeArc} 0 ${endPoint.x} ${endPoint.y}`,
    });

    startAngle = endAngle;
  }

  return paths;
}

/**
 * Format bytes into human-readable size.
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

/**
 * Create compact language node.
 */
function createCompactLangNode(
  lang: Language,
  totalSize: number,
  index: number,
  showRepoCount: boolean = false
): string {
  const percentages = (lang.size / totalSize) * 100;
  const displayValue = `${percentages.toFixed(1)}%`;
  const repoInfo = showRepoCount && lang.count > 0 ? ` (${lang.count} repo${lang.count !== 1 ? "s" : ""})` : "";
  const staggerDelay = (index + 3) * 150;
  const color = lang.color || DEFAULT_LANG_COLOR;

  return `
    <g class="stagger" style="animation-delay: ${staggerDelay}ms">
      <circle cx="5" cy="6" r="5" fill="${color}" />
      <text data-testid="lang-name" x="15" y="10" class="lang-name">
        ${lang.name} ${displayValue}${repoInfo}
      </text>
    </g>
  `;
}

/**
 * Create donut languages node (vertical list).
 */
function createDonutLanguagesNode(
  langs: Language[],
  totalSize: number,
  showRepoCount: boolean = false
): string {
  return langs
    .map((lang, index) => {
      const y = index * 32;
      return `<g transform="translate(0, ${y})">${createCompactLangNode(lang, totalSize, index, showRepoCount)}</g>`;
    })
    .join("");
}

/**
 * Render donut layout.
 */
function renderDonutLayout(
  langs: Language[],
  totalLanguageSize: number,
  showRepoCount: boolean = false
): string {
  const donutSize = 170;
  const centerX = donutSize / 2;
  const centerY = donutSize / 2;
  const radius = 56.67;
  const strokeWidth = 12;

  const colors = langs.map((lang) => lang.color || DEFAULT_LANG_COLOR);
  const langsPercents = langs.map((lang) =>
    parseFloat(((lang.size / totalLanguageSize) * 100).toFixed(2))
  );

  const langPaths = createDonutPaths(centerX, centerY, radius, langsPercents);

  let donutPaths: string;
  if (langs.length === 1) {
    donutPaths = `<circle cx="${centerX}" cy="${centerY}" r="${radius}" stroke="${colors[0]}" fill="none" stroke-width="${strokeWidth}" data-testid="lang-donut" size="100"/>`;
  } else {
    donutPaths = langPaths
      .map((section, index) => {
        const staggerDelay = (index + 3) * 100;
        const delay = staggerDelay + 300;

        return `
          <g class="stagger" style="animation-delay: ${delay}ms">
            <path
              data-testid="lang-donut"
              size="${section.percent}"
              d="${section.d}"
              stroke="${colors[index]}"
              fill="none"
              stroke-width="${strokeWidth}">
            </path>
          </g>
        `;
      })
      .join("");
  }

  const donut = `<svg width="${donutSize}" height="${donutSize}">${donutPaths}</svg>`;
  const verticalOffset = donutCenterTranslation(langs.length);
  // Position donut further right when showing repo counts to accommodate longer legend text
  const donutXOffset = showRepoCount ? 195 : 150;

  return `
    <g transform="translate(0, 0)">
      <g transform="translate(0, 0)">
        ${createDonutLanguagesNode(langs, totalLanguageSize, showRepoCount)}
      </g>
      <g transform="translate(${donutXOffset}, ${verticalOffset})">
        ${donut}
      </g>
    </g>
  `;
}

/**
 * Render normal layout with progress bars.
 */
function renderNormalLayout(
  langs: Language[],
  width: number,
  totalLanguageSize: number
): string {
  const nodes = langs.map((lang, index) => {
    const staggerDelay = (index + 3) * 150;
    const paddingRight = 95;
    const progressTextX = width - paddingRight + 10;
    const progressWidth = width - paddingRight;

    const progress = (lang.size / totalLanguageSize) * 100;
    const displayValue = `${progress.toFixed(2)}%`;
    const color = lang.color || DEFAULT_LANG_COLOR;

    return `
      <g class="stagger" style="animation-delay: ${staggerDelay}ms" transform="translate(0, ${index * 40})">
        <text data-testid="lang-name" x="2" y="15" class="lang-name">${lang.name}</text>
        <text x="${progressTextX}" y="34" class="lang-name">${displayValue}</text>
        <g transform="translate(0, 25)">
          <rect x="0" y="0" width="${progressWidth}" height="8" rx="5" fill="#ddd" />
          <rect
            x="0"
            y="0"
            width="${(progress / 100) * progressWidth}"
            height="8"
            rx="5"
            fill="${color}"
            class="lang-progress"
            style="animation-delay: ${staggerDelay + 300}ms"
          />
        </g>
      </g>
    `;
  });

  return nodes.join("");
}

/**
 * Get CSS styles for the card.
 */
function getStyles(textColor: string, disableAnimations: boolean): string {
  const animationDisabler = disableAnimations
    ? `* { animation-duration: 0s !important; animation-delay: 0s !important; }`
    : "";

  return `
    ${animationDisabler}
    @keyframes slideInAnimation {
      from { width: 0; }
      to { width: calc(100%-100px); }
    }
    @keyframes growWidthAnimation {
      from { width: 0; }
      to { width: 100%; }
    }
    @keyframes fadeInAnimation {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .stat {
      font: 600 14px 'Segoe UI', Ubuntu, "Helvetica Neue", Sans-Serif;
      fill: ${textColor};
    }
    @supports(-moz-appearance: auto) {
      .stat { font-size: 12px; }
    }
    .bold { font-weight: 700 }
    .lang-name {
      font: 400 11px "Segoe UI", Ubuntu, Sans-Serif;
      fill: ${textColor};
    }
    .stagger {
      opacity: 0;
      animation: fadeInAnimation 0.3s ease-in-out forwards;
    }
    #rect-mask rect {
      animation: slideInAnimation 1s ease-in-out forwards;
    }
    .lang-progress {
      animation: growWidthAnimation 0.6s ease-in-out forwards;
    }
  `;
}

/**
 * Calculate normal layout height.
 */
function calculateNormalLayoutHeight(totalLangs: number): number {
  return 45 + (totalLangs + 1) * 40;
}

/**
 * Renders the top languages card.
 */
export function renderTopLanguages(
  topLangs: LanguageData,
  options: TopLangsOptions = {}
): string {
  const {
    theme = "github_dark",
    hide_border = false,
    card_width,
    layout = "donut",
    langs_count = getDefaultLanguagesCountByLayout(layout),
    hide,
    disable_animations = false,
    total_size,
    total_repos,
  } = options;

  const themeColors = getTheme(theme);
  const titleColor = `#${themeColors.title_color}`;
  const textColor = `#${themeColors.text_color}`;
  const bgColor = `#${themeColors.bg_color}`;
  const borderColor = `#${themeColors.border_color}`;

  const { langs, totalLanguageSize } = trimTopLanguages(
    topLangs,
    langs_count,
    hide
  );

  // Use provided total_size if available (includes hidden languages), otherwise use visible total
  const displayTotalSize = total_size ?? totalLanguageSize;
  const showRepoCount = total_repos !== undefined && total_repos > 0;

  let width = card_width
    ? isNaN(card_width)
      ? DEFAULT_CARD_WIDTH
      : Math.max(card_width, MIN_CARD_WIDTH)
    : DEFAULT_CARD_WIDTH;

  let height: number;
  let finalLayout: string;
  // Add extra height for subtitle
  const subtitleHeight = (total_size || total_repos) ? 18 : 0;

  if (langs.length === 0) {
    height = 90;
    finalLayout = `<text x="${CARD_PADDING}" y="11" class="stat bold" fill="${textColor}">No languages data</text>`;
  } else if (layout === "donut") {
    height = calculateDonutLayoutHeight(langs.length) + subtitleHeight;
    // Add extra width to accommodate repo counts in legend
    width = showRepoCount ? width + 100 : width + 50;
    finalLayout = renderDonutLayout(langs, totalLanguageSize, showRepoCount);
  } else {
    // Normal layout
    height = calculateNormalLayoutHeight(langs.length) + subtitleHeight;
    finalLayout = renderNormalLayout(langs, width, totalLanguageSize);
  }

  const cssStyles = getStyles(textColor, disable_animations);
  const title = "Most Used Languages";

  // Build subtitle
  let subtitle = "";
  if (total_size || total_repos) {
    const parts: string[] = [];
    if (total_size && total_size > 0) {
      parts.push(formatBytes(total_size));
    }
    if (total_repos && total_repos > 0) {
      parts.push(`${total_repos} repo${total_repos !== 1 ? "s" : ""}`);
    }
    if (parts.length > 0) {
      subtitle = parts.join(" across ");
    }
  }

  // Border style
  const borderStyle = hide_border
    ? ""
    : `stroke="${borderColor}" stroke-width="1"`;

  // Calculate content Y offset based on whether we have a subtitle
  const contentYOffset = subtitle ? 55 + subtitleHeight : 55;

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>${cssStyles}</style>
  
  <rect x="0.5" y="0.5" rx="4.5" width="${width - 1}" height="${height - 1}" fill="${bgColor}" ${borderStyle}/>
  
  <g transform="translate(25, 35)">
    <g transform="translate(0, 0)">
      <text x="0" y="0" class="stat bold" style="font-size: 18px; fill: ${titleColor};">${title}</text>
      ${subtitle ? `<text x="0" y="18" class="lang-name stagger" style="animation-delay: 150ms; font-size: 11px; opacity: 0.8;">${subtitle}</text>` : ""}
    </g>
  </g>
  
  <svg data-testid="lang-items" x="${CARD_PADDING}" y="${contentYOffset}">
    ${finalLayout}
  </svg>
</svg>`.trim();
}

export default renderTopLanguages;
