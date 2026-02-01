/**
 * GitHub repository languages fetcher
 * Fetches language breakdown across user's repositories and organization repos
 */
import { graphqlRequest, GitHubApiError } from './github.js';
import type { LanguageData, Language, LanguageQueryResponse, LanguageResult } from '../types/index.js';

// Organizations to include in language statistics
const INCLUDE_ORGS = [
  'bkataru-workshop',
  'bkataru-experiments',
  'bkataru-recreations',
  'bkataru-playgrounds',
  'bkataru-forks',
  'bkataru-vaults',
  'tutsandpieces',
  'planckeon',
  'rizzlang',
  'jocasta-ai',
  'spiderversions',
  'theroguesgallery',
  'godsfromthemachine',
  'micrograds',
  'thezaptrack',
  'dirmacs',
  'BK-Modding',
];

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

// GraphQL query for fetching organization repository languages
const ORG_LANGUAGES_QUERY = `
  query orgLanguages($org: String!) {
    organization(login: $org) {
      repositories(isFork: false, first: 100) {
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
 * Aggregates language usage across all of a user's owned repositories
 * and repositories from configured organizations, calculating total bytes
 * for each language.
 * 
 * @param username - GitHub username to fetch languages for
 * @param excludeRepos - Optional list of repository names to exclude
 * @returns Language result with language data, total size, repo count, and language count
 * @throws GitHubApiError if the user is not found or API request fails
 */
export async function fetchTopLanguages(
  username: string,
  excludeRepos: string[] = []
): Promise<LanguageResult> {
  if (!username) {
    throw new GitHubApiError('Username is required', 'MISSING_PARAM');
  }

  // Fetch user's repositories
  const userData = await graphqlRequest<LanguageQueryResponse>(LANGUAGES_QUERY, {
    login: username,
  });

  if (!userData.user) {
    throw new GitHubApiError(`User "${username}" not found`, 'NOT_FOUND');
  }

  // Create exclude set for filtering
  const excludeSet = new Set(excludeRepos);

  // Collect all repo nodes from user
  let allRepoNodes = userData.user.repositories.nodes.filter(
    (repo) => !excludeSet.has(repo.name)
  );

  // Fetch repositories from each organization (in parallel)
  const orgPromises = INCLUDE_ORGS.map(async (org) => {
    try {
      const orgData = await graphqlRequest<{ organization: { repositories: { nodes: typeof allRepoNodes } } }>(
        ORG_LANGUAGES_QUERY,
        { org }
      );
      if (orgData.organization?.repositories?.nodes) {
        return orgData.organization.repositories.nodes.filter(
          (repo) => !excludeSet.has(repo.name)
        );
      }
    } catch (e) {
      // Silently skip orgs that fail (may not have access)
      console.warn(`Failed to fetch languages for org ${org}:`, e);
    }
    return [];
  });

  const orgResults = await Promise.all(orgPromises);
  for (const orgRepos of orgResults) {
    allRepoNodes = allRepoNodes.concat(orgRepos);
  }

  // Track total repos with languages
  const totalRepos = allRepoNodes.filter(repo => repo.languages.edges.length > 0).length;

  // Aggregate language data across all repositories
  const languageMap: Map<string, Language> = new Map();
  let totalSize = 0;

  for (const repo of allRepoNodes) {
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

  // Total unique languages
  const totalLanguages = languageMap.size;

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
    totalLanguages,
  };
}
