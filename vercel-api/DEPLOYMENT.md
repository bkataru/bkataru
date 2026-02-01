# Deployment Guide

This document explains how to deploy the `bkataru-widgets` Vercel API.

## Prerequisites

1. A [Vercel account](https://vercel.com/signup)
2. A GitHub Personal Access Token (PAT) with `read:user` scope
3. Node.js 18+ installed locally (for testing)

## Creating a GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens > Tokens (classic)](https://github.com/settings/tokens)
2. Click "Generate new token (classic)"
3. Give it a descriptive name (e.g., "bkataru-widgets")
4. Select the `read:user` scope
5. Click "Generate token"
6. **Copy the token immediately** - you won't be able to see it again

## Deployment Steps

### Option 1: Deploy via Vercel CLI

1. Install Vercel CLI globally:
   ```bash
   npm install -g vercel
   ```

2. Navigate to the vercel-api directory:
   ```bash
   cd vercel-api
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Deploy to Vercel:
   ```bash
   vercel --prod
   ```

5. When prompted:
   - Project name: `bkataru-widgets`
   - Framework: Other
   - Root directory: `.` (current directory, i.e., `vercel-api`)

6. After deployment, set the environment variable:
   ```bash
   vercel env add GITHUB_TOKEN production
   ```
   - Paste your GitHub PAT when prompted

### Option 2: Deploy via Vercel Dashboard

1. Push this repository to GitHub
2. Go to [Vercel Dashboard](https://vercel.com/dashboard)
3. Click "Add New..." → "Project"
4. Import the GitHub repository
5. Configure:
   - **Root Directory:** `vercel-api`
   - **Framework Preset:** Other
6. Add Environment Variable:
   - Name: `GITHUB_TOKEN`
   - Value: Your GitHub PAT
7. Click "Deploy"

## API Endpoints

After deployment, your widgets will be available at:

| Widget | URL |
|--------|-----|
| GitHub Stats | `https://bkataru-widgets.vercel.app/api/stats` |
| Top Languages | `https://bkataru-widgets.vercel.app/api/top-langs` |
| Streak Stats | `https://bkataru-widgets.vercel.app/api/streak` |
| Activity Graph | `https://bkataru-widgets.vercel.app/api/activity-graph` |

## Query Parameters

### `/api/stats`
| Parameter | Default | Description |
|-----------|---------|-------------|
| `username` | `bkataru` | GitHub username |
| `theme` | `github_dark` | Theme name |
| `show_icons` | `true` | Show icons |
| `hide_border` | `false` | Hide card border |
| `hide_rank` | `false` | Hide rank circle |
| `card_width` | `495` | Card width in pixels |
| `show` | `reviews,prs_merged,prs_merged_percentage` | Additional stats to show |

### `/api/top-langs`
| Parameter | Default | Description |
|-----------|---------|-------------|
| `username` | `bkataru` | GitHub username |
| `theme` | `github_dark` | Theme name |
| `layout` | `donut` | Layout: `normal`, `compact`, `donut`, `donut-vertical`, `pie` |
| `langs_count` | `8` | Number of languages to show |
| `hide` | - | Comma-separated languages to hide |
| `hide_border` | `false` | Hide card border |

### `/api/streak`
| Parameter | Default | Description |
|-----------|---------|-------------|
| `username` | `bkataru` | GitHub username |
| `theme` | `github_dark` | Theme name |
| `card_width` | `930` | Card width in pixels |

### `/api/activity-graph`
| Parameter | Default | Description |
|-----------|---------|-------------|
| `username` | `bkataru` | GitHub username |
| `theme` | `github_dark` | Theme name |
| `days` | `31` | Number of days to show (7-365) |
| `area` | `true` | Fill area under the line |
| `width` | `930` | Graph width in pixels |
| `height` | `300` | Graph height in pixels |

## Available Themes

- `github_dark` (default)
- `github_light`
- `dracula`
- `nord`
- `tokyo_night`
- `gruvbox`
- `one_dark`
- `monokai`
- `cobalt`
- `synthwave_84`
- `catppuccin_mocha`
- `radical`

## Caching

Each endpoint has its own cache TTL:

| Endpoint | Cache Duration |
|----------|---------------|
| `/api/stats` | 4 hours |
| `/api/top-langs` | 6 hours |
| `/api/activity-graph` | 2 hours |
| `/api/streak` | 1 hour |

## Local Development

1. Create a `.env` file in `vercel-api/`:
   ```
   GITHUB_TOKEN=ghp_your_token_here
   ```

2. Run the development server:
   ```bash
   npm run dev
   ```

3. Access endpoints at `http://localhost:3000/api/*`

## Cleanup (After Verification)

Once you've verified the Vercel deployment is working:

```bash
# Delete vendored libraries (no longer needed)
rm -rf vendors/

# Delete static SVGs (now served dynamically)
rm stats.svg top-langs.svg streak.svg activity-graph.svg data.json

# Optionally remove the old generate script
rm -rf scripts/
```
