#!/usr/bin/env python3
"""
Local GitHub Stats Generator
Generates SVG stats cards for GitHub profile README.

Requirements:
- Python 3.10+
- requests library
- A GitHub Personal Access Token (PAT) with read:user scope

Usage:
    python generate_stats.py --user bkataru --token YOUR_GITHUB_TOKEN
    python generate_stats.py --user bkataru  # Uses GITHUB_TOKEN env var
"""

import argparse
import json
import os
import subprocess
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from collections import defaultdict

try:
    import requests
except ImportError:
    print("Error: 'requests' library not found. Install with: pip install requests")
    sys.exit(1)


GITHUB_GRAPHQL_URL = "https://api.github.com/graphql"
OUTPUT_DIR = Path(__file__).parent.parent  # Output to repo root


def graphql_query(token: str, query: str, variables: dict | None = None) -> dict:
    """Execute a GraphQL query against GitHub's API."""
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    payload = {"query": query}
    if variables:
        payload["variables"] = variables

    response = requests.post(GITHUB_GRAPHQL_URL, json=payload, headers=headers)
    response.raise_for_status()
    data = response.json()

    if "errors" in data:
        raise Exception(f"GraphQL errors: {json.dumps(data['errors'], indent=2)}")

    return data["data"]


def fetch_user_stats(token: str, username: str) -> dict[str, Any]:
    """Fetch comprehensive user statistics from GitHub."""
    query = """
    query($login: String!) {
      user(login: $login) {
        name
        login
        avatarUrl
        createdAt
        followers { totalCount }
        following { totalCount }
        repositories(first: 100, ownerAffiliations: OWNER, isFork: false, privacy: PUBLIC) {
          totalCount
          nodes {
            name
            stargazerCount
            forkCount
            primaryLanguage { name color }
            languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
              edges {
                size
                node { name color }
              }
            }
          }
        }
        contributionsCollection {
          totalCommitContributions
          totalIssueContributions
          totalPullRequestContributions
          totalPullRequestReviewContributions
          totalRepositoryContributions
          restrictedContributionsCount
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
        pullRequests(first: 1, states: MERGED) { totalCount }
        issues(first: 1) { totalCount }
        repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) {
          totalCount
        }
      }
    }
    """
    return graphql_query(token, query, {"login": username})["user"]


def fetch_contribution_years(token: str, username: str) -> list[int]:
    """Fetch all years with contributions."""
    query = """
    query($login: String!) {
      user(login: $login) {
        contributionsCollection {
          contributionYears
        }
      }
    }
    """
    data = graphql_query(token, query, {"login": username})
    return data["user"]["contributionsCollection"]["contributionYears"]


def fetch_year_contributions(token: str, username: str, year: int) -> list[dict]:
    """Fetch contribution data for a specific year."""
    start = f"{year}-01-01T00:00:00Z"
    end = f"{year}-12-31T23:59:59Z"
    
    query = """
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
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
    """
    data = graphql_query(token, query, {"login": username, "from": start, "to": end})
    
    days = []
    for week in data["user"]["contributionsCollection"]["contributionCalendar"]["weeks"]:
        days.extend(week["contributionDays"])
    return days


def fetch_recent_contributions(token: str, username: str, days: int = 31) -> list[dict]:
    """Fetch contribution data for the last N days."""
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    start = start_date.strftime("%Y-%m-%dT00:00:00Z")
    end = end_date.strftime("%Y-%m-%dT23:59:59Z")
    
    query = """
    query($login: String!, $from: DateTime!, $to: DateTime!) {
      user(login: $login) {
        contributionsCollection(from: $from, to: $to) {
          contributionCalendar {
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
    """
    data = graphql_query(token, query, {"login": username, "from": start, "to": end})
    
    contribution_days = []
    for week in data["user"]["contributionsCollection"]["contributionCalendar"]["weeks"]:
        contribution_days.extend(week["contributionDays"])
    
    # Sort by date and return only the last N days
    sorted_days = sorted(contribution_days, key=lambda d: d["date"])
    return sorted_days[-days:]


