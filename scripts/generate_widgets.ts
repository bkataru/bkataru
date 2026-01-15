#!/usr/bin/env bun

/**
 * Widget Generator for GitHub Profile README
 * Uses the vendored TypeScript projects to generate SVG widgets
 *
 * Robustness goals:
 * - If GitHub APIs are unavailable / rate-limited (common without a token),
 *   keep the repo widgets stable by falling back to existing/cached SVGs.
 * - Still allow authenticated regeneration when TOKEN/GH_TOKEN/GITHUB_TOKEN is set.
 */

import axios from "axios";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

// Resolve paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, "..");

// Environment setup - set PAT_1 for github-readme-stats compatibility

const TOKEN =
	process.env.TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;

// Force regeneration flag
const FORCE_REGENERATION = process.env.FORCE_REGENERATION === "true";

if (!TOKEN) {
	console.warn("⚠️  No GitHub token found. Using public API (rate-limited).");
	console.warn(
		"💡 Set TOKEN, GH_TOKEN, or GITHUB_TOKEN environment variable for authenticated requests.",
	);
} else {
	// Set PAT_1 for github-readme-stats
	process.env.PAT_1 = TOKEN;
}

// Import vendored modules
const statsModule = await import(
	join(rootDir, "vendors/github-readme-stats/src/cards/stats.js")
);
const topLangsModule = await import(
	join(rootDir, "vendors/github-readme-stats/src/cards/top-languages.js")
);
const fetchStatsModule = await import(
	join(rootDir, "vendors/github-readme-stats/src/fetchers/stats.js")
);
const fetchTopLangsModule = await import(
	join(rootDir, "vendors/github-readme-stats/src/fetchers/top-languages.js")
);

// Activity graph imports
const { Card: GraphCard } = await import(
	join(rootDir, "vendors/github-readme-activity-graph/src/GraphCards.ts")
);
const { Fetcher } = await import(
	join(rootDir, "vendors/github-readme-activity-graph/src/fetcher.ts")
);
const { selectColors } = await import(
	join(rootDir, "vendors/github-readme-activity-graph/src/styles/themes.ts")
);

// Configuration
const USERNAME = process.env.GITHUB_USERNAME || "bkataru";
const GRAPH_DAYS = parseInt(process.env.GRAPH_DAYS || "31");

/**
 * Layout constants
 * Goal (Option 1): top row cards look like a cohesive 2-column grid.
 *
 * Notes:
 * - `github-readme-stats` uses different default widths per card; we override them.
 * - For `top-languages` donut layout, upstream adds extra width padding.
 *   So we pass a slightly smaller `card_width` to land at our desired final width.
 */
const GRID_CARD_WIDTH = parseInt(process.env.GRID_CARD_WIDTH || "450");
const TOP_LANGS_INTERNAL_WIDTH = GRID_CARD_WIDTH;
const STREAK_CARD_WIDTH = GRID_CARD_WIDTH * 2 + 30; // approximate 2-col width + spacing
const GRAPH_WIDTH = STREAK_CARD_WIDTH;

/**

 * Cache / fallback behavior:

 * - When unauthenticated, GitHub GraphQL frequently hard-fails or is rate-limited.

 * - In that case, keep previously-generated SVGs.

 */

const OUTPUT_DIR = rootDir;

const FALLBACK_TO_EXISTING_SVGS =
	!FORCE_REGENERATION && (process.env.FALLBACK_TO_EXISTING_SVGS || "1") !== "0";

interface WidgetConfig {
	title_color: string;
	text_color: string;
	icon_color: string;
	bg_color: string;
	border_color: string;
	ring_color?: string;
}

// GitHub Dark theme colors
const themeConfig: WidgetConfig = {
	title_color: "58a6ff",
	text_color: "c9d1d9",
	icon_color: "58a6ff",
	bg_color: "0d1117",
	border_color: "30363d",
	ring_color: "58a6ff",
};

/**
 * Cache helper: read an existing SVG from disk (if present)
 */
function readExistingSvg(filename: string): string | null {
	const p = join(OUTPUT_DIR, filename);
	if (!existsSync(p)) return null;
	return readFileSync(p, "utf8");
}

