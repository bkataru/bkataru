/**
 * GitHub Activity Graph Card Renderer
 * Renders an SVG card showing contribution activity over time.
 * 
 * This implementation provides a pure SVG line chart without external dependencies.
 * For the node-chartist version, see the vendor's github-readme-activity-graph.
 */

import { getTheme } from "../themes";
import { ContributionData, ContributionDay } from "../types";

export interface GraphCardOptions {
  theme?: string;
  width?: number;
  height?: number;
  area?: boolean;
  radius?: number;
  hide_border?: boolean;
  custom_title?: string;
  disable_animations?: boolean;
}

interface Colors {
  areaColor: string;
  bgColor: string;
  borderColor: string;
  color: string;
  titleColor: string;
  lineColor: string;
  pointColor: string;
}

/**
 * Get theme colors for the activity graph.
 */
function getGraphColors(theme: string): Colors {
  const themeColors = getTheme(theme);

  return {
    areaColor: themeColors.title_color,
    bgColor: themeColors.bg_color,
    borderColor: themeColors.border_color,
    color: themeColors.text_color,
    titleColor: themeColors.title_color,
    lineColor: themeColors.title_color,
    pointColor: themeColors.title_color,
  };
}

/**
 * Calculate min and max values for the Y axis.
 */
function getYAxisRange(
  values: number[]
): { min: number; max: number; step: number } {
  const min = 0;
  const max = Math.max(...values, 1);
  const range = max - min;
  const step = Math.ceil(range / 5) || 1;
  const adjustedMax = Math.ceil(max / step) * step;

  return { min, max: adjustedMax, step };
}

/**
 * Create SVG path for the line chart.
 */
function createLinePath(
  data: ContributionDay[],
  chartWidth: number,
  chartHeight: number,
  yRange: { min: number; max: number }
): string {
  if (data.length === 0) return "";

  const xStep = chartWidth / Math.max(data.length - 1, 1);
  const yScale = chartHeight / (yRange.max - yRange.min || 1);

  const points = data.map((day, index) => {
    const x = index * xStep;
    const y = chartHeight - (day.contributionCount - yRange.min) * yScale;
    return { x, y };
  });

  // Create smooth path using cubic bezier curves
  let path = `M ${points[0].x} ${points[0].y}`;

  for (let i = 1; i < points.length; i++) {
    const prev = points[i - 1];
    const curr = points[i];
    const tension = 0.3;

    const cp1x = prev.x + (curr.x - prev.x) * tension;
    const cp1y = prev.y;
    const cp2x = curr.x - (curr.x - prev.x) * tension;
    const cp2y = curr.y;

    path += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
  }

  return path;
}

/**
 * Create SVG path for the area under the line.
 */
function createAreaPath(
  linePath: string,
  chartWidth: number,
  chartHeight: number,
  dataLength: number
): string {
  if (!linePath) return "";

  return `${linePath} L ${chartWidth} ${chartHeight} L 0 ${chartHeight} Z`;
}

/**
 * Create point elements for the chart.
 */
function createPoints(
  data: ContributionDay[],
  chartWidth: number,
  chartHeight: number,
  yRange: { min: number; max: number },
  pointColor: string,
  disableAnimations: boolean
): string {
  if (data.length === 0) return "";

  const xStep = chartWidth / Math.max(data.length - 1, 1);
  const yScale = chartHeight / (yRange.max - yRange.min || 1);

  // Only show a subset of points to avoid clutter
  const pointInterval = Math.max(1, Math.floor(data.length / 15));

  return data
    .map((day, index) => {
      if (index % pointInterval !== 0 && index !== data.length - 1) {
        return "";
      }

      const x = index * xStep;
      const y = chartHeight - (day.contributionCount - yRange.min) * yScale;
      const delay = disableAnimations ? 0 : (index / data.length) * 2000;

      return `
        <circle
          class="ct-point"
          cx="${x}"
          cy="${y}"
          r="4"
          fill="#${pointColor}"
          style="animation-delay: ${delay}ms"
        />
      `;
    })
    .join("");
}

/**
 * Create Y-axis labels.
 */
function createYAxisLabels(
  yRange: { min: number; max: number; step: number },
  chartHeight: number,
  color: string
): string {
  const labels: string[] = [];
  const numLabels = Math.min(6, Math.ceil((yRange.max - yRange.min) / yRange.step) + 1);

  for (let i = 0; i < numLabels; i++) {
    const value = yRange.min + i * yRange.step;
    const y = chartHeight - (i * yRange.step * chartHeight) / (yRange.max - yRange.min || 1);

    labels.push(`
      <text x="-10" y="${y + 4}" text-anchor="end" class="ct-label" fill="#${color}">${value}</text>
      <line x1="0" y1="${y}" x2="100%" y2="${y}" class="ct-grid" stroke="#${color}" stroke-opacity="0.3" stroke-dasharray="2"/>
    `);
  }

  return labels.join("");
}