def calculate_streaks(contribution_days: list[dict]) -> dict[str, Any]:
    """Calculate current streak, longest streak, and total contributions."""
    # Sort by date
    sorted_days = sorted(contribution_days, key=lambda d: d["date"])
    
    total_contributions = sum(d["contributionCount"] for d in sorted_days)
    
    # Build a set of dates with contributions
    contrib_dates = {d["date"] for d in sorted_days if d["contributionCount"] > 0}
    
    if not contrib_dates:
        return {
            "total": 0,
            "current": 0,
            "current_start": None,
            "current_end": None,
            "longest": 0,
            "longest_start": None,
            "longest_end": None,
        }
    
    # Get min/max dates
    all_dates = sorted(contrib_dates)
    min_date = datetime.strptime(all_dates[0], "%Y-%m-%d").date()
    max_date = datetime.strptime(all_dates[-1], "%Y-%m-%d").date()
    today = datetime.now().date()
    
    # Calculate streaks
    current_streak = 0
    current_start = None
    current_end = None
    longest_streak = 0
    longest_start = None
    longest_end = None
    
    streak = 0
    streak_start = None
    
    # Iterate from min_date to today
    check_date = min_date
    while check_date <= today:
        date_str = check_date.strftime("%Y-%m-%d")
        
        if date_str in contrib_dates:
            if streak == 0:
                streak_start = check_date
            streak += 1
        else:
            if streak > 0:
                # Streak ended
                if streak > longest_streak:
                    longest_streak = streak
                    longest_start = streak_start
                    longest_end = check_date - timedelta(days=1)
                streak = 0
                streak_start = None
        
        check_date += timedelta(days=1)
    
    # Handle ongoing streak
    if streak > 0:
        if streak > longest_streak:
            longest_streak = streak
            longest_start = streak_start
            longest_end = today if today.strftime("%Y-%m-%d") in contrib_dates else today - timedelta(days=1)
        
        # Check if current streak is active (contributed today or yesterday)
        yesterday = today - timedelta(days=1)
        if today.strftime("%Y-%m-%d") in contrib_dates or yesterday.strftime("%Y-%m-%d") in contrib_dates:
            current_streak = streak
            current_start = streak_start
            current_end = today if today.strftime("%Y-%m-%d") in contrib_dates else yesterday
    
    return {
        "total": total_contributions,
        "current": current_streak,
        "current_start": current_start.strftime("%Y-%m-%d") if current_start else None,
        "current_end": current_end.strftime("%Y-%m-%d") if current_end else None,
        "longest": longest_streak,
        "longest_start": longest_start.strftime("%Y-%m-%d") if longest_start else None,
        "longest_end": longest_end.strftime("%Y-%m-%d") if longest_end else None,
    }


def calculate_language_stats(repos: list[dict]) -> list[dict]:
    """Calculate language usage statistics from repositories."""
    lang_sizes = defaultdict(lambda: {"size": 0, "color": "#858585"})
    
    for repo in repos:
        for edge in repo.get("languages", {}).get("edges", []):
            name = edge["node"]["name"]
            lang_sizes[name]["size"] += edge["size"]
            if edge["node"].get("color"):
                lang_sizes[name]["color"] = edge["node"]["color"]
    
    total_size = sum(v["size"] for v in lang_sizes.values())
    
    languages = []
    for name, data in sorted(lang_sizes.items(), key=lambda x: -x[1]["size"]):
        pct = (data["size"] / total_size * 100) if total_size > 0 else 0
        languages.append({
            "name": name,
            "percentage": round(pct, 2),
            "color": data["color"],
        })
    
    return languages


