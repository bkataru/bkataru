/**
 * Unified theme system for GitHub profile widgets.
 * Colors are hex values WITHOUT the # prefix.
 */

export interface Theme {
  title_color: string;
  text_color: string;
  icon_color: string;
  bg_color: string;
  border_color: string;
  ring_color?: string;
}

/**
 * Curated subset of themes from github-readme-stats.
 * All color values are hex WITHOUT the # prefix.
 */
export const themes: Record<string, Theme> = {
  github_dark: {
    title_color: "58a6ff",
    text_color: "c9d1d9",
    icon_color: "58a6ff",
    bg_color: "0d1117",
    border_color: "30363d",
    ring_color: "58a6ff",
  },
  github_light: {
    title_color: "0366d6",
    text_color: "24292e",
    icon_color: "0366d6",
    bg_color: "ffffff",
    border_color: "e1e4e8",
    ring_color: "0366d6",
  },
  dracula: {
    title_color: "ff6e96",
    text_color: "f8f8f2",
    icon_color: "79dafa",
    bg_color: "282a36",
    border_color: "44475a",
    ring_color: "ff6e96",
  },
  nord: {
    title_color: "81a1c1",
    text_color: "d8dee9",
    icon_color: "88c0d0",
    bg_color: "2e3440",
    border_color: "4c566a",
    ring_color: "81a1c1",
  },
  tokyo_night: {
    title_color: "70a5fd",
    text_color: "38bdae",
    icon_color: "bf91f3",
    bg_color: "1a1b27",
    border_color: "414868",
    ring_color: "70a5fd",
  },
  gruvbox: {
    title_color: "fabd2f",
    text_color: "8ec07c",
    icon_color: "fe8019",
    bg_color: "282828",
    border_color: "3c3836",
    ring_color: "fabd2f",
  },
  one_dark: {
    title_color: "e4bf7a",
    text_color: "df6d74",
    icon_color: "8eb573",
    bg_color: "282c34",
    border_color: "3e4451",
    ring_color: "e4bf7a",
  },
  monokai: {
    title_color: "eb1f6a",
    text_color: "f1f1eb",
    icon_color: "e28905",
    bg_color: "272822",
    border_color: "3e3d32",
    ring_color: "eb1f6a",
  },
  cobalt: {
    title_color: "e683d9",
    text_color: "75eeb2",
    icon_color: "0480ef",
    bg_color: "193549",
    border_color: "1f4662",
    ring_color: "e683d9",
  },
  synthwave_84: {
    title_color: "e2e9ec",
    text_color: "e5289e",
    icon_color: "ef8539",
    bg_color: "2b213a",
    border_color: "3b2d4d",
    ring_color: "e2e9ec",
  },
  catppuccin_mocha: {
    title_color: "94e2d5",
    text_color: "cdd6f4",
    icon_color: "cba6f7",
    bg_color: "1e1e2e",
    border_color: "313244",
    ring_color: "94e2d5",
  },
  radical: {
    title_color: "fe428e",
    text_color: "a9fef7",
    icon_color: "f8d847",
    bg_color: "141321",
    border_color: "1e1c2e",
    ring_color: "fe428e",
  },
};

/** Default theme name */
export const DEFAULT_THEME = "github_dark";

/**
 * Get theme by name. Returns github_dark if not found.
 */
export function getTheme(name?: string): Theme {
  if (!name) {
    return themes[DEFAULT_THEME];
  }

  // Normalize theme name: lowercase, replace hyphens with underscores
  const normalized = name.toLowerCase().replace(/-/g, "_");

  return themes[normalized] ?? themes[DEFAULT_THEME];
}

/**
 * Alias for getTheme for backward compatibility.
 */
export function getThemeColors(name?: string): Theme {
  return getTheme(name);
}

/**
 * Get list of available theme names.
 */
export function getAvailableThemes(): string[] {
  return Object.keys(themes);
}
