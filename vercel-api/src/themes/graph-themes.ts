/**
 * Graph-specific theme definitions for the activity graph card.
 * Colors are hex values WITHOUT the # prefix.
 */

export interface GraphTheme {
  areaColor: string;
  bgColor: string;
  borderColor: string;
  color: string;       // text color
  lineColor: string;
  pointColor: string;
  titleColor: string;
}

/**
 * Graph themes matching our curated theme list.
 * All color values are hex WITHOUT the # prefix.
 */
export const graphThemes: Record<string, GraphTheme> = {
  github_dark: {
    areaColor: "1F6FEB",
    bgColor: "0D1117",
    borderColor: "30363d",
    color: "58A6FF",
    lineColor: "1F6FEB",
    pointColor: "58A6FF",
    titleColor: "58A6FF",
  },
  github_light: {
    areaColor: "9be9a8",
    bgColor: "ffffff",
    borderColor: "e1e4e8",
    color: "24292e",
    lineColor: "9be9a8",
    pointColor: "40c463",
    titleColor: "0366d6",
  },
  dracula: {
    areaColor: "ff79c6",
    bgColor: "282a36",
    borderColor: "44475a",
    color: "f8f8f2",
    lineColor: "ff79c6",
    pointColor: "bd93f9",
    titleColor: "f8f8f2",
  },
  nord: {
    areaColor: "88c0d0",
    bgColor: "2e3440",
    borderColor: "4c566a",
    color: "88c0d0",
    lineColor: "88c0d0",
    pointColor: "ffffff",
    titleColor: "88c0d0",
  },
  tokyo_night: {
    areaColor: "70a5fd",
    bgColor: "1a1b27",
    borderColor: "414868",
    color: "70a5fd",
    lineColor: "70a5fd",
    pointColor: "a9b1d6",
    titleColor: "70a5fd",
  },
  gruvbox: {
    areaColor: "d8a657",
    bgColor: "282828",
    borderColor: "3c3836",
    color: "d4be98",
    lineColor: "d8a657",
    pointColor: "e78a4e",
    titleColor: "d4be98",
  },
  one_dark: {
    areaColor: "e5c17c",
    bgColor: "282C34",
    borderColor: "3e4451",
    color: "abb2bf",
    lineColor: "e5c17c",
    pointColor: "e06c75",
    titleColor: "abb2bf",
  },
  monokai: {
    areaColor: "ff6188",
    bgColor: "272822",
    borderColor: "3e3d32",
    color: "fcfcfa",
    lineColor: "ff6188",
    pointColor: "ffd866",
    titleColor: "fcfcfa",
  },
  cobalt: {
    areaColor: "d19a66",
    bgColor: "193549",
    borderColor: "1f4662",
    color: "d19a66",
    lineColor: "d19a66",
    pointColor: "e7e7e7",
    titleColor: "d19a66",
  },
  synthwave_84: {
    areaColor: "3A2442",
    bgColor: "2C223B",
    borderColor: "3b2d4d",
    color: "FF3CA2",
    lineColor: "F7F645",
    pointColor: "22E5F4",
    titleColor: "FF3CA2",
  },
  catppuccin_mocha: {
    areaColor: "94e2d5",
    bgColor: "1e1e2e",
    borderColor: "313244",
    color: "cdd6f4",
    lineColor: "94e2d5",
    pointColor: "cba6f7",
    titleColor: "94e2d5",
  },
  radical: {
    areaColor: "fe428e",
    bgColor: "141321",
    borderColor: "1e1c2e",
    color: "a9fef7",
    lineColor: "fe428e",
    pointColor: "f8d847",
    titleColor: "a9fef7",
  },
};

/** Default graph theme name */
export const DEFAULT_GRAPH_THEME = "github_dark";

/**
 * Get graph theme by name. Returns github_dark if not found.
 */
export function getGraphTheme(name?: string): GraphTheme {
  if (!name) {
    return graphThemes[DEFAULT_GRAPH_THEME];
  }

  // Normalize theme name: lowercase, replace hyphens with underscores
  const normalized = name.toLowerCase().replace(/-/g, "_");

  return graphThemes[normalized] ?? graphThemes[DEFAULT_GRAPH_THEME];
}

/**
 * Get list of available graph theme names.
 */
export function getAvailableGraphThemes(): string[] {
  return Object.keys(graphThemes);
}