def generate_stats_svg(stats: dict, username: str, theme: str = "merko") -> str:
    """Generate the profile stats SVG card."""
    themes = {
        "merko": {
            "bg": "#0a0f0b",
            "border": "#69ff97",
            "title": "#69ff97",
            "text": "#c9d1d9",
            "icon": "#69ff97",
        },
        "dark": {
            "bg": "#151515",
            "border": "#e4e2e2",
            "title": "#fff",
            "text": "#9f9f9f",
            "icon": "#79ff97",
        },
        "default": {
            "bg": "#fffefe",
            "border": "#e4e2e2",
            "title": "#2f80ed",
            "text": "#434d58",
            "icon": "#4c71f2",
        },
    }
    t = themes.get(theme, themes["merko"])
    
    total_stars = sum(r.get("stargazerCount", 0) for r in stats.get("repositories", {}).get("nodes", []))
    total_forks = sum(r.get("forkCount", 0) for r in stats.get("repositories", {}).get("nodes", []))
    
    cc = stats.get("contributionsCollection", {})
    total_commits = cc.get("totalCommitContributions", 0) + cc.get("restrictedContributionsCount", 0)
    total_prs = cc.get("totalPullRequestContributions", 0)
    total_issues = cc.get("totalIssueContributions", 0)
    total_reviews = cc.get("totalPullRequestReviewContributions", 0)
    total_contribs = cc.get("contributionCalendar", {}).get("totalContributions", 0)
    
    repos_contributed = stats.get("repositoriesContributedTo", {}).get("totalCount", 0)
    
    # Calculate rank (simplified)
    score = total_commits * 1 + total_prs * 2 + total_issues * 1 + total_reviews * 1 + total_stars * 1
    if score > 10000:
        rank = "S+"
    elif score > 5000:
        rank = "S"
    elif score > 2500:
        rank = "A+"
    elif score > 1000:
        rank = "A"
    elif score > 500:
        rank = "B+"
    elif score > 100:
        rank = "B"
    else:
        rank = "C"
    
    svg = f'''<svg width="495" height="195" viewBox="0 0 495 195" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .header {{ font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: {t["title"]}; animation: fadeInAnimation 0.8s ease-in-out forwards; }}
    .stat {{ font: 600 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: {t["text"]}; }}
    .stagger {{ opacity: 0; animation: fadeInAnimation 0.3s ease-in-out forwards; }}
    .rank-text {{ font: 800 24px 'Segoe UI', Ubuntu, Sans-Serif; fill: {t["title"]}; }}
    .icon {{ fill: {t["icon"]}; }}
    @keyframes fadeInAnimation {{ from {{ opacity: 0; }} to {{ opacity: 1; }} }}
  </style>
  <rect x="0.5" y="0.5" rx="4.5" width="494" height="194" fill="{t["bg"]}" stroke="{t["border"]}"/>
  <g transform="translate(25, 35)">
    <text class="header" x="0" y="0">{username}'s GitHub Stats</text>
  </g>
  <g transform="translate(25, 55)">
    <g class="stagger" style="animation-delay: 150ms" transform="translate(0, 21)">
      <text class="stat">Total Stars Earned: {total_stars:,}</text>
    </g>
    <g class="stagger" style="animation-delay: 300ms" transform="translate(0, 42)">
      <text class="stat">Total Commits (this year): {total_commits:,}</text>
    </g>
    <g class="stagger" style="animation-delay: 450ms" transform="translate(0, 63)">
      <text class="stat">Total PRs: {total_prs:,}</text>
    </g>
    <g class="stagger" style="animation-delay: 600ms" transform="translate(0, 84)">
      <text class="stat">Total Issues: {total_issues:,}</text>
    </g>
    <g class="stagger" style="animation-delay: 750ms" transform="translate(0, 105)">
      <text class="stat">Contributed to (last year): {repos_contributed}</text>
    </g>
  </g>
  <g transform="translate(400, 100)">
    <circle cx="0" cy="0" r="40" fill="none" stroke="{t["icon"]}" stroke-width="5" opacity="0.2"/>
    <circle cx="0" cy="0" r="40" fill="none" stroke="{t["icon"]}" stroke-width="5" stroke-dasharray="251.2" stroke-dashoffset="50" stroke-linecap="round"/>
    <text class="rank-text" x="0" y="8" text-anchor="middle">{rank}</text>
  </g>
</svg>'''
    return svg


