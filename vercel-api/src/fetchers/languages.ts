/**
 * GitHub repository languages fetcher
 * Fetches language breakdown across user's repositories
 */
import { graphqlRequest, GitHubApiError } from './github.js';
import type { LanguageData, Language, LanguageQueryResponse, LanguageResult } from '../types/index.js';

// GraphQL query for fetching repository languages
const LANGUAGES_QUERY = `
  query userLanguages($login: String!) {
    user(login: $login) {
      repositories(ownerAffiliations: OWNER, isFork: false, first: 100) {
        nodes {
          name
          languages(first: 10, orderBy: {field: SIZE, direction: DESC}) {
            edges {
              size
              node {
                name
                color
              }
            }
          }
        }
      }
    }
  }
`;

/**
 * Fetch top programming languages for a user
 * 
 * Aggregates language usage across all of a user's owned repositories,
 * calculating total bytes for each language.
 * 
 * @param username - GitHub username to fetch languages for
 * @param excludeRepos - Optional list of repository names to exclude
 * @returns Language result with language data, total size, and repo count
 * @throws GitHubApiError if the user is not found or API request fails
 */
export async function fetchTopLanguages(
  username: string,
  excludeRepos: string[] = []
): Promise<LanguageResult> {
  if (!username) {
    throw new GitHubApiError('Username is required', 'MISSING_PARAM');
  }

  const data = await graphqlRequest<LanguageQueryResponse>(LANGUAGES_QUERY, {
    login: username,
  });

  if (!data.user) {
    throw new GitHubApiError(`User "${username}" not found`, 'NOT_FOUND');
  }

  // Create exclude set for filtering
  const excludeSet = new Set(excludeRepos);

  // Filter repositories
  let repoNodes = data.user.repositories.nodes.filter(
    (repo) => !excludeSet.has(repo.name)
  );

  // Track total repos with languages
  const totalRepos = repoNodes.filter(repo => repo.languages.edges.length > 0).length;

  // Aggregate language data across all repositories
  const languageMap: Map<string, Language> = new Map();
  let totalSize = 0;

  for (const repo of repoNodes) {
    for (const edge of repo.languages.edges) {
      const langName = edge.node.name;
      totalSize += edge.size;
      const existing = languageMap.get(langName);

      if (existing) {
        // Add to existing language entry
        existing.size += edge.size;
        existing.count += 1;
      } else {
        // Create new language entry
        languageMap.set(langName, {
          name: langName,
          color: edge.node.color || '#858585', // Default color if none provided
          size: edge.size,
          count: 1,
        });
      }
    }
  }

  // Convert map to sorted object (sorted by size, descending)
  const sortedEntries = Array.from(languageMap.entries()).sort(
    ([, a], [, b]) => b.size - a.size
  );

  const languages: LanguageData = {};
  for (const [name, lang] of sortedEntries) {
    languages[name] = lang;
  }

  return {
    languages,
    totalSize,
    totalRepos,
  };
}
