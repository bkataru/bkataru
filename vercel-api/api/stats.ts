/**
 * GitHub Stats API Endpoint
 * GET /api/stats?username=bkataru
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchStats } from "../src/fetchers/stats.js";
import { renderStatsCard } from "../src/cards/StatsCard.js";
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
    const showIcons = parseBoolean(req.query.show_icons as string) ?? true;
    const hideBorder = parseBoolean(req.query.hide_border as string) ?? false;
    const hideRank = parseBoolean(req.query.hide_rank as string) ?? false;
    const cardWidth = req.query.card_width
      ? parseInt(req.query.card_width as string, 10)
      : undefined;
    const includeAllCommits =
      parseBoolean(req.query.include_all_commits as string) ?? true;
    const show = parseArray(req.query.show as string) ?? [
      "reviews",
      "prs_merged",
      "prs_merged_percentage",
    ];

    // Fetch GitHub stats
    const stats = await fetchStats(username);

    // Render the card
    const svg = renderStatsCard(stats, {
      theme,
      show_icons: showIcons,
      hide_border: hideBorder,
      hide_rank: hideRank,
      card_width: cardWidth,
      include_all_commits: includeAllCommits,
      show,
    });

    // Set cache headers
    setCacheHeaders(res, CACHE_TTL.STATS);

    res.status(200).send(svg);
  } catch (error) {
    setErrorCacheHeaders(res);

    const message =
      error instanceof Error ? error.message : "An unknown error occurred";

    // Return error SVG
    const errorSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="495" height="120" viewBox="0 0 495 120">
        <rect x="0.5" y="0.5" width="494" height="119" rx="4.5" fill="#0d1117" stroke="#30363d"/>
        <text x="25" y="40" fill="#f85149" font-family="Segoe UI, Ubuntu, sans-serif" font-size="14" font-weight="600">Error</text>
        <text x="25" y="70" fill="#c9d1d9" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12">${message}</text>
      </svg>
    `;

    res.status(200).send(errorSvg);
  }
}