/**
 * Create X-axis labels (dates).
 */
function createXAxisLabels(
  data: ContributionDay[],
  chartWidth: number,
  chartHeight: number,
  color: string
): string {
  if (data.length === 0) return "";

  const xStep = chartWidth / Math.max(data.length - 1, 1);
  const labelInterval = Math.max(1, Math.floor(data.length / 7));

  return data
    .map((day, index) => {
      if (index % labelInterval !== 0 && index !== data.length - 1) {
        return "";
      }

      const x = index * xStep;
      const date = new Date(day.date);
      const label = `${date.getMonth() + 1}/${date.getDate()}`;

      return `
        <text x="${x}" y="${chartHeight + 20}" text-anchor="middle" class="ct-label" fill="#${color}">${label}</text>
      `;
    })
    .join("");
}

/**
 * Get CSS styles for the graph.
 */
function getGraphStyles(colors: Colors, disableAnimations: boolean): string {
  const animationDisabler = disableAnimations
    ? `* { animation-duration: 0s !important; animation-delay: 0s !important; }`
    : "";

  return `
    ${animationDisabler}
    .ct-label {
      fill: #${colors.color};
      font-size: 11px;
      font-family: 'Segoe UI', Ubuntu, Sans-Serif;
    }
    .ct-grid {
      stroke: #${colors.color};
      stroke-width: 1px;
      stroke-opacity: 0.3;
      stroke-dasharray: 2px;
    }
    .ct-line {
      fill: none;
      stroke: #${colors.lineColor};
      stroke-width: 3px;
      stroke-linecap: round;
      stroke-dasharray: 5000;
      stroke-dashoffset: 5000;
      animation: dash 3s ease-in-out forwards;
    }
    .ct-area {
      fill: #${colors.areaColor};
      fill-opacity: 0.1;
      stroke: none;
    }
    .ct-point {
      opacity: 0;
      animation: pointFadeIn 0.3s ease-in-out forwards;
    }
    @keyframes dash {
      to {
        stroke-dashoffset: 0;
      }
    }
    @keyframes pointFadeIn {
      from {
        opacity: 0;
        transform: scale(0);
      }
      to {
        opacity: 1;
        transform: scale(1);
      }
    }
    .header {
      font: 600 20px 'Segoe UI', Ubuntu, Sans-Serif;
      fill: #${colors.titleColor};
    }
  `;
}

/**
 * Renders the GitHub activity graph card.
 * 
 * This is a pure SVG implementation that doesn't require node-chartist.
 * For complex charting needs, consider using the vendor's implementation.
 */
export async function renderActivityGraph(
  data: ContributionData,
  options: GraphCardOptions = {}
): Promise<string> {
  const {
    theme = "github_dark",
    width = 900,
    height = 400,
    area = true,
    radius = 6,
    hide_border = false,
    custom_title,
    disable_animations = false,
  } = options;

  const colors = getGraphColors(theme);

  // Chart dimensions (accounting for padding)
  const padding = {
    top: 80,
    right: 30,
    bottom: 50,
    left: 60,
  };

  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Calculate Y-axis range
  const values = data.contributions.map((d) => d.contributionCount);
  const yRange = getYAxisRange(values);

  // Create chart elements
  const linePath = createLinePath(
    data.contributions,
    chartWidth,
    chartHeight,
    yRange
  );

  const areaPathD = area
    ? createAreaPath(linePath, chartWidth, chartHeight, data.contributions.length)
    : "";

  const points = createPoints(
    data.contributions,
    chartWidth,
    chartHeight,
    yRange,
    colors.pointColor,
    disable_animations
  );

  const yAxisLabels = createYAxisLabels(yRange, chartHeight, colors.color);
  const xAxisLabels = createXAxisLabels(
    data.contributions,
    chartWidth,
    chartHeight,
    colors.color
  );

  const styles = getGraphStyles(colors, disable_animations);
  const title = custom_title || `${data.name}'s Contribution Graph`;

  // Border style
  const borderStyle = hide_border
    ? ""
    : `stroke="#${colors.borderColor}" stroke-width="1"`;

  return `
<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>${styles}</style>
  
  <rect x="0.5" y="0.5" rx="${radius}" width="${width - 1}" height="${height - 1}" fill="#${colors.bgColor}" ${borderStyle}/>
  
  <!-- Title -->
  <text x="${width / 2}" y="40" text-anchor="middle" class="header">${title}</text>
  
  <!-- Chart Area -->
  <g transform="translate(${padding.left}, ${padding.top})">
    <!-- Y-axis labels and grid -->
    ${yAxisLabels}
    
    <!-- Area fill -->
    ${area ? `<path class="ct-area" d="${areaPathD}"/>` : ""}
    
    <!-- Line -->
    <path class="ct-line" d="${linePath}"/>
    
    <!-- Points -->
    ${points}
    
    <!-- X-axis labels -->
    ${xAxisLabels}
  </g>
</svg>`.trim();
}

export default renderActivityGraph;
