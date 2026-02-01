/**
 * Unified GitHub GraphQL client
 */
import axios from 'axios';
import type { GraphQLResponse, GraphQLError } from '../types/index.js';

const GITHUB_API = 'https://api.github.com/graphql';

/**
 * Custom error class for GitHub API errors
 */
export class GitHubApiError extends Error {
  public readonly type: string;
  public readonly graphqlErrors?: GraphQLError[];

  constructor(message: string, type: string = 'UNKNOWN', graphqlErrors?: GraphQLError[]) {
    super(message);
    this.name = 'GitHubApiError';
    this.type = type;
    this.graphqlErrors = graphqlErrors;
  }

  static isNotFound(error: unknown): boolean {
    return error instanceof GitHubApiError && error.type === 'NOT_FOUND';
  }

  static isRateLimited(error: unknown): boolean {
    return error instanceof GitHubApiError && error.type === 'RATE_LIMITED';
  }
}

/**
 * Make a GraphQL request to the GitHub API
 * 
 * @param query - GraphQL query string
 * @param variables - Query variables
 * @returns Typed response data
 * @throws GitHubApiError if the request fails or returns errors
 */
export async function graphqlRequest<T>(
  query: string,
  variables: Record<string, unknown>
): Promise<T> {
  const token = process.env.GITHUB_TOKEN;
  if (!token) {
    throw new GitHubApiError(
      'GITHUB_TOKEN environment variable is required',
      'AUTH_ERROR'
    );
  }

  try {
    const response = await axios.post<GraphQLResponse<T>>(
      GITHUB_API,
      { query, variables },
      {
        headers: {
          'Authorization': `bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (response.data.errors && response.data.errors.length > 0) {
      const firstError = response.data.errors[0];
      throw new GitHubApiError(
        firstError.message,
        firstError.type || 'GRAPHQL_ERROR',
        response.data.errors
      );
    }

    if (!response.data.data) {
      throw new GitHubApiError(
        'No data returned from GitHub API',
        'EMPTY_RESPONSE'
      );
    }

    return response.data.data;
  } catch (error) {
    // Re-throw GitHubApiError as-is
    if (error instanceof GitHubApiError) {
      throw error;
    }

    // Handle axios errors
    if (axios.isAxiosError(error)) {
      const status = error.response?.status;
      const message = error.response?.data?.message || error.message;

      if (status === 401) {
        throw new GitHubApiError('Invalid GitHub token', 'AUTH_ERROR');
      }
      if (status === 403) {
        throw new GitHubApiError('GitHub API rate limit exceeded', 'RATE_LIMITED');
      }
      throw new GitHubApiError(`GitHub API request failed: ${message}`, 'REQUEST_ERROR');
    }

    // Handle unknown errors
    throw new GitHubApiError(
      `Unexpected error: ${error instanceof Error ? error.message : String(error)}`,
      'UNKNOWN'
    );
  }
}
