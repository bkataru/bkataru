#!/usr/bin/env bun

/**
 * Widget Generator for GitHub Profile README
 * Uses the vendored TypeScript projects to generate SVG widgets
 */

import { writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import axios from 'axios';

// Resolve paths
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = join(__dirname, '..');

// Environment setup - set PAT_1 for github-readme-stats compatibility
const TOKEN = process.env.TOKEN || process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
if (!TOKEN) {
  console.error('❌ No GitHub token found. Set TOKEN, GH_TOKEN, or GITHUB_TOKEN environment variable.');
  process.exit(1);
}

// Set PAT_1 for github-readme-stats
process.env.PAT_1 = TOKEN;

// Import vendored modules
const statsModule = await import(join(rootDir, 'vendors/github-readme-stats/src/cards/stats.js'));
const topLangsModule = await import(join(rootDir, 'vendors/github-readme-stats/src/cards/top-languages.js'));
const fetchStatsModule = await import(join(rootDir, 'vendors/github-readme-stats/src/fetchers/stats.js'));
const fetchTopLangsModule = await import(join(rootDir, 'vendors/github-readme-stats/src/fetchers/top-languages.js'));

// Activity graph imports
const { Card: GraphCard } = await import(join(rootDir, 'vendors/github-readme-activity-graph/src/GraphCards.ts'));
const { Fetcher } = await import(join(rootDir, 'vendors/github-readme-activity-graph/src/fetcher.ts'));
const { selectColors } = await import(join(rootDir, 'vendors/github-readme-activity-graph/src/styles/themes.ts'));

// Configuration
const USERNAME = process.env.GITHUB_USERNAME || 'bkataru';
const GRAPH_DAYS = parseInt(process.env.GRAPH_DAYS || '31');

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
  title_color: '58a6ff',
  text_color: 'c9d1d9',
  icon_color: '58a6ff',
  bg_color: '0d1117',
  border_color: '30363d',
  ring_color: '58a6ff'
};

/**
 * Generate GitHub Stats Card
 */
async function generateStatsCard(): Promise<string> {
  console.log('📊 Fetching GitHub stats...');
  
  const stats = await fetchStatsModule.fetchStats(
    USERNAME,
    true,  // include_all_commits
    [],    // exclude_repo
    true,  // include_merged_pull_requests
    true,  // include_discussions
    true   // include_discussions_answers
  );

  const svg = statsModule.renderStatsCard(stats, {
    ...themeConfig,
    show_icons: true,
    hide_border: false,
    hide_rank: false,
    include_all_commits: true,
    show: ['reviews', 'prs_merged', 'prs_merged_percentage']
  });

  return svg;
}

/**
 * Generate Top Languages Card
 */
async function generateTopLangsCard(): Promise<string> {
  console.log('💻 Fetching top languages...');
  
  const topLangs = await fetchTopLangsModule.fetchTopLanguages(USERNAME);
  
  const svg = topLangsModule.renderTopLanguages(topLangs, {
    ...themeConfig,
    layout: 'donut',
    langs_count: 8,
    hide_border: false
  });

  return svg;
}

/**
 * Generate Activity Graph
 */
async function generateActivityGraph(): Promise<string> {
  console.log('📈 Fetching activity data...');
  
  const fetcher = new Fetcher(USERNAME);
  const userData = await fetcher.fetchContributions(GRAPH_DAYS);
  
  if (typeof userData === 'string') {
    throw new Error(userData);
  }

  const colors = selectColors('github-dark');
  
  const graphCard = new GraphCard(
    300,    // height
    850,    // width  
    5,      // radius
    colors,
    `${userData.name}'s Contribution Graph`,
    true,   // area
    true    // showGrid
  );

  const svg = await graphCard.buildGraph(userData.contributions);
  return svg;
}

/**
 * Fetch contribution data directly from GitHub API for streak calculation
 */
async function fetchContributionData(): Promise<{contributions: number[], totalContributions: number}> {
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

  const response = await axios({
    url: 'https://api.github.com/graphql',
    method: 'POST',
    headers: {
      Authorization: `bearer ${TOKEN}`,
    },
    data: { query, variables: { login: USERNAME } },
  });

  if (response.data.errors) {
    throw new Error(response.data.errors[0].message);
  }

  const calendar = response.data.data.user.contributionsCollection.contributionCalendar;
  const contributions: number[] = [];
  
  for (const week of calendar.weeks) {
    for (const day of week.contributionDays) {
      contributions.push(day.contributionCount);
    }
  }

  return {
    contributions,
    totalContributions: calendar.totalContributions
  };
}

/**
 * Generate Streak Stats Card
 */
