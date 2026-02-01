/**
 * Activity Graph API Endpoint
 * GET /api/activity-graph?username=bkataru
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchContributions } from "../src/fetchers/contributions.js";
import { renderActivityGraph } from "../src/cards/GraphCard.js";
import { setCacheHeaders, setErrorCacheHeaders, CACHE_TTL } from "../src/common/cache.js";
import { parseBoolean } from "../src/common/fmt.js";

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
    const days = req.query.days ? parseInt(req.query.days as string, 10) : 31;
    const area = parseBoolean(req.query.area as string) ?? true;
    const width = req.query.width ? parseInt(req.query.width as string, 10) : 930;
    const height = req.query.height ? parseInt(req.query.height as string, 10) : 300;
    const radius = req.query.radius ? parseInt(req.query.radius as string, 10) : 5;

    // Clamp days to reasonable range
    const clampedDays = Math.max(7, Math.min(365, days));

    // Fetch contribution data
    const contributionData = await fetchContributions(username, clampedDays);

    // Render the activity graph
    const svg = await renderActivityGraph(contributionData, {
      theme,
      width,
      height,
      area,
      radius,
    });

    // Set cache headers
    setCacheHeaders(res, CACHE_TTL.GRAPH);

    res.status(200).send(svg);
  } catch (error) {
    setErrorCacheHeaders(res);

    const message =
      error instanceof Error ? error.message : "An unknown error occurred";

    // Return error SVG
    const errorSvg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="930" height="120" viewBox="0 0 930 120">
        <rect x="0.5" y="0.5" width="929" height="119" rx="4.5" fill="#0d1117" stroke="#30363d"/>
        <text x="25" y="40" fill="#f85149" font-family="Segoe UI, Ubuntu, sans-serif" font-size="14" font-weight="600">Error</text>
        <text x="25" y="70" fill="#c9d1d9" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12">${message}</text>
      </svg>
    `;

    res.status(200).send(errorSvg);
  }
}