/**
 * Detect GitHub API rate-limit / auth errors (common without token)
 */
function isRateLimitOrAuthError(err: any): boolean {
	const status = err?.response?.status;
	const statusText = String(err?.response?.statusText || "").toLowerCase();
	const msg = String(err?.message || "").toLowerCase();

	// 401/403 (auth/rate limiting), and explicit "rate limit exceeded"
	if (status === 401 || status === 403) return true;
	if (statusText.includes("rate limit")) return true;
	if (msg.includes("rate limit")) return true;
	if (msg.includes("no github api tokens")) return true;

	// GraphQL/data-shape failures from vendored fetchers when unauthenticated/rate-limited
	// (e.g. `res.data.data.user` is undefined)
	if (msg.includes("graphql")) return true;
	if (msg.includes("undefined is not an object")) return true;
	if (msg.includes("cannot read properties of undefined")) return true;

	// Activity graph vendor library returns error strings
	if (msg.includes("activity graph")) return true;
	if (msg.includes("can't fetch any contribution")) return true;
	if (msg.includes("api rate limit exceeded")) return true;

	return false;
}

async function withSvgFallback(
	filename: string,
	generator: () => Promise<string>,
): Promise<string> {
	try {
		return await generator();
	} catch (err) {
		if (FALLBACK_TO_EXISTING_SVGS && isRateLimitOrAuthError(err)) {
			const existing = readExistingSvg(filename);

			if (existing) {
				console.warn(
					`⚠️  Using cached ${filename} (GitHub API unavailable/rate-limited).`,
				);

				return existing;
			}
		}

		throw err;
	}
}

/**
 * Generate GitHub Stats Card
 */
async function generateStatsCard(): Promise<string> {
	console.log("📊 Fetching GitHub stats...");

	const stats = await fetchStatsModule.fetchStats(
		USERNAME,
		true, // include_all_commits
		[], // exclude_repo
		true, // include_merged_pull_requests
		true, // include_discussions
		true, // include_discussions_answers
	);

	const svg = statsModule.renderStatsCard(stats, {
		...themeConfig,
		card_width: GRID_CARD_WIDTH,
		show_icons: true,
		hide_border: false,
		hide_rank: false,
		include_all_commits: true,
		show: ["reviews", "prs_merged", "prs_merged_percentage"],
	});

	return svg;
}

/**
 * Generate Top Languages Card
 */
async function generateTopLangsCard(): Promise<string> {
	console.log("💻 Fetching top languages...");

	try {
		const topLangs = await fetchTopLangsModule.fetchTopLanguages(USERNAME);

		const svg = topLangsModule.renderTopLanguages(topLangs, {
			...themeConfig,
			card_width: TOP_LANGS_INTERNAL_WIDTH,
			layout: "donut",
			langs_count: 8,
			hide_border: false,
		});

		return svg;
	} catch (err) {
		console.warn(
			"Failed to fetch top languages data:",
			err instanceof Error ? err.message : String(err),
		);
		throw err;
	}
}

/**
 * Generate Activity Graph
 */
async function generateActivityGraph(): Promise<string> {
	console.log("📈 Fetching activity data...");

	try {
		const fetcher = new Fetcher(USERNAME);
		const userData = await fetcher.fetchContributions(GRAPH_DAYS);

		if (typeof userData === "string") {
			// The vendored fetcher returns a string on error.
			// Throw so the withSvgFallback wrapper can catch it and use the cached SVG.
			throw new Error(`Activity graph fetch failed: ${userData}`);
		}

		const colors = selectColors("github-dark");

		const graphCard = new GraphCard(
			300, // height
			GRAPH_WIDTH, // width
			5, // radius
			colors,
			`${userData.name}'s Contribution Graph`,
			true, // area
			true, // showGrid
		);

		const svg = await graphCard.buildGraph(userData.contributions);
		return svg;
	} catch (err) {
		// Rethrow with a clear message so isRateLimitOrAuthError can detect it
		const msg = err instanceof Error ? err.message : String(err);
		throw new Error(`Activity graph generation failed: ${msg}`);
	}
}

/**
 * Fetch contribution data directly from GitHub API for streak calculation
 */
