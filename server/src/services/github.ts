import axios from 'axios';

export interface RawGitHubRepo {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  size: number; // in KB
  fork: boolean;
  pushed_at: string;
  topics?: string[];
  owner: {
    login: string;
    avatar_url: string;
  };
}

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

// In-memory cache for GitHub API responses to protect rate limits
const cache = new Map<string, CacheEntry<any>>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

export class GitHubService {
  private static getCached<T>(key: string): T | null {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      cache.delete(key);
      return null;
    }
    return entry.data;
  }

  private static setCache<T>(key: string, data: T, ttlMs = CACHE_TTL_MS): void {
    cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs
    });
  }

  /**
   * Fetches the authenticated user's repositories from GitHub API
   * Handles caching, pagination up to 100 repos, and rate limit errors
   */
  public static async fetchUserRepos(accessToken: string): Promise<RawGitHubRepo[]> {
    const cacheKey = `repos_${accessToken.slice(-10)}`;
    const cached = this.getCached<RawGitHubRepo[]>(cacheKey);
    if (cached) {
      console.log('⚡ Serving repos from in-memory cache');
      return cached;
    }

    try {
      const response = await axios.get<RawGitHubRepo[]>('https://api.github.com/user/repos', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'GitWorld-MVP-Backend',
          Accept: 'application/vnd.github.v3+json'
        },
        params: {
          per_page: 100,
          sort: 'pushed',
          direction: 'desc',
          affiliation: 'owner,collaborator'
        }
      });

      const repos = response.data;
      this.setCache(cacheKey, repos);
      return repos;
    } catch (error: any) {
      const status = error?.response?.status;
      const rateLimitRemaining = error?.response?.headers?.['x-ratelimit-remaining'];

      if (status === 403 && rateLimitRemaining === '0') {
        throw new Error('GitHub API rate limit exceeded. Please try again later.');
      }

      console.error('Failed to fetch user repos from GitHub:', error?.response?.data || error.message);
      throw error;
    }
  }
}