def generate_top_langs_svg(languages: list[dict], theme: str = "merko", layout: str = "donut-vertical") -> str:
    """Generate the top languages SVG card."""
    themes = {
        "merko": {
            "bg": "#0a0f0b",
            "border": "#69ff97",
            "title": "#69ff97",
            "text": "#c9d1d9",
        },
        "dark": {
            "bg": "#151515",
            "border": "#e4e2e2",
            "title": "#fff",
            "text": "#9f9f9f",
        },
        "default": {
            "bg": "#fffefe",
            "border": "#e4e2e2",
            "title": "#2f80ed",
            "text": "#434d58",
        },
    }
    t = themes.get(theme, themes["merko"])
    
    top_langs = languages[:10]  # Top 10 languages
    
    # Generate donut chart data
    total = sum(lang["percentage"] for lang in top_langs)
    
    # SVG donut chart
    cx, cy, r = 100, 100, 70
    stroke_width = 30
    circumference = 2 * 3.14159 * r
    
    donut_segments = []
    offset = 0
    for lang in top_langs:
        pct = lang["percentage"] / total if total > 0 else 0
        length = circumference * pct
        donut_segments.append(f'''<circle cx="{cx}" cy="{cy}" r="{r}" fill="none" 
            stroke="{lang['color']}" stroke-width="{stroke_width}"
            stroke-dasharray="{length} {circumference - length}"
            stroke-dashoffset="{-offset}"
            transform="rotate(-90, {cx}, {cy})"/>''')
        offset += length
    
    # Language legend
    legend_items = []
    for i, lang in enumerate(top_langs):
        y_offset = 30 + i * 25
        legend_items.append(f'''
        <g transform="translate(220, {y_offset})">
            <circle cx="6" cy="6" r="6" fill="{lang['color']}"/>
            <text x="18" y="10" class="lang-name">{lang['name']}</text>
            <text x="200" y="10" class="lang-pct">{lang['percentage']:.1f}%</text>
        </g>''')
    
    height = max(200, 30 + len(top_langs) * 25 + 30)
    
    svg = f'''<svg width="450" height="{height}" viewBox="0 0 450 {height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .header {{ font: 600 18px 'Segoe UI', Ubuntu, Sans-Serif; fill: {t["title"]}; }}
    .lang-name {{ font: 400 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: {t["text"]}; }}
    .lang-pct {{ font: 600 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: {t["text"]}; }}
  </style>
  <rect x="0.5" y="0.5" rx="4.5" width="449" height="{height - 1}" fill="{t["bg"]}" stroke="{t["border"]}"/>
  <text class="header" x="25" y="30">Most Used Languages</text>
  <g transform="translate(5, 30)">
    {"".join(donut_segments)}
  </g>
  {"".join(legend_items)}
</svg>'''
    return svg


