/**
 * Type definitions for GitHub API fetchers
 */

// Rank calculation types
export interface Rank {
  level: string;
  percentile: number;
}

// User statistics types
export interface UserStats {
  name: string;
  totalPRs: number;
  totalPRsMerged: number;
  mergedPRsPercentage: number;
  totalReviews: number;
  totalCommits: number;
  totalIssues: number;
  totalStars: number;
  totalDiscussionsStarted: number;
  totalDiscussionsAnswered: number;
  contributedTo: number;
  followers: number;
  rank: Rank;
}

// Language data types
export interface Language {
  name: string;
  color: string;
  size: number;
  count: number;
}

export type LanguageData = Record<string, Language>;

// Extended language result with stats
export interface LanguageResult {
  languages: LanguageData;
  totalSize: number;
  totalRepos: number;
  totalLanguages: number;
}

// Contribution types
export interface ContributionDay {
  contributionCount: number;
  date: string;
}

export interface ContributionData {
  name: string;
  contributions: ContributionDay[];
}

export interface ContributionCalendarData {
  contributions: number[];
  totalContributions: number;
}

// GraphQL response types
export interface GraphQLError {
  message: string;
  type?: string;
  path?: string[];
  locations?: { line: number; column: number }[];
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

// GitHub user response types
export interface GitHubUser {
  name: string | null;
  login: string;
  followers: {
    totalCount: number;
  };
  repositories: {
    totalCount: number;
    nodes: {
      name: string;
      stargazers: {
        totalCount: number;
      };
    }[];
    pageInfo: {
      hasNextPage: boolean;
      endCursor: string;
    };
  };
  contributionsCollection: {
    totalCommitContributions: number;
    totalPullRequestReviewContributions: number;
    contributionCalendar?: {
      totalContributions: number;
      weeks: {
        contributionDays: {
          contributionCount: number;
          date: string;
        }[];
      }[];
    };
  };
  repositoriesContributedTo: {
    totalCount: number;
  };
  pullRequests: {
    totalCount: number;
  };
  mergedPullRequests?: {
    totalCount: number;
  };
  openIssues: {
    totalCount: number;
  };
  closedIssues: {
    totalCount: number;
  };
  repositoryDiscussions?: {
    totalCount: number;
  };
  repositoryDiscussionComments?: {
    totalCount: number;
  };
}

export interface UserQueryResponse {
  user: GitHubUser | null;
}

// Language query response types
export interface LanguageEdge {
  size: number;
  node: {
    name: string;
    color: string;
  };
}

export interface LanguageRepoNode {
  name: string;
  languages: {
    edges: LanguageEdge[];
  };
}

export interface LanguageQueryResponse {
  user: {
    repositories: {
      nodes: LanguageRepoNode[];
    };
  } | null;
}

// Contribution query response types
export interface ContributionCalendarResponse {
  user: {
    name: string | null;
    contributionsCollection: {
      contributionCalendar: {
        totalContributions: number;
        weeks: {
          contributionDays: {
            contributionCount: number;
            date: string;
          }[];
        }[];
      };
    };
  } | null;
}
