/**
 * Top Languages API Endpoint
 * GET /api/top-langs?username=bkataru
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchTopLanguages } from "../src/fetchers/languages.js";
import { renderTopLanguages } from "../src/cards/TopLanguagesCard.js";
import { setCacheHeaders, setErrorCacheHeaders, CACHE_TTL } from "../src/common/cache.js";
import { parseArray, parseBoolean } from "../src/common/fmt.js";

const DEFAULT_USERNAME = "bkataru";

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Set content type for SVG
  res.setHeader("Content-Type", "image/svg+xml");

  try {
    // Parse query parameters
    const username = (req.query.username as string) || DEFAULT_USERNAME;
    const theme = req.query.theme as string | undefined;
    const hideBorder = parseBoolean(req.query.hide_border as string) ?? false;
    const cardWidth = req.query.card_width
      ? parseInt(req.query.card_width as string, 10)
      : undefined;
    const layout = (req.query.layout as string) || "donut";
    const langsCount = req.query.langs_count
      ? parseInt(req.query.langs_count as string, 10)
      : undefined; // Let the card use its layout-specific default
    const hide = parseArray(req.query.hide as string) ?? [];
    const excludeRepo = parseArray(req.query.exclude_repo as string) ?? [];

    // Validate layout
    const validLayouts = ["normal", "compact", "donut", "donut-vertical", "pie"];
    const selectedLayout = validLayouts.includes(layout) ? layout : "donut";

    // Fetch top languages
    const langResult = await fetchTopLanguages(username, excludeRepo);

    // Render the card
    const svg = renderTopLanguages(langResult.languages, {
      theme,
      hide_border: hideBorder,
      card_width: cardWidth,
      layout: selectedLayout as "normal" | "compact" | "donut" | "donut-vertical" | "pie",
      langs_count: langsCount,
      hide,
      total_size: langResult.totalSize,
      total_repos: langResult.totalRepos,
      total_languages: langResult.totalLanguages,
    });

    // Set cache headers
    setCacheHeaders(res, CACHE_TTL.LANGS);

    res.status(200).send(svg);
  } catch (error) {
    setErrorCacheHeaders(res);

    const message =
      error instanceof Error ? error.message : "An unknown error occurred";

    // Return error SVG
    const errorSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="300" height="120" viewBox="0 0 300 120">
        <rect x="0.5" y="0.5" width="299" height="119" rx="4.5" fill="#0d1117" stroke="#30363d"/>
        <text x="25" y="40" fill="#f85149" font-family="Segoe UI, Ubuntu, sans-serif" font-size="14" font-weight="600">Error</text>
        <text x="25" y="70" fill="#c9d1d9" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12">${message}</text>
      </svg>
    `;

    res.status(200).send(errorSvg);
  }
}