def generate_streak_svg(streaks: dict, username: str, theme: str = "tokyonight") -> str:
    """Generate the streak stats SVG card."""
    themes = {
        "tokyonight": {
            "bg": "#1a1b27",
            "border": "#70a5fd",
            "title": "#70a5fd",
            "text": "#38bdae",
            "dates": "#bf91f3",
            "ring": "#70a5fd",
            "fire": "#eb6e17",
        },
        "dark": {
            "bg": "#151515",
            "border": "#e4e2e2",
            "title": "#fff",
            "text": "#9f9f9f",
            "dates": "#9f9f9f",
            "ring": "#fb8c00",
            "fire": "#fb8c00",
        },
        "default": {
            "bg": "#fffefe",
            "border": "#e4e2e2",
            "title": "#2f80ed",
            "text": "#434d58",
            "dates": "#434d58",
            "ring": "#fb8c00",
            "fire": "#fb8c00",
        },
    }
    t = themes.get(theme, themes["tokyonight"])
    
    current = streaks.get("current", 0)
    longest = streaks.get("longest", 0)
    total = streaks.get("total", 0)
    
    def format_date(d):
        if not d:
            return "N/A"
        try:
            dt = datetime.strptime(d, "%Y-%m-%d")
            return dt.strftime("%b %d, %Y")
        except:
            return d
    
    current_range = ""
    if streaks.get("current_start") and streaks.get("current_end"):
        current_range = f'{format_date(streaks["current_start"])} - {format_date(streaks["current_end"])}'
    
    longest_range = ""
    if streaks.get("longest_start") and streaks.get("longest_end"):
        longest_range = f'{format_date(streaks["longest_start"])} - {format_date(streaks["longest_end"])}'
    
    svg = f'''<svg width="495" height="195" viewBox="0 0 495 195" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .header {{ font: 600 14px 'Segoe UI', Ubuntu, Sans-Serif; fill: {t["title"]}; }}
    .stat {{ font: 700 28px 'Segoe UI', Ubuntu, Sans-Serif; fill: {t["text"]}; }}
    .label {{ font: 400 12px 'Segoe UI', Ubuntu, Sans-Serif; fill: {t["title"]}; }}
    .dates {{ font: 400 10px 'Segoe UI', Ubuntu, Sans-Serif; fill: {t["dates"]}; }}
  </style>
  <rect x="0.5" y="0.5" rx="4.5" width="494" height="194" fill="{t["bg"]}" stroke="none"/>
  
  <!-- Total Contributions -->
  <g transform="translate(50, 48)">
    <text class="header" x="40" y="0" text-anchor="middle">Total Contributions</text>
    <text class="stat" x="40" y="40" text-anchor="middle">{total:,}</text>
    <text class="dates" x="40" y="58" text-anchor="middle">All Time</text>
  </g>
  
  <!-- Current Streak -->
  <g transform="translate(205, 48)">
    <text class="header" x="40" y="0" text-anchor="middle">Current Streak</text>
    <!-- Fire icon / ring -->
    <circle cx="40" cy="50" r="35" fill="none" stroke="{t["ring"]}" stroke-width="4"/>
    <text class="stat" x="40" y="58" text-anchor="middle">{current}</text>
    <text class="dates" x="40" y="100" text-anchor="middle">{current_range or "No active streak"}</text>
  </g>
  
  <!-- Longest Streak -->
  <g transform="translate(365, 48)">
    <text class="header" x="40" y="0" text-anchor="middle">Longest Streak</text>
    <text class="stat" x="40" y="40" text-anchor="middle">{longest}</text>
    <text class="dates" x="40" y="58" text-anchor="middle">{longest_range or "N/A"}</text>
  </g>
</svg>'''
    return svg


