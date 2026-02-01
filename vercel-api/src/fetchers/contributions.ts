/**
 * GitHub contribution calendar fetcher
 * Fetches contribution data for activity graphs and streak cards
 */
import { graphqlRequest, GitHubApiError } from './github.js';
import type {
  ContributionData,
  ContributionDay,
  ContributionCalendarData,
  ContributionCalendarResponse,
} from '../types/index.js';

// GraphQL query for fetching contribution calendar
const CONTRIBUTIONS_QUERY = `
  query($login: String!) {
    user(login: $login) {
      name
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

// GraphQL query with date range for activity graph
const CONTRIBUTIONS_RANGE_QUERY = `
  query($login: String!, $from: DateTime!, $to: DateTime!) {
    user(login: $login) {
      name
      contributionsCollection(from: $from, to: $to) {
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

/**
 * Fetch contribution data for activity graph
 * 
 * Retrieves contribution calendar data for a specified number of days,
 * formatted for use in activity graph visualizations.
 * 
 * @param username - GitHub username to fetch contributions for
 * @param days - Number of days to fetch (default: 31)
 * @returns Contribution data with user name and daily contributions
 * @throws GitHubApiError if the user is not found or API request fails
 */
export async function fetchContributions(
  username: string,
  days: number = 31
): Promise<ContributionData> {
  if (!username) {
    throw new GitHubApiError('Username is required', 'MISSING_PARAM');
  }

  // Calculate date range
  const now = new Date();
  const to = new Date(now);
  to.setDate(to.getDate() + 1); // Include today and potentially tomorrow (timezone handling)
  
  const from = new Date(now);
  from.setDate(from.getDate() - days);

  const data = await graphqlRequest<ContributionCalendarResponse>(
    CONTRIBUTIONS_RANGE_QUERY,
    {
      login: username,
      from: from.toISOString(),
      to: to.toISOString(),
    }
  );

  if (!data.user) {
    throw new GitHubApiError(`User "${username}" not found`, 'NOT_FOUND');
  }

  // Extract contributions from weeks
  const contributions: ContributionDay[] = [];
  const calendar = data.user.contributionsCollection.contributionCalendar;

  for (const week of calendar.weeks) {
    for (const day of week.contributionDays) {
      contributions.push({
        contributionCount: day.contributionCount,
        date: day.date,
      });
    }
  }

  // Trim to requested number of days
  // Remove the last entry if it's today and has 0 contributions (day might not have started)
  if (contributions.length > 0) {
    const lastContribution = contributions[contributions.length - 1];
    if (lastContribution.contributionCount === 0) {
      const today = new Date().toISOString().split('T')[0];
      if (lastContribution.date === today) {
        contributions.pop();
      }
    }
  }

  // Trim excess days from the beginning
  const excess = contributions.length - days;
  if (excess > 0) {
    contributions.splice(0, excess);
  }

  return {
    name: data.user.name || username,
    contributions,
  };
}

/**
 * Fetch contribution calendar data for streak card
 * 
 * Retrieves the full contribution calendar (past year) and returns
 * a simplified format suitable for streak calculations.
 * 
 * @param username - GitHub username to fetch contributions for
 * @returns Contribution counts array and total contributions
 * @throws GitHubApiError if the user is not found or API request fails
 */
export async function fetchContributionCalendar(
  username: string
): Promise<ContributionCalendarData> {
  if (!username) {
    throw new GitHubApiError('Username is required', 'MISSING_PARAM');
  }

  const data = await graphqlRequest<ContributionCalendarResponse>(
    CONTRIBUTIONS_QUERY,
    { login: username }
  );

  if (!data.user) {
    throw new GitHubApiError(`User "${username}" not found`, 'NOT_FOUND');
  }

  const calendar = data.user.contributionsCollection.contributionCalendar;
  const contributions: number[] = [];

  // Flatten weeks into a single array of contribution counts
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