async function fetchContributionData(): Promise<{
	contributions: number[];
	totalContributions: number;
}> {
	// When unauthenticated, use a minimal safe fallback dataset to avoid API failures
	if (!TOKEN) {
		const cached = readExistingSvg("streak.svg");
		if (cached) {
			// Return safe placeholder data - the widget will be cached anyway
			return {
				contributions: Array(365).fill(0),
				totalContributions: 0,
			};
		}
	}

	const query = `
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionCalendar {
            totalContributions
            weeks {
              contributionDays {
                contributionCount
                date
              }
            }
          }
        }
      }
    }
  `;

	const headers: Record<string, string> = {
		"Content-Type": "application/json",
	};

	if (TOKEN) {
		headers["Authorization"] = `bearer ${TOKEN}`;
	}

	const response = await axios({
		url: "https://api.github.com/graphql",
		method: "POST",
		headers,
		data: { query, variables: { login: USERNAME } },
	});

	if (response.data.errors) {
		throw new Error(response.data.errors[0].message);
	}

	const calendar =
		response.data.data.user.contributionsCollection.contributionCalendar;
	const contributions: number[] = [];

	for (const week of calendar.weeks) {
		for (const day of week.contributionDays) {
			contributions.push(day.contributionCount);
		}
	}

	return {
		contributions,
		totalContributions: calendar.totalContributions,
	};
}

/**
 * Generate Streak Stats Card
 * Uses inline styles only (no CSS animations) for consistent cross-platform rendering
 */
