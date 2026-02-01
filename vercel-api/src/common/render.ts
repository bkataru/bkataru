import { clampValue, encodeHTML } from "./fmt.js";

/**
 * Flex layout parameters.
 */
export interface FlexLayoutParams {
  items: string[];
  gap: number;
  direction?: "column" | "row";
  sizes?: number[];
}

/**
 * Auto layout utility, allows us to layout things vertically or horizontally with proper gaps.
 *
 * @param params - Layout parameters.
 * @returns Array of items wrapped in SVG groups with proper transforms.
 */
export function flexLayout({
  items,
  gap,
  direction = "row",
  sizes = [],
}: FlexLayoutParams): string[] {
  let lastSize = 0;
  return items.filter(Boolean).map((item, i) => {
    const size = sizes[i] || 0;
    const transform =
      direction === "column"
        ? `translate(0, ${lastSize})`
        : `translate(${lastSize}, 0)`;
    lastSize += size + gap;
    return `<g transform="${transform}">${item}</g>`;
  });
}

/**
 * Progress node parameters.
 */
export interface ProgressNodeParams {
  x: number;
  y: number;
  width: number;
  color: string;
  progress: number;
  progressBarBackgroundColor: string;
  delay: number;
}

/**
 * Create a node to indicate progress in percentage along a horizontal line.
 *
 * @param params - Progress node parameters.
 * @returns Progress node SVG.
 */
export function createProgressNode({
  x,
  y,
  width,
  color,
  progress,
  progressBarBackgroundColor,
  delay,
}: ProgressNodeParams): string {
  const progressPercentage = clampValue(progress, 2, 100);

  return `
    <svg width="${width}" x="${x}" y="${y}">
      <rect rx="5" ry="5" x="0" y="0" width="${width}" height="8" fill="${progressBarBackgroundColor}"></rect>
      <svg data-testid="lang-progress" width="${progressPercentage}%">
        <rect
            height="8"
            fill="${color}"
            rx="5" ry="5" x="0" y="0"
            class="lang-progress"
            style="animation-delay: ${delay}ms;"
        />
      </svg>
    </svg>
  `;
}

/**
 * Creates a node to display the primary programming language.
 *
 * @param langName - Language name.
 * @param langColor - Language color.
 * @returns Language display SVG.
 */
export function createLanguageNode(langName: string, langColor: string): string {
  return `
    <g data-testid="primary-lang">
      <circle data-testid="lang-color" cx="0" cy="-5" r="6" fill="${langColor}" />
      <text data-testid="lang-name" class="gray" x="15">${langName}</text>
    </g>
  `;
}

/**
 * Creates an icon with label to display stats like forks, stars, etc.
 *
 * @param icon - The icon SVG path.
 * @param label - The label to display.
 * @param testid - The test id for the label.
 * @param iconSize - The size of the icon.
 * @returns Icon with label SVG.
 */
export function iconWithLabel(
  icon: string,
  label: number | string,
  testid: string,
  iconSize: number = 16
): string {
  if (typeof label === "number" && label <= 0) {
    return "";
  }

  const iconSvg = `
    <svg
      class="icon"
      y="-12"
      viewBox="0 0 16 16"
      version="1.1"
      width="${iconSize}"
      height="${iconSize}"
    >
      ${icon}
    </svg>
  `;
  const text = `<text data-testid="${testid}" class="gray">${label}</text>`;
  return flexLayout({ items: [iconSvg, text], gap: 20 }).join("");
}

/**
 * Retrieve text length approximation.
 *
 * @see https://stackoverflow.com/a/48172630/10629172
 * @param str - String to measure.
 * @param fontSize - Font size.
 * @returns Approximate text width.
 */
export function measureText(str: string, fontSize: number = 10): number {
  // Character width ratios for common ASCII characters
  const widths = [
    0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0,
    0, 0, 0, 0, 0, 0, 0, 0.2796875, 0.2765625, 0.3546875, 0.5546875, 0.5546875,
    0.8890625, 0.665625, 0.190625, 0.3328125, 0.3328125, 0.3890625, 0.5828125,
    0.2765625, 0.3328125, 0.2765625, 0.3015625, 0.5546875, 0.5546875, 0.5546875,
    0.5546875, 0.5546875, 0.5546875, 0.5546875, 0.5546875, 0.5546875, 0.5546875,
    0.2765625, 0.2765625, 0.584375, 0.5828125, 0.584375, 0.5546875, 1.0140625,
    0.665625, 0.665625, 0.721875, 0.721875, 0.665625, 0.609375, 0.7765625,
    0.721875, 0.2765625, 0.5, 0.665625, 0.5546875, 0.8328125, 0.721875,
    0.7765625, 0.665625, 0.7765625, 0.721875, 0.665625, 0.609375, 0.721875,
    0.665625, 0.94375, 0.665625, 0.665625, 0.609375, 0.2765625, 0.3546875,
    0.2765625, 0.4765625, 0.5546875, 0.3328125, 0.5546875, 0.5546875, 0.5,
    0.5546875, 0.5546875, 0.2765625, 0.5546875, 0.5546875, 0.221875, 0.240625,
    0.5, 0.221875, 0.8328125, 0.5546875, 0.5546875, 0.5546875, 0.5546875,
    0.3328125, 0.5, 0.2765625, 0.5546875, 0.5, 0.721875, 0.5, 0.5, 0.5,
    0.3546875, 0.259375, 0.353125, 0.5890625,
  ];

  const avg = 0.5279276315789471;
  return (
    str
      .split("")
      .map((c) =>
        c.charCodeAt(0) < widths.length ? widths[c.charCodeAt(0)] : avg
      )
      .reduce((cur, acc) => acc + cur, 0) * fontSize
  );
}

/**
 * Re-export encodeHTML for convenience.
 */
export { encodeHTML };
