/**
 * GitHub Streak API Endpoint
 * GET /api/streak?username=bkataru
 */
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { fetchContributionCalendar } from "../src/fetchers/contributions.js";
import { renderStreakCard, calculateStreaks } from "../src/cards/StreakCard.js";
import { setCacheHeaders, setErrorCacheHeaders, CACHE_TTL } from "../src/common/cache.js";

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
    const cardWidth = req.query.card_width
      ? parseInt(req.query.card_width as string, 10)
      : undefined;

    // Fetch contribution calendar data
    const calendarData = await fetchContributionCalendar(username);

    // Calculate streak statistics
    const streakData = calculateStreaks(
      calendarData.contributions,
      calendarData.totalContributions
    );

    // Render the card
    const svg = renderStreakCard(streakData, {
      theme,
      card_width: cardWidth,
    });

    // Set cache headers (shorter TTL for streak - time sensitive)
    setCacheHeaders(res, CACHE_TTL.STREAK);

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
