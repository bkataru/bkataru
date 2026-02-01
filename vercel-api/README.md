# GitHub Profile Widgets

A self-hosted Vercel API that generates dynamic SVG widgets for GitHub profile READMEs.

**Live at:** https://bkataru-widgets.vercel.app

## Features

- GitHub Stats Card (commits, PRs, issues, stars, rank)
- Top Languages Card with normalized percentages
- Contribution Streak Card
- Activity Graph Card
- Dark theme (github_dark) by default
- SVG output for crisp rendering at any size

## Data Sources

The widgets aggregate data from:
- Personal GitHub account (`bkataru`)
- 17 organizations, including:
  - `bkataru-workshop`
  - `bkataru-experiments`
  - `bkataru-recreations`
  - `bkataru-playgrounds`
  - `bkataru-forks`
  - `bkataru-vaults`
  - `tutsandpieces`
  - `planckeon`
  - `rizzlang`
  - `jocasta-ai`
  - `spiderversions`
  - `theroguesgallery`
  - `godsfromthemachine`
  - `micrograds`
  - `thezaptrack`
  - `dirmacs`
  - `BK-Modding`

## Language Statistics Methodology

### The Problem

GitHub's default language statistics are calculated purely by **bytes of source code**, which can be misleading. For example:

- A single repository with auto-generated Mathematica notebook outputs (89MB) would dominate the chart
- Languages used across many small projects get underrepresented
- Large data files or generated code skew the results

### The Solution: Normalized Scoring

This project uses a **hybrid normalization algorithm** that balances code size with repository count:

```
score = sqrt(bytes) × log(repos + 1)
```

### Why This Formula Works

| Component | Purpose | Effect |
|-----------|---------|--------|
| `sqrt(bytes)` | Dampens the impact of extremely large files | A 90MB file becomes ~9,500 instead of 90,000,000 |
| `log(repos + 1)` | Rewards languages used across multiple repositories | 58 repos gives a ~4.1× multiplier |

### Example Impact

| Language | Raw Bytes % | Normalized % | Repos | Change |
|----------|-------------|--------------|-------|--------|
| Mathematica | 58.2% | 14.7% | 3 | -43.5% |
| Python | 14.8% | 23.1% | 75 | +8.3% |
| Rust | 2.6% | 9.1% | 58 | +6.5% |
| TypeScript | 2.2% | 7.0% | 29 | +4.8% |
| JavaScript | 1.8% | 7.1% | 46 | +5.3% |

This approach better reflects actual coding activity by:
- Reducing the impact of outlier repositories with large files
- Boosting languages that are consistently used across many projects
- Providing a more accurate picture of a developer's language preferences

### Mathematical Analysis

For a language with `b` bytes across `r` repositories:

```
score(b, r) = sqrt(b) × log(r + 1)
```

**Properties:**
- **Sub-linear in bytes:** Doubling the bytes only increases score by ~41% (√2 ≈ 1.41)
- **Logarithmic in repos:** Going from 1 to 10 repos adds more weight than 10 to 100
- **Balanced combination:** Both factors contribute meaningfully to the final score

**Edge cases:**
- Single large repo: `sqrt(90,000,000) × log(2) ≈ 9,487 × 0.69 ≈ 6,546`
- Many small repos: `sqrt(1,000,000) × log(59) ≈ 1,000 × 4.08 ≈ 4,080`

This ensures that neither extreme dominates unfairly.

## API Endpoints

### Stats Card
```
GET /api/stats?username=bkataru
```
Displays GitHub statistics including commits, PRs, issues, stars, and percentile rank.

### Top Languages
```
GET /api/top-langs?username=bkataru
```
Shows top programming languages with normalized percentages.

**Query Parameters:**
| Parameter | Default | Description |
|-----------|---------|-------------|
| `username` | `bkataru` | GitHub username |
| `theme` | `github_dark` | Color theme |
| `hide_border` | `false` | Hide card border |
| `layout` | `donut` | Layout style: `normal`, `compact`, `donut`, `donut-vertical`, `pie` |
| `langs_count` | `15` | Number of languages to display (max 20) |
| `hide` | - | Comma-separated languages to hide |
| `exclude_repo` | - | Comma-separated repos to exclude |

### Streak Card
```
GET /api/streak?username=bkataru
```
Shows current streak, longest streak, and total contributions.

### Activity Graph
```
GET /api/activity-graph?username=bkataru
```
Displays contribution activity over time as a graph.

## Project Structure

```
vercel-api/
├── api/                    # Vercel serverless functions
│   ├── stats.ts
│   ├── top-langs.ts
│   ├── streak.ts
│   └── activity-graph.ts
├── src/
│   ├── cards/              # SVG card renderers
│   │   ├── StatsCard.ts
│   │   ├── TopLanguagesCard.ts
│   │   ├── StreakCard.ts
│   │   └── GraphCard.ts
│   ├── fetchers/           # GitHub API data fetchers
│   │   ├── github.ts       # GraphQL client
│   │   ├── stats.ts
│   │   ├── languages.ts    # Includes normalization logic
│   │   ├── streak.ts
│   │   └── contributions.ts
│   ├── themes/index.ts     # Color themes
│   ├── common/             # Shared utilities
│   └── types/index.ts      # TypeScript types
├── tsconfig.json
└── vercel.json
```

## Deployment

### Prerequisites
- Vercel account
- GitHub Personal Access Token with `read:user` scope

### Setup
1. Clone this repository
2. Install Vercel CLI: `npm i -g vercel`
3. Deploy: `vercel --prod`
4. Set environment variable `GITHUB_TOKEN` in Vercel project settings

### Updating
```bash
cd vercel-api
npx vercel --prod --yes
```

### Purging GitHub's Camo Cache

After deploying updates, GitHub may cache the old SVG. To force refresh:

```bash
# Get the camo URL from browser network tab on your GitHub profile
curl -X PURGE "https://camo.githubusercontent.com/[hash]/[encoded-url]"
```

## License

MIT