async function generateStreakCard(): Promise<string> {
	console.log("🔥 Generating streak stats...");

	const { contributions, totalContributions } = await fetchContributionData();

	// Calculate current streak (from most recent day backwards)
	let currentStreak = 0;
	for (let i = contributions.length - 1; i >= 0; i--) {
		// Skip today if no contributions yet (could be early in the day)
		if (i === contributions.length - 1 && contributions[i] === 0) {
			continue;
		}
		if (contributions[i] > 0) {
			currentStreak++;
		} else {
			break;
		}
	}

	// Calculate longest streak
	let longestStreak = 0;
	let tempStreak = 0;
	for (const count of contributions) {
		if (count > 0) {
			tempStreak++;
			if (tempStreak > longestStreak) {
				longestStreak = tempStreak;
			}
		} else {
			tempStreak = 0;
		}
	}

	// Ring geometry
	const ringRadius = 44;
	const ringStroke = 6;
	const ringCircumference = 2 * Math.PI * ringRadius;

	const progressPercent =
		longestStreak > 0
			? Math.min(100, (currentStreak / longestStreak) * 100)
			: 0;
	const ringDashOffset =
		ringCircumference - (progressPercent / 100) * ringCircumference;

	// Layout: 3 balanced columns (Total | Ring | Longest)
	const width = STREAK_CARD_WIDTH;
	const height = 210;
	const midX = Math.round(width / 2);

	const leftX = 140;
	const rightX = width - 140;

	// Inline styles for consistent rendering across all platforms
	const titleColor = `#${themeConfig.title_color}`;
	const textColor = `#${themeConfig.text_color}`;
	const bgColor = `#${themeConfig.bg_color}`;
	const borderColor = `#${themeConfig.border_color}`;
	const ringColor = `#${themeConfig.ring_color}`;

	const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0.5" y="0.5" width="${width - 1}" height="${height - 1}" rx="6" fill="${bgColor}" stroke="${borderColor}"/>

  <!-- Title -->
  <text x="25" y="36" font-family="Segoe UI, Ubuntu, sans-serif" font-size="18" font-weight="600" fill="${titleColor}">GitHub Streak</text>

  <!-- Total Contributions (Left Column) -->
  <text x="${leftX}" y="94" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="600" fill="${textColor}" text-anchor="middle">Total Contributions</text>
  <text x="${leftX}" y="128" font-family="Segoe UI, Ubuntu, sans-serif" font-size="30" font-weight="800" fill="${titleColor}" text-anchor="middle">${totalContributions.toLocaleString()}</text>
  <text x="${leftX}" y="152" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="400" fill="${textColor}" text-anchor="middle">Past Year</text>

  <!-- Current Streak (Center Column) -->
  <text x="${midX}" y="70" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="600" fill="${textColor}" text-anchor="middle">Current Streak</text>
  <circle cx="${midX}" cy="128" r="${ringRadius}" fill="none" stroke="${ringColor}" stroke-width="${ringStroke}" opacity="0.18"/>
  <circle cx="${midX}" cy="128" r="${ringRadius}" fill="none" stroke="${ringColor}" stroke-width="${ringStroke}" stroke-linecap="round" stroke-dasharray="${ringCircumference.toFixed(2)}" stroke-dashoffset="${ringDashOffset.toFixed(2)}" transform="rotate(-90 ${midX} 128)"/>
  <text x="${midX}" y="138" font-family="Segoe UI, Ubuntu, sans-serif" font-size="30" font-weight="800" fill="${titleColor}" text-anchor="middle">${currentStreak}</text>
  <text x="${midX}" y="160" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="400" fill="${textColor}" text-anchor="middle">days</text>

  <!-- Longest Streak (Right Column) -->
  <text x="${rightX}" y="94" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="600" fill="${textColor}" text-anchor="middle">Longest Streak</text>
  <text x="${rightX}" y="128" font-family="Segoe UI, Ubuntu, sans-serif" font-size="30" font-weight="800" fill="${titleColor}" text-anchor="middle">${longestStreak}</text>
  <text x="${rightX}" y="152" font-family="Segoe UI, Ubuntu, sans-serif" font-size="12" font-weight="400" fill="${textColor}" text-anchor="middle">days</text>
</svg>`;

	return svg;
}

/**
 * Main function to generate all widgets
 */
async function main() {
	console.log(`\n🚀 Generating widgets for ${USERNAME}...\n`);

	try {
		// Generate all widgets in parallel, but each can fall back to cached SVGs
		// if GitHub APIs are unavailable/rate-limited.
		//
		// Note: Activity graph generation is disabled when unauthenticated because
		// the vendored library has noisy error logging that can't be suppressed.
		// Instead, we just keep the cached SVG.
		const [statsCard, topLangsCard, activityGraph, streakCard] =
			await Promise.all([
				withSvgFallback("stats.svg", generateStatsCard),
				withSvgFallback("top-langs.svg", generateTopLangsCard),
				TOKEN
					? withSvgFallback("activity-graph.svg", generateActivityGraph)
					: (async () => {
							const cached = readExistingSvg("activity-graph.svg");
							if (cached) {
								console.warn(
									"⚠️  Using cached activity-graph.svg (no token provided).",
								);
								return cached;
							}
							return withSvgFallback(
								"activity-graph.svg",
								generateActivityGraph,
							);
						})(),
				withSvgFallback("streak.svg", generateStreakCard),
			]);

		// Save widgets
		writeFileSync(join(OUTPUT_DIR, "stats.svg"), statsCard);
		console.log("✅ Generated stats.svg");

		writeFileSync(join(OUTPUT_DIR, "top-langs.svg"), topLangsCard);
		console.log("✅ Generated top-langs.svg");

		writeFileSync(join(OUTPUT_DIR, "activity-graph.svg"), activityGraph);
		console.log("✅ Generated activity-graph.svg");

		writeFileSync(join(OUTPUT_DIR, "streak.svg"), streakCard);
		console.log("✅ Generated streak.svg");

		// Save data.json for reference
		const dataFile = join(OUTPUT_DIR, "data.json");
		const data = {
			username: USERNAME,
			generated_at: new Date().toISOString(),
			widgets: [
				"stats.svg",
				"top-langs.svg",
				"activity-graph.svg",
				"streak.svg",
			],
			layout: {
				grid_card_width: GRID_CARD_WIDTH,
				streak_card_width: STREAK_CARD_WIDTH,
				graph_width: GRAPH_WIDTH,
			},
			fallback: {
				enabled: FALLBACK_TO_EXISTING_SVGS,
				token_present: Boolean(TOKEN),
			},
		};
		writeFileSync(dataFile, JSON.stringify(data, null, 2));
		console.log("✅ Generated data.json");

		console.log("\n🎉 All widgets generated successfully!\n");
	} catch (error) {
		console.error("❌ Error generating widgets:", error);
		process.exit(1);
	}
}

main();
