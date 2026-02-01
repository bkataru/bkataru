/**
 * GitHub user statistics fetcher
 * Fetches user stats including stars, commits, PRs, issues, reviews, etc.
 */
import { graphqlRequest, GitHubApiError } from './github.js';
import type { UserStats, Rank, UserQueryResponse } from '../types/index.js';

// GraphQL query for fetching user statistics
const STATS_QUERY = `
  query userStats($login: String!) {
    user(login: $login) {
      name
      login
      followers {
        totalCount
      }
      repositories(first: 100, ownerAffiliations: OWNER, orderBy: {direction: DESC, field: STARGAZERS}) {
        totalCount
        nodes {
          name
          stargazers {
            totalCount
          }
        }
      }
      contributionsCollection {
        totalCommitContributions
        totalPullRequestReviewContributions
      }
      repositoriesContributedTo(first: 1, contributionTypes: [COMMIT, ISSUE, PULL_REQUEST, REPOSITORY]) {
        totalCount
      }
      pullRequests(first: 1) {
        totalCount
      }
      mergedPullRequests: pullRequests(states: MERGED) {
        totalCount
      }
      openIssues: issues(states: OPEN) {
        totalCount
      }
      closedIssues: issues(states: CLOSED) {
        totalCount
      }
      repositoryDiscussions {
        totalCount
      }
      repositoryDiscussionComments(onlyAnswers: true) {
        totalCount
      }
    }
  }
`;

/**
 * Calculate exponential CDF for rank calculation
 */
function exponentialCdf(x: number): number {
  return 1 - Math.pow(2, -x);
}

/**
 * Calculate log-normal CDF approximation for rank calculation
 */
function logNormalCdf(x: number): number {
  return x / (1 + x);
}

/**
 * Calculate user rank based on GitHub statistics
 * 
 * Algorithm ported from github-readme-stats
 * Uses weighted combination of various metrics to determine percentile ranking
 */
export function calculateRank(params: {
  allCommits: boolean;
  commits: number;
  prs: number;
  issues: number;
  reviews: number;
  stars: number;
  followers: number;
}): Rank {
  const { allCommits, commits, prs, issues, reviews, stars, followers } = params;

  // Median values and weights for each metric
  const COMMITS_MEDIAN = allCommits ? 1000 : 250;
  const COMMITS_WEIGHT = 2;
  const PRS_MEDIAN = 50;
  const PRS_WEIGHT = 3;
  const ISSUES_MEDIAN = 25;
  const ISSUES_WEIGHT = 1;
  const REVIEWS_MEDIAN = 2;
  const REVIEWS_WEIGHT = 1;
  const STARS_MEDIAN = 50;
  const STARS_WEIGHT = 4;
  const FOLLOWERS_MEDIAN = 10;
  const FOLLOWERS_WEIGHT = 1;

  const TOTAL_WEIGHT =
    COMMITS_WEIGHT +
    PRS_WEIGHT +
    ISSUES_WEIGHT +
    REVIEWS_WEIGHT +
    STARS_WEIGHT +
    FOLLOWERS_WEIGHT;

  // Rank thresholds and corresponding levels
  const THRESHOLDS = [1, 12.5, 25, 37.5, 50, 62.5, 75, 87.5, 100];
  const LEVELS = ['S', 'A+', 'A', 'A-', 'B+', 'B', 'B-', 'C+', 'C'];

  // Calculate weighted rank score
  const rank =
    1 -
    (COMMITS_WEIGHT * exponentialCdf(commits / COMMITS_MEDIAN) +
      PRS_WEIGHT * exponentialCdf(prs / PRS_MEDIAN) +
      ISSUES_WEIGHT * exponentialCdf(issues / ISSUES_MEDIAN) +
      REVIEWS_WEIGHT * exponentialCdf(reviews / REVIEWS_MEDIAN) +
      STARS_WEIGHT * logNormalCdf(stars / STARS_MEDIAN) +
      FOLLOWERS_WEIGHT * logNormalCdf(followers / FOLLOWERS_MEDIAN)) /
      TOTAL_WEIGHT;

  const percentile = rank * 100;
  const levelIndex = THRESHOLDS.findIndex((t) => percentile <= t);
  const level = LEVELS[levelIndex !== -1 ? levelIndex : LEVELS.length - 1];

  return { level, percentile };
}

/**
 * Fetch GitHub statistics for a user
 * 
 * @param username - GitHub username to fetch stats for
 * @param excludeRepos - Optional list of repository names to exclude from star count
 * @returns User statistics including rank calculation
 * @throws GitHubApiError if the user is not found or API request fails
 */
export async function fetchStats(
  username: string,
  excludeRepos: string[] = []
): Promise<UserStats> {
  if (!username) {
    throw new GitHubApiError('Username is required', 'MISSING_PARAM');
  }

  const data = await graphqlRequest<UserQueryResponse>(STATS_QUERY, {
    login: username,
  });

  if (!data.user) {
    throw new GitHubApiError(`User "${username}" not found`, 'NOT_FOUND');
  }

  const user = data.user;

  // Calculate total stars, excluding specified repos
  const excludeSet = new Set(excludeRepos);
  const totalStars = user.repositories.nodes
    .filter((repo) => !excludeSet.has(repo.name))
    .reduce((sum, repo) => sum + repo.stargazers.totalCount, 0);

  // Calculate stats
  const totalCommits = user.contributionsCollection.totalCommitContributions;
  const totalPRs = user.pullRequests.totalCount;
  const totalPRsMerged = user.mergedPullRequests?.totalCount ?? 0;
  const totalReviews = user.contributionsCollection.totalPullRequestReviewContributions;
  const totalIssues = user.openIssues.totalCount + user.closedIssues.totalCount;
  const followers = user.followers.totalCount;

  // Calculate rank
  const rank = calculateRank({
    allCommits: false,
    commits: totalCommits,
    prs: totalPRs,
    issues: totalIssues,
    reviews: totalReviews,
    stars: totalStars,
    followers,
  });

  return {
    name: user.name || user.login,
    totalPRs,
    totalPRsMerged,
    mergedPRsPercentage: totalPRs > 0 ? (totalPRsMerged / totalPRs) * 100 : 0,
    totalReviews,
    totalCommits,
    totalIssues,
    totalStars,
    totalDiscussionsStarted: user.repositoryDiscussions?.totalCount ?? 0,
    totalDiscussionsAnswered: user.repositoryDiscussionComments?.totalCount ?? 0,
    contributedTo: user.repositoriesContributedTo.totalCount,
    followers,
    rank,
  };
}