def generate_activity_graph_svg(
    contribution_days: list[dict],
    username: str,
    bg_color: str = "#000000",
    line_color: str = "#ffffff",
    point_color: str = "#0a91b1",
    text_color: str = "#ffffff",
    area: bool = True,
    hide_border: bool = True,
) -> str:
    """Generate the contribution activity graph SVG."""
    # Sort by date
    sorted_days = sorted(contribution_days, key=lambda d: d["date"])
    
    if not sorted_days:
        return '<svg width="900" height="300"></svg>'
    
    # Graph dimensions
    width = 900
    height = 300
    padding_left = 60
    padding_right = 30
    padding_top = 40
    padding_bottom = 60
    
    graph_width = width - padding_left - padding_right
    graph_height = height - padding_top - padding_bottom
    
    # Get contribution data
    dates = [d["date"] for d in sorted_days]
    counts = [d["contributionCount"] for d in sorted_days]
    max_count = max(counts) if counts else 1
    
    # Calculate points
    num_points = len(counts)
    x_step = graph_width / (num_points - 1) if num_points > 1 else graph_width
    
    points = []
    for i, count in enumerate(counts):
        x = padding_left + i * x_step
        y = padding_top + graph_height - (count / max_count * graph_height) if max_count > 0 else padding_top + graph_height
        points.append((x, y))
    
    # Generate path for line
    if points:
        line_path = f"M {points[0][0]:.1f} {points[0][1]:.1f}"
        for x, y in points[1:]:
            line_path += f" L {x:.1f} {y:.1f}"
        
        # Generate area path (closed)
        area_path = line_path
        area_path += f" L {points[-1][0]:.1f} {padding_top + graph_height}"
        area_path += f" L {points[0][0]:.1f} {padding_top + graph_height} Z"
    else:
        line_path = ""
        area_path = ""
    
    # Generate Y-axis labels
    y_labels = []
    num_y_labels = 5
    for i in range(num_y_labels + 1):
        value = int(max_count * i / num_y_labels)
        y = padding_top + graph_height - (i / num_y_labels * graph_height)
        y_labels.append(f'<text x="{padding_left - 10}" y="{y + 4}" class="axis-label" text-anchor="end">{value}</text>')
        # Grid line
        y_labels.append(f'<line x1="{padding_left}" y1="{y}" x2="{width - padding_right}" y2="{y}" stroke="{text_color}" stroke-opacity="0.1"/>')
    
    # Generate X-axis labels (show ~7 dates)
    x_labels = []
    label_interval = max(1, len(dates) // 7)
    for i in range(0, len(dates), label_interval):
        x = padding_left + i * x_step
        date_obj = datetime.strptime(dates[i], "%Y-%m-%d")
        label = date_obj.strftime("%b %d")
        x_labels.append(f'<text x="{x}" y="{height - 20}" class="axis-label" text-anchor="middle">{label}</text>')
    
    # Generate point markers
    point_markers = []
    for x, y in points:
        point_markers.append(f'<circle cx="{x:.1f}" cy="{y:.1f}" r="3" fill="{point_color}"/>')
    
    border_style = "" if hide_border else f'stroke="{text_color}" stroke-width="1"'
    
    svg = f'''<svg width="{width}" height="{height}" viewBox="0 0 {width} {height}" fill="none" xmlns="http://www.w3.org/2000/svg">
  <style>
    .title {{ font: 600 16px 'Segoe UI', Ubuntu, Sans-Serif; fill: {text_color}; }}
    .axis-label {{ font: 400 11px 'Segoe UI', Ubuntu, Sans-Serif; fill: {text_color}; opacity: 0.7; }}
  </style>
  <rect x="0" y="0" width="{width}" height="{height}" fill="{bg_color}" rx="4.5" {border_style}/>
  
  <!-- Title -->
  <text class="title" x="{width // 2}" y="25" text-anchor="middle">{username}'s Contribution Graph</text>
  
  <!-- Y-axis labels and grid -->
  {"".join(y_labels)}
  
  <!-- X-axis labels -->
  {"".join(x_labels)}
  
  <!-- Area fill -->
  {f'<path d="{area_path}" fill="{line_color}" fill-opacity="0.1"/>' if area and area_path else ''}
  
  <!-- Line -->
  <path d="{line_path}" stroke="{line_color}" stroke-width="2" fill="none"/>
  
  <!-- Points -->
  {"".join(point_markers)}
  
  <!-- Axis lines -->
  <line x1="{padding_left}" y1="{padding_top}" x2="{padding_left}" y2="{padding_top + graph_height}" stroke="{text_color}" stroke-opacity="0.3"/>
  <line x1="{padding_left}" y1="{padding_top + graph_height}" x2="{width - padding_right}" y2="{padding_top + graph_height}" stroke="{text_color}" stroke-opacity="0.3"/>
</svg>'''
    return svg


def get_token_from_gh_cli() -> str | None:
    """Try to get GitHub token from gh CLI."""
    try:
        result = subprocess.run(
            ["gh", "auth", "token"],
            capture_output=True,
            text=True,
            check=True,
        )
        return result.stdout.strip()
    except (subprocess.CalledProcessError, FileNotFoundError):
        return None


def main():
    parser = argparse.ArgumentParser(description="Generate GitHub stats SVGs locally")
    parser.add_argument("--user", "-u", required=True, help="GitHub username")
    parser.add_argument("--token", "-t", help="GitHub Personal Access Token (or set GITHUB_TOKEN env, or use gh CLI)")
    parser.add_argument("--theme", default="merko", help="Theme for stats cards (default: merko)")
    parser.add_argument("--streak-theme", default="tokyonight", help="Theme for streak card (default: tokyonight)")
    parser.add_argument("--output", "-o", default=str(OUTPUT_DIR), help="Output directory")
    parser.add_argument("--graph-days", type=int, default=31, help="Number of days for activity graph (default: 31)")
    args = parser.parse_args()
    
    # Try to get token from multiple sources
    token = args.token or os.environ.get("GITHUB_TOKEN") or os.environ.get("GH_TOKEN")
    if not token:
        print("  - Trying to get token from gh CLI...")
        token = get_token_from_gh_cli()
    
    if not token:
        print("Error: GitHub token required.")
        print("Options:")
        print("  1. Use --token argument")
        print("  2. Set GITHUB_TOKEN environment variable")
        print("  3. Login with gh CLI: gh auth login")
        print("\nCreate a token at: https://github.com/settings/tokens/new")
        print("Required scopes: read:user")
        sys.exit(1)
    
    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)
    
    print(f"Fetching stats for user: {args.user}")
    
    # Fetch user stats
    print("  - Fetching user profile and repo stats...")
    user_stats = fetch_user_stats(token, args.user)
    
    # Fetch contribution years and all contributions
    print("  - Fetching contribution history...")
    years = fetch_contribution_years(token, args.user)
    all_days = []
    for year in years:
        print(f"    - Year {year}...")
        days = fetch_year_contributions(token, args.user, year)
        all_days.extend(days)
    
    # Fetch recent contributions for activity graph
    print(f"  - Fetching recent {args.graph_days}-day contribution data...")
    recent_days = fetch_recent_contributions(token, args.user, args.graph_days)
    
    # Calculate streaks
    print("  - Calculating streaks...")
    streaks = calculate_streaks(all_days)
    
    # Calculate language stats
    print("  - Calculating language stats...")
    languages = calculate_language_stats(user_stats.get("repositories", {}).get("nodes", []))
    
    # Generate SVGs
    print("Generating SVG cards...")
    
    stats_svg = generate_stats_svg(user_stats, args.user, theme=args.theme)
    stats_file = output_dir / "stats.svg"
    stats_file.write_text(stats_svg, encoding="utf-8")
    print(f"  - Saved: {stats_file}")
    
    langs_svg = generate_top_langs_svg(languages, theme=args.theme)
    langs_file = output_dir / "top-langs.svg"
    langs_file.write_text(langs_svg, encoding="utf-8")
    print(f"  - Saved: {langs_file}")
    
    streak_svg = generate_streak_svg(streaks, args.user, theme=args.streak_theme)
    streak_file = output_dir / "streak.svg"
    streak_file.write_text(streak_svg, encoding="utf-8")
    print(f"  - Saved: {streak_file}")
    
    # Generate activity graph
    activity_svg = generate_activity_graph_svg(
        recent_days,
        args.user,
        bg_color="#000000",
        line_color="#ffffff",
        point_color="#0a91b1",
        text_color="#ffffff",
        area=True,
        hide_border=True,
    )
    activity_file = output_dir / "activity-graph.svg"
    activity_file.write_text(activity_svg, encoding="utf-8")
    print(f"  - Saved: {activity_file}")
    
    # Save raw data as JSON for debugging
    data_file = output_dir / "data.json"
    data_file.write_text(json.dumps({
        "user": args.user,
        "generated_at": datetime.now().isoformat(),
        "stats": {
            "followers": user_stats.get("followers", {}).get("totalCount", 0),
            "following": user_stats.get("following", {}).get("totalCount", 0),
            "public_repos": user_stats.get("repositories", {}).get("totalCount", 0),
        },
        "streaks": streaks,
        "languages": languages[:20],
        "recent_contributions": [{"date": d["date"], "count": d["contributionCount"]} for d in recent_days],
    }, indent=2), encoding="utf-8")
    print(f"  - Saved: {data_file}")
    
    print("\nDone! SVG files generated successfully.")
    print(f"\nStreaks summary:")
    print(f"  Total contributions: {streaks['total']:,}")
    print(f"  Current streak: {streaks['current']} days")
    print(f"  Longest streak: {streaks['longest']} days")


if __name__ == "__main__":
    main()