async function generateStreakCard(): Promise<string> {
  console.log('🔥 Generating streak stats...');
  
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

  // Calculate progress percentage for ring
  const progressPercent = longestStreak > 0 ? (currentStreak / longestStreak) * 100 : 0;
  const circumference = 2 * Math.PI * 45;
  const dashOffset = circumference - (progressPercent / 100) * circumference;

  // Generate streak SVG with proper styling
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="495" height="195" viewBox="0 0 495 195">
  <defs>
    <style>
      @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
      }
      @keyframes scaleIn {
        from { transform: scale(0); }
        to { transform: scale(1); }
      }
      @keyframes ringProgress {
        from { stroke-dashoffset: ${circumference}; }
        to { stroke-dashoffset: ${dashOffset}; }
      }
      .animate { animation: fadeIn 0.4s ease-out forwards; opacity: 0; }
      .stat-title { font: 600 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: #${themeConfig.text_color}; }
      .stat-value { font: 800 28px 'Segoe UI', Ubuntu, Sans-Serif; fill: #${themeConfig.title_color}; }
      .stat-label { font: 400 11px 'Segoe UI', Ubuntu, Sans-Serif; fill: #${themeConfig.text_color}; opacity: 0.8; }
      .ring-bg { fill: none; stroke: #${themeConfig.ring_color}; opacity: 0.2; }
      .ring { fill: none; stroke: #${themeConfig.ring_color}; stroke-linecap: round; animation: ringProgress 1s ease-out forwards; }
      .fire-icon { fill: #f97316; }
    </style>
  </defs>
  
  <rect width="494" height="194" rx="4.5" x="0.5" y="0.5" fill="#${themeConfig.bg_color}" stroke="#${themeConfig.border_color}"/>
  
  <!-- Total Contributions -->
  <g transform="translate(35, 35)" class="animate" style="animation-delay: 0.1s">
    <text class="stat-title" y="0">Total Contributions</text>
    <text class="stat-value" y="50">${totalContributions.toLocaleString()}</text>
    <text class="stat-label" y="80">Past Year</text>
  </g>
  
  <!-- Current Streak with Ring -->
  <g transform="translate(247, 95)">
    <text class="stat-title animate" style="animation-delay: 0.2s" text-anchor="middle" x="0" y="-65">Current Streak</text>
    
    <!-- Background Ring -->
    <circle class="ring-bg" cx="0" cy="0" r="45" stroke-width="6"/>
    
    <!-- Progress Ring -->
    <circle class="ring" cx="0" cy="0" r="45" stroke-width="6" 
            stroke-dasharray="${circumference}" stroke-dashoffset="${circumference}"
            transform="rotate(-90)"/>
    
    <!-- Streak Number -->
    <text class="stat-value animate" style="animation-delay: 0.3s" text-anchor="middle" x="0" y="10">${currentStreak}</text>
    <text class="stat-label animate" style="animation-delay: 0.35s" text-anchor="middle" x="0" y="30">days</text>
  </g>
  
  <!-- Longest Streak -->
  <g transform="translate(370, 35)" class="animate" style="animation-delay: 0.4s">
    <text class="stat-title" y="0">Longest Streak</text>
    <text class="stat-value" y="50">${longestStreak}</text>
    <text class="stat-label" y="80">days</text>
  </g>
  
  <!-- Fire Icon -->
  <g transform="translate(235, 158)" class="fire-icon animate" style="animation-delay: 0.5s">
    <path d="M12 2C6.5 8.5 3 14 3 17.5C3 20.538 5.462 23 8.5 23C9.5 23 10.437 22.718 11.25 22.236C10.453 21.48 10 20.45 10 19.5C10 17.875 11.625 15 12 13C12.375 15 14 17.875 14 19.5C14 20.45 13.547 21.48 12.75 22.236C13.563 22.718 14.5 23 15.5 23C18.538 23 21 20.538 21 17.5C21 14 17.5 8.5 12 2Z" transform="scale(1.2)"/>
  </g>
</svg>`;

  return svg;
}

/**
 * Main function to generate all widgets
 */
async function main() {
  console.log(`\n🚀 Generating widgets for ${USERNAME}...\n`);

  try {
    // Generate all widgets in parallel
    const [statsCard, topLangsCard, activityGraph, streakCard] = await Promise.all([
      generateStatsCard(),
      generateTopLangsCard(),
      generateActivityGraph(),
      generateStreakCard()
    ]);

    // Save widgets
    const outputDir = rootDir;
    
    writeFileSync(join(outputDir, 'stats.svg'), statsCard);
    console.log('✅ Generated stats.svg');
    
    writeFileSync(join(outputDir, 'top-langs.svg'), topLangsCard);
    console.log('✅ Generated top-langs.svg');
    
    writeFileSync(join(outputDir, 'activity-graph.svg'), activityGraph);
    console.log('✅ Generated activity-graph.svg');
    
    writeFileSync(join(outputDir, 'streak.svg'), streakCard);
    console.log('✅ Generated streak.svg');

    // Save data.json for reference
    const dataFile = join(outputDir, 'data.json');
    const data = {
      username: USERNAME,
      generated_at: new Date().toISOString(),
      widgets: ['stats.svg', 'top-langs.svg', 'activity-graph.svg', 'streak.svg']
    };
    writeFileSync(dataFile, JSON.stringify(data, null, 2));
    console.log('✅ Generated data.json');

    console.log('\n🎉 All widgets generated successfully!\n');
  } catch (error) {
    console.error('❌ Error generating widgets:', error);
    process.exit(1);
  }
}

main();
